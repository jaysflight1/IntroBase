alter table saved_contacts
  add column if not exists starred boolean not null default false;

create index if not exists saved_contacts_user_starred_idx
  on saved_contacts (user_id, starred, updated_at desc);
