-- 0001_extensions.sql
-- Required Postgres extensions for RentFlow.
-- pg_cron is optional — only needed if you want DB-level scheduling.
-- If pg_cron is not available on your plan, use the Supabase dashboard
-- (Functions → Schedules) to schedule the overdue-alerts edge function.

create extension if not exists pgcrypto;       -- gen_random_uuid()
create extension if not exists "uuid-ossp";    -- uuid_generate_v4() fallback

-- pg_cron + pg_net: uncomment if available on your Supabase plan.
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
