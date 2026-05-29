create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null,
  session_id text,
  event_name text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists message_batches (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null,
  session_id text,
  message_count integer not null,
  source_types text[],
  category_counts jsonb default '{}'::jsonb,
  high_priority_count integer default 0,
  medium_priority_count integer default 0,
  low_priority_count integer default 0,
  analysis_model text,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null,
  session_id text,
  usefulness_rating text,
  would_use_again text,
  willingness_to_pay text,
  expanded_version_interest text,
  biggest_problem text,
  what_worked text,
  what_failed text,
  email text,
  created_at timestamptz default now()
);

create table if not exists email_signups (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null,
  email text not null,
  context text,
  created_at timestamptz default now()
);

create index if not exists events_anonymous_user_id_idx
  on events (anonymous_user_id);

create index if not exists events_event_name_idx
  on events (event_name);

create index if not exists events_created_at_idx
  on events (created_at);

create index if not exists message_batches_anonymous_user_id_idx
  on message_batches (anonymous_user_id);

create index if not exists message_batches_created_at_idx
  on message_batches (created_at);
