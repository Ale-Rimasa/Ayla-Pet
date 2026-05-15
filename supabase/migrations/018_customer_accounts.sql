alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists orders_user_id_idx
  on public.orders (user_id)
  where user_id is not null;

grant select on public.orders to authenticated;

create policy "orders customer select own"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.claim_guest_orders(
  p_user_id uuid,
  p_email text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
begin
  update public.orders
  set user_id = p_user_id
  where user_id is null
    and lower(customer_email) = lower(p_email);

  get diagnostics claimed_count = row_count;
  return claimed_count;
end;
$$;

revoke all on function public.claim_guest_orders(uuid, text) from public;
grant execute on function public.claim_guest_orders(uuid, text) to service_role;
