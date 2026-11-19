-- ============================================================
-- Corrige permissão de leitura da tabela public.profissional.
--
-- A migração 0002 concede a policy profissional_select para
-- "authenticated", mas em seguida executa
-- "revoke all on public.profissional from authenticated",
-- removendo também o SELECT. Com isso a tela de detalhe do
-- profissional no admin falha com 42501 (permission denied).
-- ============================================================

grant select on public.profissional to authenticated;
