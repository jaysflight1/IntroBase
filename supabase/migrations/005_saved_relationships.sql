create table if not exists saved_contacts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  organization text,
  role text,
  source text not null default '',
  tags text[] not null default '{}',
  last_interaction_summary text not null default '',
  priority text not null check (priority in ('high', 'medium', 'low')),
  next_step text not null default '',
  last_interaction_at timestamptz,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

create table if not exists follow_ups (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text,
  contact_id text,
  person text not null,
  follow_up_date date not null,
  reason text not null default '',
  suggested_message text not null default '',
  status text not null default 'upcoming' check (
    status in ('upcoming', 'due_today', 'overdue', 'done')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

alter table saved_contacts enable row level security;
alter table follow_ups enable row level security;

drop policy if exists "Users can read own saved contacts" on saved_contacts;
create policy "Users can read own saved contacts"
  on saved_contacts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own follow ups" on follow_ups;
create policy "Users can read own follow ups"
  on follow_ups
  for select
  using (auth.uid() = user_id);

create index if not exists saved_contacts_user_priority_idx
  on saved_contacts (user_id, priority, updated_at desc);

create index if not exists follow_ups_user_date_idx
  on follow_ups (user_id, follow_up_date);
