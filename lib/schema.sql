-- Supabase SQL Schema for CallbackPro
-- Run this in your Supabase SQL Editor

create table if not exists endpoints (
  id uuid primary key,
  created_at timestamptz default now() not null,
  request_count integer default 0 not null,
  custom_response_status integer default 200 not null,
  custom_response_headers jsonb default '{}'::jsonb not null,
  custom_response_body text default '' not null,
  custom_response_content_type text default 'application/json' not null
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid references endpoints(id) on delete cascade not null,
  method text not null,
  path text not null,
  query_params jsonb default '{}'::jsonb not null,
  headers jsonb default '{}'::jsonb not null,
  body text,
  received_at timestamptz default now() not null,
  is_read boolean default false not null,
  ip text,
  duration_ms integer
);

create index if not exists requests_endpoint_id_idx on requests(endpoint_id);
create index if not exists requests_received_at_idx on requests(received_at desc);

alter table endpoints enable row level security;
alter table requests enable row level security;

create policy "Allow all on endpoints" on endpoints for all using (true) with check (true);
create policy "Allow all on requests" on requests for all using (true) with check (true);

alter publication supabase_realtime add table requests;

-- Migration: add duration_ms to existing installs
alter table requests add column if not exists duration_ms integer;
