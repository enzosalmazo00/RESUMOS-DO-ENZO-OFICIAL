alter table public.cupons
  add column if not exists escopo jsonb not null default '{}'::jsonb;
