create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  connected_account_id uuid references connected_accounts(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'slack')),
  job_type text not null,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'completed', 'failed', 'dead')
  ),
  attempt_count integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table sync_jobs enable row level security;

drop policy if exists "Users can read own sync jobs" on sync_jobs;
create policy "Users can read own sync jobs"
  on sync_jobs
  for select
  using (auth.uid() = user_id);

create index if not exists sync_jobs_due_idx
  on sync_jobs (status, run_after, created_at);

create index if not exists sync_jobs_account_idx
  on sync_jobs (connected_account_id, status, created_at desc);

create index if not exists sync_jobs_user_idx
  on sync_jobs (user_id, created_at desc);
