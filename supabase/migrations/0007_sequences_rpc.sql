-- 0007_sequences_rpc.sql
-- Atomic document number generator.
-- Replaces the frontend nextSeq() which read/incremented a settings counter.
-- This RPC does it atomically in the DB to prevent race conditions.

create or replace function public.next_number(p_kind text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefix text;
  v_seq int;
  v_number text;
begin
  -- Look up the prefix and current sequence for the given kind.
  -- Supported kinds: invoice, receipt, booking, payment, expense, settlement
  execute format('select %I_prefix, %I_seq from settings where id = 1 into v_prefix, v_seq;', p_kind, p_kind);

  if v_prefix is null then
    raise exception 'Unknown sequence kind: %', p_kind;
  end if;

  v_number := v_prefix || lpad(v_seq::text, 4, '0');

  -- Atomically increment the sequence
  execute format('update settings set %I_seq = %I_seq + 1 where id = 1;', p_kind, p_kind);

  return v_number;
end;
$$;

grant execute on function public.next_number(text) to authenticated;
