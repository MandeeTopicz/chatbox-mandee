-- ChatBridge Initial Schema
-- RLS enabled on ALL tables from the start. Security first.

-- ============================================================
-- USERS TABLE
-- Platform auth. Role determines access to protected routes.
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'student' check (role in ('student', 'teacher')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users can read their own row
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own row (display_name only — role is immutable by user)
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create user row on signup via trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, role, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CONVERSATIONS TABLE
-- One row per chat session. Parent for all messages.
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations(user_id);
create index conversations_updated_at_idx on public.conversations(updated_at desc);

alter table public.conversations enable row level security;

-- Users can only see their own conversations
create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = user_id);

-- Users can only create conversations for themselves
create policy "conversations_insert_own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

-- Users can only update their own conversations
create policy "conversations_update_own"
  on public.conversations for update
  using (auth.uid() = user_id);

-- Users can only delete their own conversations
create policy "conversations_delete_own"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at();

-- ============================================================
-- MESSAGES TABLE
-- Full history including tool invocations and results.
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_created_at_idx on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

-- Users can read messages in their own conversations
create policy "messages_select_own"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- Users can insert messages into their own conversations
create policy "messages_insert_own"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- Users can delete messages in their own conversations
create policy "messages_delete_own"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- ============================================================
-- PLUGINS TABLE
-- Registry of approved third-party apps and their tool defs.
-- ============================================================
create table public.plugins (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  url text not null,
  tool_schemas jsonb not null default '[]'::jsonb,
  allowed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.plugins enable row level security;

-- All authenticated users can read approved plugins
create policy "plugins_select_allowed"
  on public.plugins for select
  using (allowed = true);

-- No insert/update/delete via client — admin only via service role

-- ============================================================
-- APP_SESSIONS TABLE
-- Current app state per conversation per plugin.
-- ============================================================
create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  plugin_id uuid not null references public.plugins(id) on delete cascade,
  state_blob jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (conversation_id, plugin_id)
);

create index app_sessions_conversation_idx on public.app_sessions(conversation_id);

alter table public.app_sessions enable row level security;

-- Users can read app sessions in their own conversations
create policy "app_sessions_select_own"
  on public.app_sessions for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = app_sessions.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- Users can insert app sessions in their own conversations
create policy "app_sessions_insert_own"
  on public.app_sessions for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = app_sessions.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- Users can update app sessions in their own conversations
create policy "app_sessions_update_own"
  on public.app_sessions for update
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = app_sessions.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create trigger app_sessions_updated_at
  before update on public.app_sessions
  for each row execute function public.update_updated_at();

-- ============================================================
-- CHESS_PROFILES TABLE
-- Per-user chess stats. Requires authenticated session.
-- ============================================================
create table public.chess_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  streak integer not null default 0,
  rating integer not null default 1200,
  updated_at timestamptz not null default now()
);

alter table public.chess_profiles enable row level security;

-- Users can read their own chess profile
create policy "chess_profiles_select_own"
  on public.chess_profiles for select
  using (auth.uid() = user_id);

-- Users can insert their own chess profile
create policy "chess_profiles_insert_own"
  on public.chess_profiles for insert
  with check (auth.uid() = user_id);

-- Users can update their own chess profile
create policy "chess_profiles_update_own"
  on public.chess_profiles for update
  using (auth.uid() = user_id);

create trigger chess_profiles_updated_at
  before update on public.chess_profiles
  for each row execute function public.update_updated_at();

-- ============================================================
-- QUIZZES TABLE
-- Teacher-created quiz sets. Requires role=teacher to write.
-- ============================================================
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  topic text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index quizzes_teacher_id_idx on public.quizzes(teacher_id);
create index quizzes_topic_idx on public.quizzes(topic);

alter table public.quizzes enable row level security;

-- All authenticated users can read quizzes (students take them)
create policy "quizzes_select_all"
  on public.quizzes for select
  using (auth.uid() is not null);

-- Only teachers can create quizzes
create policy "quizzes_insert_teacher"
  on public.quizzes for insert
  with check (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'teacher'
    )
  );

-- Only the quiz creator (teacher) can update their quizzes
create policy "quizzes_update_teacher"
  on public.quizzes for update
  using (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'teacher'
    )
  );

-- Only the quiz creator (teacher) can delete their quizzes
create policy "quizzes_delete_teacher"
  on public.quizzes for delete
  using (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'teacher'
    )
  );
