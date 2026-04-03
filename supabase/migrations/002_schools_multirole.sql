-- 002: School-scoped multi-role architecture
-- Adds schools table, school_id FK to users and quizzes,
-- expands role to include 'admin', updates RLS policies.

-- ============================================================
-- SCHOOLS TABLE
-- ============================================================
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  created_at timestamptz not null default now()
);

alter table public.schools enable row level security;

-- All authenticated users can read schools
create policy "schools_select_authenticated"
  on public.schools for select
  using (auth.uid() is not null);

-- Admins can insert/update/delete schools
create policy "schools_admin_all"
  on public.schools for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- ============================================================
-- ALTER USERS: add school_id, expand role, add first_login
-- ============================================================

-- Drop the existing role check constraint and add a new one that includes admin
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('student', 'teacher', 'admin'));

-- Add school_id FK
alter table public.users add column school_id uuid references public.schools(id) on delete set null;

-- Add first_login flag for onboarding
alter table public.users add column first_login boolean not null default true;

-- Index for school lookups
create index users_school_id_idx on public.users(school_id);

-- ============================================================
-- ALTER QUIZZES: add school_id
-- ============================================================
alter table public.quizzes add column school_id uuid references public.schools(id) on delete set null;
create index quizzes_school_id_idx on public.quizzes(school_id);

-- ============================================================
-- QUIZ_ATTEMPTS TABLE — track student quiz attempts
-- ============================================================
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score integer not null default 0,
  total integer not null default 0,
  completed_at timestamptz not null default now()
);

create index quiz_attempts_student_idx on public.quiz_attempts(student_id);
create index quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id);

alter table public.quiz_attempts enable row level security;

-- Students can read/insert their own attempts
create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  using (auth.uid() = student_id);

create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  with check (auth.uid() = student_id);

-- Teachers can read attempts from students at their school
create policy "quiz_attempts_select_teacher"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.users teacher
      where teacher.id = auth.uid()
        and teacher.role = 'teacher'
        and teacher.school_id is not null
        and teacher.school_id = (
          select school_id from public.users where id = quiz_attempts.student_id
        )
    )
  );

-- Admins can read all attempts
create policy "quiz_attempts_admin_select"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- ============================================================
-- UPDATE RLS POLICIES
-- ============================================================

-- Helper: security-definer function to get the current user's school_id
-- without triggering RLS recursion on the users table.
create or replace function public.get_my_school_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select school_id from public.users where id = auth.uid();
$$;

-- 1. Teachers can read students from their school
-- Uses auth.jwt() for role check to avoid infinite recursion on users table.
create policy "users_teacher_read_school"
  on public.users for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
    and school_id is not null
    and school_id = public.get_my_school_id()
  );

-- 2. Admins can read all users (jwt check avoids recursion)
create policy "users_admin_select"
  on public.users for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 3. Admins can update all users
create policy "users_admin_update"
  on public.users for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 4. Admins can insert users
create policy "users_admin_insert"
  on public.users for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 5. Students can only see quizzes scoped to their school
drop policy if exists "quizzes_select_all" on public.quizzes;

create policy "quizzes_select_school"
  on public.quizzes for select
  using (
    -- Students: only see quizzes from their school
    (
      exists (
        select 1 from public.users
        where users.id = auth.uid()
          and users.role = 'student'
          and users.school_id is not null
          and users.school_id = quizzes.school_id
      )
    )
    or
    -- Teachers: see their own quizzes + quizzes from their school
    (
      exists (
        select 1 from public.users
        where users.id = auth.uid()
          and users.role = 'teacher'
          and (
            quizzes.teacher_id = auth.uid()
            or (users.school_id is not null and users.school_id = quizzes.school_id)
          )
      )
    )
    or
    -- Admins: see all quizzes
    (
      exists (
        select 1 from public.users
        where users.id = auth.uid()
          and users.role = 'admin'
      )
    )
  );

-- 6. Admin full access on quizzes
create policy "quizzes_admin_all"
  on public.quizzes for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- 7. Admin full access on conversations
create policy "conversations_admin_select"
  on public.conversations for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- 8. Admin full access on messages
create policy "messages_admin_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- 9. Admin full access on chess_profiles
create policy "chess_profiles_admin_select"
  on public.chess_profiles for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- 10. Teachers can read chess profiles of students at their school
create policy "chess_profiles_teacher_read"
  on public.chess_profiles for select
  using (
    exists (
      select 1 from public.users teacher
      where teacher.id = auth.uid()
        and teacher.role = 'teacher'
        and teacher.school_id is not null
        and teacher.school_id = (
          select school_id from public.users where id = chess_profiles.user_id
        )
    )
  );

-- ============================================================
-- UPDATE TRIGGER: handle school_id in new user creation
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, role, display_name, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data ->> 'school_id' is not null
        then (new.raw_user_meta_data ->> 'school_id')::uuid
      else null
    end
  );
  return new;
end;
$$;
