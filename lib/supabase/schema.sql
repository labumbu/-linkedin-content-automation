-- Harvey Content Fabric — Supabase Schema
-- Run this in your Supabase SQL Editor

create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  character_count integer not null,
  trend_title text not null,
  trend_summary text,
  language text not null default 'EN',
  tone text not null,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamp with time zone default now()
);

-- Internal tool — disable RLS
alter table posts disable row level security;
