-- ============================================================
-- 0006 - Expiração automática de solicitações via pg_cron
-- ============================================================
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expirar-agendamentos') then
    perform cron.unschedule('expirar-agendamentos');
  end if;
  perform cron.schedule(
    'expirar-agendamentos',
    '*/5 * * * *',
    'select public.expirar_agendamentos();'
  );
end;
$$;
