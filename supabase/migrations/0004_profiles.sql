-- 0004_profiles.sql
-- Auto-create a profile row when a new auth user signs up.
-- Plus an admin_create_user RPC so the Settings UI can create users
-- without exposing the service-role key to the client.

-- Trigger: after a new auth.users row is inserted, create a matching profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, permissions)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'Rental Staff'),
    coalesce(new.raw_user_meta_data->'permissions', '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: admin_create_user
-- Allows an authenticated Super Admin / Owner to create a new auth user
-- from the client (Settings → Add User). Uses security definer to access
-- the auth admin schema.
create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_name text,
  p_role user_role default 'Rental Staff',
  p_permissions jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public, auth
as $$
declare
  caller_role user_role;
  new_user_id uuid;
begin
  -- Check caller is admin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('Super Admin', 'Owner') then
    raise exception 'Only admins can create users';
  end if;

  -- Create the auth user
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name, 'role', p_role, 'permissions', p_permissions),
    now(), now(), '', '', ''
  ) returning id into new_user_id;

  -- The trigger will auto-create the profile, but we update it with the
  -- exact role/permissions passed in (in case the trigger defaults differ).
  update public.profiles
  set name = p_name, role = p_role, permissions = p_permissions
  where id = new_user_id;

  return jsonb_build_object('id', new_user_id, 'email', p_email);
end;
$$;

-- RPC: admin_update_user_password
-- Allows an admin to reset a user's password.
create or replace function public.admin_update_user_password(
  p_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  caller_role user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('Super Admin', 'Owner') then
    raise exception 'Only admins can reset passwords';
  end if;

  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;
end;
$$;

-- RPC: admin_toggle_user_active
-- Allows an admin to activate/deactivate a user.
create or replace function public.admin_toggle_user_active(
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('Super Admin', 'Owner') then
    raise exception 'Only admins can toggle user status';
  end if;

  update public.profiles set active = p_active where id = p_user_id;
  -- Also ban/unban the auth user
  if p_active then
    update auth.users set banned_until = null where id = p_user_id;
  else
    update auth.users set banned_until = '9999-12-31'::timestamptz where id = p_user_id;
  end if;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.admin_create_user(text, text, text, user_role, jsonb) to authenticated;
grant execute on function public.admin_update_user_password(uuid, text) to authenticated;
grant execute on function public.admin_toggle_user_active(uuid, boolean) to authenticated;
