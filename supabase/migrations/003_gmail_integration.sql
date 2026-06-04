create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'slack')),
  provider_account_id text not null,
  provider_account_email text,
  display_name text,
  workspace_name text,
  workspace_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (
    status in ('connected', 'reauth_required', 'sync_error', 'disconnected')
  ),
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, provider, provider_account_id)
);

create table if not exists source_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid not null references connected_accounts(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'slack', 'manual')),
  external_message_id text not null,
  external_thread_id text,
  source_url text,
  sender_name text not null,
  sender_email text,
  sender_handle text,
  sender_organization text,
  source_label text not null,
  source_context jsonb not null default '{}'::jsonb,
  subject text,
  body_text text not null,
  received_at timestamptz not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  analysis_status text not null default 'pending' check (
    analysis_status in ('pending', 'processing', 'analyzed', 'ignored', 'failed')
  ),
  analysis_error text,
  created_at timestamptz default now(),
  unique (connected_account_id, external_message_id)
);

create table if not exists analyzed_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_message_id uuid not null references source_messages(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'slack', 'manual')),
  source_context jsonb not null default '{}'::jsonb,
  sender_name text not null,
  sender_organization text,
  sender_role text,
  source text not null default '',
  original_text text not null,
  summary text not null,
  category text not null,
  priority text not null,
  urgency text not null,
  priority_score integer not null,
  deadline text,
  suggested_action text not null,
  suggested_reply text not null,
  why_it_matters text not null,
  follow_up_date text,
  contact_tags text[] not null default '{}',
  status text not null default 'new',
  received_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, source_message_id)
);

create table if not exists sync_cursors (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references connected_accounts(id) on delete cascade,
  provider text not null,
  cursor_type text not null,
  cursor_value text not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (connected_account_id, cursor_type)
);

alter table connected_accounts enable row level security;
alter table source_messages enable row level security;
alter table analyzed_messages enable row level security;
alter table sync_cursors enable row level security;

drop policy if exists "Users can read own connected accounts" on connected_accounts;
create policy "Users can read own connected accounts"
  on connected_accounts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own source messages" on source_messages;
create policy "Users can read own source messages"
  on source_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own analyzed messages" on analyzed_messages;
create policy "Users can read own analyzed messages"
  on analyzed_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own sync cursors" on sync_cursors;
create policy "Users can read own sync cursors"
  on sync_cursors
  for select
  using (
    exists (
      select 1
      from connected_accounts
      where connected_accounts.id = sync_cursors.connected_account_id
        and connected_accounts.user_id = auth.uid()
    )
  );

create index if not exists connected_accounts_user_provider_idx
  on connected_accounts (user_id, provider, status);

create index if not exists source_messages_user_status_idx
  on source_messages (user_id, analysis_status, received_at desc);

create index if not exists analyzed_messages_user_received_idx
  on analyzed_messages (user_id, received_at desc);
