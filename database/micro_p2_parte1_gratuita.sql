begin;
CREATE OR REPLACE FUNCTION public.can_access_aulao(p_aulao_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.auloes a
    where a.id = p_aulao_id
      and (
        public.is_admin()
        or a.owner_user_id = auth.uid()
        or (auth.uid() is not null and a.publicado = true and a.origem = 'enzo' and a.chave = 'aulao-aulao-micro-2-parte-1-protozoarios' and a.preco = 0)
        or (
          a.publicado = true
          and exists (
            select 1
            from public.acessos ac
            where ac.user_id = auth.uid()
              and ac.resumo = a.chave
              and (ac.expira_em is null or ac.expira_em > now())
          )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_aulao_for_viewer(p_key text)
 RETURNS TABLE(id uuid, chave text, nome text, materia text, avaliacao text, semestre smallint, descricao text, preco numeric, dias_acesso integer, capa_url text, publicado boolean, exibir_loja boolean, destaque boolean, usar_turmas boolean, professor_id uuid, origem text, idioma_conteudo text, viewer_authorized boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    a.id,a.chave,a.nome,a.materia,a.avaliacao,a.semestre,a.descricao,a.preco,
    a.dias_acesso,a.capa_url,a.publicado,a.exibir_loja,a.destaque,a.usar_turmas,
    a.professor_id,a.origem,a.idioma_conteudo,
    (
      public.is_admin()
      or a.owner_user_id = auth.uid()
      or (auth.uid() is not null and a.publicado = true and a.origem = 'enzo' and a.chave = 'aulao-aulao-micro-2-parte-1-protozoarios' and a.preco = 0)
      or exists (
        select 1
        from public.acessos ac
        where ac.user_id = auth.uid()
          and ac.resumo = a.chave
          and (ac.expira_em is null or ac.expira_em > now())
      )
    ) as viewer_authorized
  from public.auloes a
  where a.chave = p_key
    and (
      a.publicado = true
      or public.is_admin()
      or a.owner_user_id = auth.uid()
    )
  limit 1;
$function$;

update public.auloes set preco=0, destaque=true, updated_at=now() where id='4893dc52-3f65-4289-a824-2f8c58d8c8e3' and chave='aulao-aulao-micro-2-parte-1-protozoarios' and origem='enzo';
commit;

