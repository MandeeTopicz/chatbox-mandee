-- 004: Add provider column to google_tokens to support multiple OAuth providers
-- Rename table to oauth_tokens for clarity

-- Add provider column (default 'google' for existing rows)
alter table public.google_tokens add column if not exists provider text not null default 'google';

-- Drop the primary key constraint so we can have multiple providers per user
alter table public.google_tokens drop constraint if exists google_tokens_pkey;

-- Add composite primary key: user_id + provider
alter table public.google_tokens add primary key (user_id, provider);

-- Create index for provider lookups
create index if not exists oauth_tokens_provider_idx on public.google_tokens(provider);
