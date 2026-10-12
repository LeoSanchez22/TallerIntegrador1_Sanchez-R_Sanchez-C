'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, FileSignature, Loader2, ShieldCheck, Scale } from 'lucide-react'
import { fetchWithAuth } from '../lib/apiClient'

/**
 * =============================================================================
 *  CONSENTIMIENTO INFORMADO — LEY N° 29733 (PROTECCIÓN DE DATOS PERSONALES)
 * =============================================================================
 * Antes de operar la plataforma, el titular debe prestar su consentimiento
 * informado sobre el tratamiento de sus datos personales (Art. 9° y 12° de la
 * Ley N° 29733 y su Reglamento D.S. N° 003-2013-JUS):
 *
 *   • Identidad y domicilio del responsable del tratamiento.
 *   • Finalidades concretas del tratamiento y datos recabados.
 *   • Transferencia internacional (Supabase · AWS us-west-2).
 *   • Ejercicio gratuito de los derechos ARCO (Acceso, Rectificación,
 *     Cancelación y Oposición) y revocabilidad del consentimiento.
 *
 * El otorgamiento queda registrado con sello temporal, dirección IP y versión
 * de la política vigente en `user_consents` (inmutable) y en el log de
 * auditoría de seguridad.
 * =============================================================================
 */

interface PolicyPurpose {
  id: string
  label: string
}

interface PolicyPayload {
  version: string
  fecha_vigencia: string
  responsable: string
  contacto_dpd: string
  finalidades: PolicyPurpose[]
  transferencia_internacional: {
    destinatario: string
    pais: string
    garantia: string
  }
}

export default function ConsentGate() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policy, setPolicy] = useState<PolicyPayload | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  const checkConsent = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/consent')
      if (!res.ok) return
      const body = await res.json()
      if (body?.policy) setPolicy(body.policy)
      setOpen(Boolean(body?.pending))
    } catch (err) {
      // Sin backend no se puede validar: no se bloquea el acceso del usuario.
      console.warn('[CONSENT] No se pudo verificar el estado del consentimiento:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void checkConsent()
  }, [checkConsent])

  const handleAccept = async () => {
    if (!policy || !acknowledged || sending) return
    setSending(true)
    setError(null)

    try {
      const res = await fetchWithAuth('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted: true,
          policyVersion: policy.version,
          purposes: (policy.finalidades || []).map(p => p.id)
        })
      })

      if (!res.ok) {
        throw new Error('No se pudo registrar tu consentimiento. Intenta nuevamente.')
      }

      setOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado.')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl"
      >
        {/* Encabezado institucional */}
        <div className="p-6 sm:p-8 border-b border-neutral-200 dark:border-neutral-800 bg-sophia-blue/5 dark:bg-sophia-blue/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sophia-blue text-white flex items-center justify-center shadow-lg flex-shrink-0">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h2 id="consent-title" className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                Aviso de Privacidad y Consentimiento Informado
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-semibold">
                Ley N° 29733 — Ley de Protección de Datos Personales · Reglamento D.S. N° 003-2013-JUS
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
          {/* Responsable del tratamiento */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-sophia-blue dark:text-sophia-blue-300 mb-2">
              1. Responsable del tratamiento
            </h3>
            <p className="leading-relaxed">
              <strong>{policy?.responsable || 'Laboratorios Sophia S.A.'}</strong> es responsable del tratamiento de sus
              datos personales. Para consultas sobre el tratamiento o el ejercicio de sus derechos puede escribir a{' '}
              <span className="font-bold text-sophia-blue dark:text-sky-400">{policy?.contacto_dpd || 'protecciondedatos@laboratoriossophia.com'}</span>.
            </p>
          </section>

          {/* Finalidades */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-sophia-blue dark:text-sophia-blue-300 mb-2">
              2. Finalidades del tratamiento
            </h3>
            <ul className="space-y-2">
              {(policy?.finalidades || []).map(purpose => (
                <li key={purpose.id} className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-sky-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm leading-relaxed">{purpose.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Transferencia internacional */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-sophia-blue dark:text-sophia-blue-300 mb-2">
              3. Transferencia internacional
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed">
              Sus datos se almacenan en <strong>{policy?.transferencia_internacional?.destinatario || 'Supabase · AWS us-west-2'}</strong> ({' '}
              {policy?.transferencia_internacional?.pais || 'Estados Unidos de América'}). Garantías: {policy?.transferencia_internacional?.garantia || 'cifrado TLS en tránsito y AES-256 en reposo'}.
            </p>
          </section>

          {/* Derechos ARCO */}
          <section className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-sophia-blue dark:text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-900 dark:text-white mb-1.5">
                  4. Derechos ARCO y revocabilidad
                </h3>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Usted puede ejercer en forma gratuita sus derechos de <strong>Acceso</strong>, <strong>Rectificación</strong>,{' '}
                  <strong>Cancelación</strong> y <strong>Oposición</strong>, así como revocar este consentimiento en
                  cualquier momento escribiendo al contacto del numeral 1. La revocación no afecta la licitud del
                  tratamiento realizado con anterioridad.
                </p>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="inline-block mt-2 text-xs font-bold text-sophia-blue dark:text-sky-400 hover:underline"
                >
                  Leer el aviso de privacidad completo →
                </Link>
              </div>
            </div>
          </section>

          {/* Manifestación de voluntad */}
          <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 cursor-pointer hover:border-sophia-blue/60 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-sophia-blue focus:ring-sophia-blue cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-semibold leading-relaxed text-neutral-800 dark:text-neutral-200">
              Declaro haber leído y comprendido el aviso de privacidad. Otorgo mi consentimiento informado para el
              tratamiento de mis datos personales conforme a las finalidades descritas (Ley N° 29733).
              {policy?.version && (
                <span className="block mt-1 text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-black">
                  Política versión {policy.version} · Vigente desde {policy.fecha_vigencia}
                </span>
              )}
            </span>
          </label>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-6 sm:p-8 pt-0 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href="/privacy"
            target="_blank"
            className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center min-h-[44px] flex items-center justify-center"
          >
            Revisar política completa
          </Link>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!acknowledged || sending || loading}
            className="px-6 py-3 bg-sophia-blue hover:bg-sophia-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-sophia-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            <span>Acepto y continúo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
