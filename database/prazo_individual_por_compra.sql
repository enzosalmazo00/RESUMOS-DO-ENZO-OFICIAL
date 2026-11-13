create or replace function public.registrar_acesso_compra(
  p_user_id uuid, p_resumo text, p_expira_em timestamptz, p_order_id uuid
) returns void
language sql
set search_path = ''
as $$
  insert into public.acessos as atual (user_id, resumo, expira_em, order_id, source)
  values (p_user_id, p_resumo, p_expira_em, p_order_id, 'purchase')
  on conflict (user_id, resumo) do update
  set expira_em = excluded.expira_em,
      order_id = excluded.order_id,
      source = excluded.source
  where atual.expira_em is not null
    and (excluded.expira_em is null or excluded.expira_em > atual.expira_em)
    and atual.order_id is distinct from excluded.order_id;
$$;

revoke execute on function public.registrar_acesso_compra(uuid, text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.registrar_acesso_compra(uuid, text, timestamptz, uuid)
  to service_role;
