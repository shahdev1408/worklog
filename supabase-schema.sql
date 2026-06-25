-- Run this in your Supabase SQL Editor
-- https://app.supabase.com → SQL Editor → New query

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table sub_projects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table work_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  company_id uuid references companies(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  sub_project_id uuid references sub_projects(id) on delete set null,
  description text not null,
  manager text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (optional for personal use — disable for simplicity)
-- If you're using this solo, just set your Supabase project to allow anon reads/writes
-- OR disable RLS:
alter table companies disable row level security;
alter table projects disable row level security;
alter table sub_projects disable row level security;
alter table work_logs disable row level security;

-- Seed some sample data (optional)
insert into companies (name) values ('Acme Corp'), ('Beta Ltd');
