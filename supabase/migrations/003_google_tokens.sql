-- 003: Google Classroom integration — encrypted token storage

create table public.google_tokens (
  user_id uuid primary key references public.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

-- Users can only read their own tokens
create policy "google_tokens_select_own"
  on public.google_tokens for select
  using (auth.uid() = user_id);

-- Users can insert their own tokens
create policy "google_tokens_insert_own"
  on public.google_tokens for insert
  with check (auth.uid() = user_id);

-- Users can update their own tokens
create policy "google_tokens_update_own"
  on public.google_tokens for update
  using (auth.uid() = user_id);

-- Users can delete their own tokens (disconnect)
create policy "google_tokens_delete_own"
  on public.google_tokens for delete
  using (auth.uid() = user_id);
