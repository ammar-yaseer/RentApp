-- 0006_audit_triggers.sql
-- Generic audit trigger applied to all business tables.
-- Captures INSERT/UPDATE/DELETE and writes to audit_logs.
-- Uses security definer to bypass RLS on audit_logs (client INSERT is blocked).

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_email text;
  v_action text;
  v_entity text;
  v_entity_id text;
  v_before jsonb;
  v_after jsonb;
begin
  -- Get the acting user's email
  select email into v_user_email from public.profiles where id = auth.uid();
  if v_user_email is null then
    v_user_email := 'system';
  end if;

  v_entity := TG_TABLE_NAME;

  if TG_OP = 'INSERT' then
    v_action := 'CREATE';
    v_entity_id := (to_jsonb(NEW) ->> 'id');
    v_after := to_jsonb(NEW);
    v_before := null;
  elsif TG_OP = 'UPDATE' then
    v_action := 'UPDATE';
    v_entity_id := (to_jsonb(NEW) ->> 'id');
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  elsif TG_OP = 'DELETE' then
    v_action := 'DELETE';
    v_entity_id := (to_jsonb(OLD) ->> 'id');
    v_before := to_jsonb(OLD);
    v_after := null;
  end if;

  insert into public.audit_logs (user_email, action, entity, entity_id, before, after)
  values (v_user_email, v_action, v_entity, v_entity_id, v_before, v_after);

  return coalesce(NEW, OLD);
end;
$$;

-- Apply audit trigger to all business tables
do $$
declare t text;
begin
  for t in select unnest(array[
    'branches','vehicles','vehicle_documents','customers','drivers',
    'bookings','inspections','payments','deposits','documents','expenses',
    'vendors','lease_contracts','lease_payments','insurances','insurance_claims',
    'maintenances','investors','investor_transactions','profit_allocations',
    'reserve_accounts','reserve_transactions','settlements',
    'bank_accounts','bank_transactions','notifications','notification_templates'
  ]) loop
    execute format('drop trigger if exists audit_%s on %s;', t, t);
    execute format('create trigger audit_%s after insert or update or delete on %s for each row execute function public.audit_trigger();', t, t);
  end loop;
end $$;

-- updated_at trigger: auto-set updated_at on UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array['vehicles','customers','investors','bookings']) loop
    execute format('drop trigger if exists set_updated_at_%s on %s;', t, t);
    execute format('create trigger set_updated_at_%s before update on %s for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;
