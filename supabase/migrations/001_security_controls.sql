-- =============================================================================
--  MIGRACIÓN DE CONTROLES DE SEGURIDAD — Sophia XAI
--  Ejecutar en: Supabase Dashboard -> SQL Editor  (o psql con la DATABASE_URL)
--
--  RNF-12 · Seguridad a nivel de datos (PostgreSQL Row Level Security)
--  RF-16  · Registro y auditoría de accesos (ISO/IEC 27002, control 8.15)
--  RF-14  · Trazabilidad inmutable de operaciones críticas (ISO/IEC 27002 8.15)
--  Ley N° 29733 / D.S. N° 003-2013-JUS · Consentimiento informado (Art. 9° y 12°)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. FUNCIONES AUXILIARES DE ALCANCE
--    Permiten que cada política RLS compare la fila con el JWT del usuario.
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'raw_user_meta_data' ->> 'role',
    auth.jwt() ->> 'role',
    'representante'
  )
$$;

create or replace function public.current_user_zone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select upper(
    coalesce(
      auth.jwt() -> 'user_metadata' ->> 'zona_comercial',
      auth.jwt() -> 'user_metadata' ->> 'zone',
      auth.jwt() -> 'app_metadata' ->> 'zona_comercial',
      ''
    )
  )
$$;

comment on function public.current_user_role() IS
  'RF-11 / RNF-12: devuelve el rol comercial del usuario autenticado (admin | representante).';
comment on function public.current_user_zone() IS
  'RNF-12: devuelve la zona comercial asignada al usuario autenticado en el JWT de Supabase.';

-- -----------------------------------------------------------------------------
-- 1. LOG DE AUDITORÍA DE SEGURIDAD (RF-16)
-- -----------------------------------------------------------------------------
create table if not exists public.security_audit_log (
  id            bigserial primary key,
  event_time    timestamptz not null default now(),
  event_type    text not null,
  severity      text not null default 'info',
  user_id       uuid,
  user_email    text,
  user_role     text,
  ip_address    text,
  user_agent    text,
  http_method   text,
  resource      text,
  status_code   integer,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

comment on table public.security_audit_log IS
  'RF-16: intentos de acceso, fallos de autenticación, cambios de privilegios, cierre automático de sesión y eventos de consentimiento. ISO/IEC 27002 control 8.15.';

create index if not exists idx_audit_event_time on public.security_audit_log (event_time desc);
create index if not exists idx_audit_event_type on public.security_audit_log (event_type, event_time desc);
create index if not exists idx_audit_user on public.security_audit_log (user_id, event_time desc);
create index if not exists idx_audit_ip on public.security_audit_log (ip_address);

-- -----------------------------------------------------------------------------
-- 2. TRAZABILIDAD DE SIMULACIONES (RF-14) — registro INMUTABLE
-- -----------------------------------------------------------------------------
create table if not exists public.simulation_trace_log (
  id                   bigserial primary key,
  executed_at          timestamptz not null default now(),
  user_id              uuid,
  user_email           text,
  user_role            text,
  client_id            integer,
  client_name          text,
  client_zone          text,
  recommended_product  text,
  commercial_argument  text,
  source               text,
  ip_address           text,
  payload              jsonb not null default '{}'::jsonb
);

comment on table public.simulation_trace_log IS
  'RF-14: cada simulación ejecutada registra usuario, cliente, producto recomendado y argumento comercial generado (XAI). ISO/IEC 27002 control 8.15.';

create index if not exists idx_sim_executed_at on public.simulation_trace_log (executed_at desc);
create index if not exists idx_sim_client on public.simulation_trace_log (client_id);
create index if not exists idx_sim_user on public.simulation_trace_log (user_id);

-- -----------------------------------------------------------------------------
-- 3. CONSENTIMIENTO INFORMADO (Ley N° 29733, Art. 9° y 12°)
-- -----------------------------------------------------------------------------
create table if not exists public.user_consents (
  id              bigserial primary key,
  user_id         uuid not null,
  user_email      text,
  user_role       text,
  policy_version  text not null,
  purposes        jsonb not null default '[]'::jsonb,
  granted         boolean not null,
  consent_text    text,
  ip_address      text,
  user_agent      text,
  granted_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.user_consents IS
  'Consentimiento informado y constancia de aviso de privacidad por usuario y versión de política (Ley N° 29733 y Reglamento D.S. 003-2013-JUS).';

create unique index if not exists uq_user_consents
  on public.user_consents (user_id, policy_version, granted_at desc);

create index if not exists idx_consents_user on public.user_consents (user_id, granted_at desc);

-- -----------------------------------------------------------------------------
-- 4. INMUTABILIDAD DE LOS REGISTROS DE AUDITORÍA
--    Un trigger bloquea cualquier UPDATE/DELETE, incluso desde el rol
--    administrador de la base de datos: los registros solo se agregan.
-- -----------------------------------------------------------------------------
create or replace function public.fn_block_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'REGISTRO INMUTABLE: % no está permitido sobre %. Los registros de auditoría y trazabilidad solo admiten inserciones (ISO/IEC 27002, control 8.15).',
    tg_op, tg_table_name
    using hint = 'Genera un nuevo evento compensatorio; nunca edites ni borres la evidencia.';
end;
$$;

drop trigger if exists trg_security_audit_immutable on public.security_audit_log;
create trigger trg_security_audit_immutable
  before update or delete on public.security_audit_log
  for each row execute function public.fn_block_audit_mutation();

drop trigger if exists trg_simulation_trace_immutable on public.simulation_trace_log;
create trigger trg_simulation_trace_immutable
  before update or delete on public.simulation_trace_log
  for each row execute function public.fn_block_audit_mutation();

-- -----------------------------------------------------------------------------
-- 5. SEGURIDAD A NIVEL DE FILA (RNF-12) SOBRE LOS HISTORIALES COMERCIALES
--    Cada usuario solo consulta los historiales de su zona comercial asignada.
--    El Administrador mantiene visión global; service_role conserva el acceso
--    operativo del backend.
-- -----------------------------------------------------------------------------
alter table public.ventas_detalle enable row level security;
alter table public.ventas_base    enable row level security;
alter table public.cliente_secuencias enable row level security;

drop policy if exists p_ventas_detalle_zona on public.ventas_detalle;
create policy p_ventas_detalle_zona on public.ventas_detalle
  for select
  to authenticated
  using (
    public.current_user_role() = 'admin'
    or public.current_user_zone() = upper(coalesce(zona, ''))
  );

drop policy if exists p_ventas_base_zona on public.ventas_base;
create policy p_ventas_base_zona on public.ventas_base
  for select
  to authenticated
  using (
    public.current_user_role() = 'admin'
    or public.current_user_zone() = upper(coalesce(zona, ''))
  );

drop policy if exists p_cliente_secuencias_zona on public.cliente_secuencias;
create policy p_cliente_secuencias_zona on public.cliente_secuencias
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

comment on policy p_ventas_detalle_zona on public.ventas_detalle IS
  'RNF-12: el representante solo ve filas de su zona comercial; el administrador ve todas.';

-- -----------------------------------------------------------------------------
-- 6. RLS SOBRE LAS TABLAS DE AUDITORÍA Y CONSENTIMIENTO
--    Lectura: exclusiva del Administrador.
--    Escritura: exclusiva del backend (service_role) mediante su service key.
-- -----------------------------------------------------------------------------
alter table public.security_audit_log  enable row level security;
alter table public.simulation_trace_log enable row level security;
alter table public.user_consents        enable row level security;

-- Auditoría: nadie actualiza ni borra (refuerzo del trigger del punto 4).
revoke update, delete, truncate on public.security_audit_log  from anon, authenticated, service_role;
revoke update, delete, truncate on public.simulation_trace_log from anon, authenticated, service_role;

drop policy if exists p_audit_admin_select on public.security_audit_log;
create policy p_audit_admin_select on public.security_audit_log
  for select to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists p_sim_admin_select on public.simulation_trace_log;
create policy p_sim_admin_select on public.simulation_trace_log
  for select to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists p_sim_service_insert on public.simulation_trace_log;
create policy p_sim_service_insert on public.simulation_trace_log
  for insert to service_role
  with check (true);

drop policy if exists p_audit_service_insert on public.security_audit_log;
create policy p_audit_service_insert on public.security_audit_log
  for insert to service_role
  with check (true);

-- Consentimientos: cada usuario lee y escribe únicamente los propios.
drop policy if exists p_consents_own on public.user_consents;
create policy p_consents_own on public.user_consents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists p_consents_admin_select on public.user_consents;
create policy p_consents_admin_select on public.user_consents
  for select to authenticated
  using (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 7. RETENCIÓN DE BITÁCORA (ISO/IEC 27002, control 5.33 — conservación)
--    Se conservan 24 meses de auditoría. La limpieza se ejecuta con un rol
--    privilegiado explícito (bypass del trigger) mediante un job programado.
-- -----------------------------------------------------------------------------
-- Ejemplo de job mensual (Supabase: pg_cron, requiere extensión habilitada):
-- select cron.schedule(
--   'sophia_audit_retention',
--   '0 3 1 * *',
--   $$delete from public.security_audit_log where event_time < now() - interval '24 months'$$
-- );

-- =============================================================================
--  VERIFICACIÓN RÁPIDA
-- =============================================================================
-- select count(*) from public.security_audit_log;
-- select count(*) from public.simulation_trace_log;
-- select count(*) from public.user_consents;
-- update public.security_audit_log set severity = 'info' where id = 1;  -- debe fallar
