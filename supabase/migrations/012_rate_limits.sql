create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

alter table public.rate_limit_events enable row level security;

create index on public.rate_limit_events (key, created_at);
