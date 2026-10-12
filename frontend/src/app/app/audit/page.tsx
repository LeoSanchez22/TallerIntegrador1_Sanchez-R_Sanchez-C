'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWithAuth } from '../../../lib/apiClient'
import { supabase } from '../../../lib/supabase'
import {
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Activity,
  KeyRound,
  UserCog,
  LogIn,
  TimerOff,
  FileSignature,
  FlaskConical,
  History,
  Database,
} from 'lucide-react'

/**
 * =============================================================================
 *  PANEL DE AUDITORÍA (solo Administrador)
 * =============================================================================
 *  RF-16 · Registro y auditoría de accesos         → pestaña "Seguridad"
 *  RF-14 · Trazabilidad de operaciones críticas    → pestaña "Simulaciones"
 *  Ley N° 29733 · Consentimientos informados       → pestaña "Consentimientos"
 *
 *  Cada fila conserva la dirección IP, la marca de tiempo, el usuario y el
 *  detalle del evento. Las tablas son inmutables (triggers en PostgreSQL:
 *  supabase/migrations/001_security_controls.sql).
 * =============================================================================
 */

type TabKey = 'security' | 'simulations' | 'consents'

interface SecurityRow {
  id?: number | string
  event_time: string
  event_type: string
  severity: string
  user_email?: string | null
  user_role?: string | null
  ip_address?: string | null
  http_method?: string | null
  resource?: string | null
  status_code?: number | null
  details?: any
}

interface SimulationRow {
  id?: number | string
  executed_at: string
  user_email?: string | null
  user_role?: string | null
  client_id?: number | null
  client_name?: string | null
  client_zone?: string | null
  recommended_product?: string | null
  commercial_argument?: string | null
  source?: string | null
  ip_address?: string | null
}

interface ConsentRow {
  user_id: string
  user_email?: string | null
  user_role?: string | null
  policy_version?: string | null
  purposes?: string[] | null
  granted?: boolean | null
  ip_address?: string | null
  granted_at?: string | null
  revoked_at?: string | null
}

const EVENT_LABELS: Record<string, string> = {
  login_success: 'Inicio de sesión',
  login_failed: 'Inicio de sesión fallido',
  logout: 'Cierre de sesión',
  session_idle_timeout: 'Cierre por inactividad',
  session_revoked: 'Sesión revocada',
  unauthorized_access: 'Acceso no autorizado',
  invalid_token: 'Token inválido',
  account_disabled: 'Cuenta inhabilitada',
  privilege_change: 'Cambio de privilegios',
  user_created: 'Alta de usuario',
  product_created: 'Alta de producto',
  rate_limit_exceeded: 'Límite de tasa excedido',
  scope_zone_unassigned: 'Zona comercial sin asignar',
  consent_granted: 'Consentimiento otorgado',
  consent_revoked: 'Consentimiento revocado',
  password_recovery_requested: 'Recuperación de clave',
  model_updated: 'Modelo actualizado',
}

const EVENT_ICONS: Record<string, any> = {
  login_success: LogIn,
  login_failed: ShieldAlert,
  logout: KeyRound,
  session_idle_timeout: TimerOff,
  session_revoked: TimerOff,
  unauthorized_access: ShieldAlert,
  invalid_token: ShieldAlert,
  account_disabled: ShieldAlert,
  privilege_change: UserCog,
  user_created: UserCog,
  product_created: FlaskConical,
  rate_limit_exceeded: Activity,
  scope_zone_unassigned: ShieldAlert,
  consent_granted: FileSignature,
  consent_revoked: FileSignature,
  password_recovery_requested: KeyRound,
  model_updated: FlaskConical,
}

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
}

function formatTimestamp(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AuditPage() {
  const [checkingRole, setCheckingRole] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [tab, setTab] = useState<TabKey>('security')
  const [eventFilter, setEventFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('postgres')
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)

  const [securityRows, setSecurityRows] = useState<SecurityRow[]>([])
  const [simulationRows, setSimulationRows] = useState<SimulationRow[]>([])
  const [consentRows, setConsentRows] = useState<ConsentRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})

  // RF-11 · La vista está reservada al Administrador (el backend también la bloquea).
  useEffect(() => {
    let mounted = true
    const checkRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        const role = session?.user?.user_metadata?.role
        setIsAdmin(role === 'admin')
        if (role === 'admin') await loadAll()
      } catch (err) {
        console.error('[AUDIT] No se pudo verificar el rol:', err)
      } finally {
        if (mounted) setCheckingRole(false)
      }
    }
    void checkRole()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAll = useCallback(async (filter?: string) => {
    setLoading(true)
    setError(null)
    try {
      const query = typeof filter === 'string' ? filter : eventFilter
      const [statsRes, securityRes, simRes, consentRes] = await Promise.all([
        fetchWithAuth('/api/audit/stats'),
        fetchWithAuth(`/api/audit?limit=200${query ? `&event_type=${encodeURIComponent(query)}` : ''}`),
        fetchWithAuth('/api/audit/simulations?limit=200'),
        fetchWithAuth('/api/audit/consents'),
      ])

      if (statsRes.ok) {
        const body = await statsRes.json()
        setCounts(body.counts || {})
        setSource(body.source || 'postgres')
      }
      if (securityRes.ok) {
        const body = await securityRes.json()
        setSecurityRows(body.data || [])
        if (body.fallbackReason) setFallbackReason(body.fallbackReason)
        if (body.source) setSource(body.source)
      } else {
        const err = await securityRes.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${securityRes.status}`)
      }
      if (simRes.ok) {
        const body = await simRes.json()
        setSimulationRows(body.data || [])
      }
      if (consentRes.ok) {
        const body = await consentRes.json()
        setConsentRows(body.data || [])
        if (body.fallbackReason) setFallbackReason(body.fallbackReason)
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el registro de auditoría.')
    } finally {
      setLoading(false)
    }
  }, [eventFilter])

  if (checkingRole) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sophia-blue"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 bg-red-950/10 border border-red-900/30 rounded-3xl animate-fadeIn">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">Acceso Denegado</h2>
        <p className="text-neutral-400 text-sm leading-relaxed">
          El registro de auditoría y la trazabilidad de simulaciones son visibles únicamente para el rol
          <strong> Administrador</strong> (RF-11).
        </p>
      </div>
    )
  }

  const totalEvents = Object.values(counts).reduce((acc, n) => acc + Number(n || 0), 0)
  const failedLogins = Number(counts.login_failed || 0)
  const unauthorized = Number(counts.unauthorized_access || 0) + Number(counts.invalid_token || 0)
  const privilegeChanges = Number(counts.privilege_change || 0)

  const kpis = [
    { label: 'Eventos registrados', value: totalEvents, icon: Activity, tone: 'text-sophia-blue dark:text-sky-400' },
    { label: 'Accesos fallidos', value: failedLogins, icon: ShieldAlert, tone: 'text-red-500' },
    { label: 'Accesos no autorizados', value: unauthorized, icon: KeyRound, tone: 'text-amber-500' },
    { label: 'Cambios de privilegios', value: privilegeChanges, icon: UserCog, tone: 'text-emerald-500' },
  ]

  const tabs: { key: TabKey; label: string; icon: any; count: number }[] = [
    { key: 'security', label: 'Seguridad', icon: ShieldCheck, count: securityRows.length },
    { key: 'simulations', label: 'Trazabilidad de simulaciones', icon: History, count: simulationRows.length },
    { key: 'consents', label: 'Consentimientos (Ley 29733)', icon: FileSignature, count: consentRows.length },
  ]

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase">
            Auditoría y Trazabilidad
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            RF-16 · Log de accesos con IP y sello temporal — RF-14 · Registro inmutable de simulaciones.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
            <Database className="w-3.5 h-3.5" />
            {source === 'postgres' ? 'PostgreSQL' : 'Memoria / respaldo'}
          </span>
          <button
            onClick={() => loadAll()}
            className="p-3 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-850 rounded-xl transition-all text-neutral-600 dark:text-neutral-350"
            title="Refrescar registros"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  {kpi.label}
                </p>
                <p className={`text-3xl font-black mt-2 ${kpi.tone}`}>{kpi.value}</p>
              </div>
              <kpi.icon className={`w-8 h-8 ${kpi.tone} opacity-70`} />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-xl text-sm font-semibold">
          Error: {error}
        </div>
      )}

      {fallbackReason && (
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 p-4 rounded-xl text-xs font-semibold">
          Fuente de respaldo activa: {fallbackReason}
        </div>
      )}

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-h-[44px] ${
              tab === item.key
                ? 'bg-sophia-blue text-white shadow-[0_0_18px_rgba(17,63,156,0.35)]'
                : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${tab === item.key ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-800'}`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sophia-blue"></div>
        </div>
      ) : tab === 'security' ? (
        <>
          {/* Filtro por tipo de evento */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label htmlFor="event-filter" className="text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Filtrar por tipo de evento
            </label>
            <select
              id="event-filter"
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value)
                void loadAll(e.target.value)
              }}
              className="min-w-[16rem] px-4 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-sophia-blue text-neutral-900 dark:text-white text-sm transition-all cursor-pointer"
            >
              <option value="">Todos los eventos</option>
              {Object.entries(EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800/80 shadow-2xl rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Fecha / Hora</th>
                    <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Evento</th>
                    <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Usuario</th>
                    <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">IP</th>
                    <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Recurso / Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
                  {securityRows.map((row, index) => {
                    const Icon = EVENT_ICONS[row.event_type] || Activity
                    const severity = (row.severity || 'info').toLowerCase()
                    return (
                      <tr key={String(row.id ?? index)} className="hover:bg-neutral-100/30 dark:hover:bg-neutral-900/30 transition-colors align-top">
                        <td className="p-4 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                          {formatTimestamp(row.event_time)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.info}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {EVENT_LABELS[row.event_type] || row.event_type}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-neutral-700 dark:text-neutral-300 break-words max-w-[14rem]">
                          <span className="font-bold">{row.user_email || '—'}</span>
                          {row.user_role && (
                            <span className="block text-[10px] uppercase tracking-widest text-neutral-500">{row.user_role}</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                          {row.ip_address || '—'}
                        </td>
                        <td className="p-4 text-xs text-neutral-600 dark:text-neutral-400 break-words max-w-[22rem]">
                          <span className="font-mono text-[11px]">
                            {row.http_method ? `${row.http_method} ` : ''}{row.resource || '—'}
                            {row.status_code ? ` · ${row.status_code}` : ''}
                          </span>
                          {row.details && Object.keys(row.details).length > 0 && (
                            <span className="block mt-1 text-[11px] text-neutral-500 dark:text-neutral-500">
                              {JSON.stringify(row.details)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {securityRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-neutral-500 dark:text-neutral-400 font-medium">
                        No hay eventos de seguridad registrados con este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : tab === 'simulations' ? (
        <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800/80 shadow-2xl rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
            RF-14 · Cada simulación queda registrada de forma inmutable: usuario, cliente, producto recomendado y argumento comercial generado.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Ejecutado</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Usuario</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Cliente / Zona</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Producto recomendado</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Argumento comercial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
                {simulationRows.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="hover:bg-neutral-100/30 dark:hover:bg-neutral-900/30 transition-colors align-top">
                    <td className="p-4 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {formatTimestamp(row.executed_at)}
                      <span className="block text-[10px] uppercase tracking-widest text-neutral-500">{row.source || 'gateway'}</span>
                    </td>
                    <td className="p-4 text-xs text-neutral-700 dark:text-neutral-300 break-words max-w-[14rem]">
                      <span className="font-bold">{row.user_email || '—'}</span>
                      {row.user_role && (
                        <span className="block text-[10px] uppercase tracking-widest text-neutral-500">{row.user_role}</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-neutral-700 dark:text-neutral-300 break-words max-w-[14rem]">
                      <span className="font-bold">{row.client_name || (row.client_id ? `Cliente #${row.client_id}` : '—')}</span>
                      {row.client_zone && (
                        <span className="block text-[10px] uppercase tracking-widest text-neutral-500">{row.client_zone}</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-bold text-neutral-900 dark:text-white break-words max-w-[14rem]">
                      {row.recommended_product || '—'}
                    </td>
                    <td className="p-4 text-xs text-neutral-600 dark:text-neutral-400 break-words max-w-[26rem]">
                      {row.commercial_argument || '—'}
                    </td>
                  </tr>
                ))}
                {simulationRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-neutral-500 dark:text-neutral-400 font-medium">
                      Aún no se han ejecutado simulaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800/80 shadow-2xl rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
            Ley N° 29733 · Consentimiento informado registrado con sello temporal, IP y versión del aviso de privacidad.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Titular</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Estado</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Versión</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Otorgado</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
                {consentRows.map((row, index) => (
                  <tr key={`${row.user_id}-${index}`} className="hover:bg-neutral-100/30 dark:hover:bg-neutral-900/30 transition-colors align-top">
                    <td className="p-4 text-xs text-neutral-700 dark:text-neutral-300 break-words max-w-[16rem]">
                      <span className="font-bold">{row.user_email || row.user_id}</span>
                      {row.user_role && (
                        <span className="block text-[10px] uppercase tracking-widest text-neutral-500">{row.user_role}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {row.granted && !row.revoked_at ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                          Otorgado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                          Revocado / Pendiente
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono text-neutral-600 dark:text-neutral-400">{row.policy_version || '—'}</td>
                    <td className="p-4 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{formatTimestamp(row.granted_at)}</td>
                    <td className="p-4 text-xs font-mono text-neutral-600 dark:text-neutral-400">{row.ip_address || '—'}</td>
                  </tr>
                ))}
                {consentRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-neutral-500 dark:text-neutral-400 font-medium">
                      No hay consentimientos informados registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
