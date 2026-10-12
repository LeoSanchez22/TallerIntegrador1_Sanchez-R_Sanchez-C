import Link from "next/link";
import { ArrowLeft, Scale, ShieldCheck, Users, Globe2, Lock } from "lucide-react";

export const metadata = {
  title: "Aviso de Privacidad | Sophia XAI",
  description:
    "Aviso de privacidad y consentimiento informado conforme a la Ley N° 29733 y su Reglamento D.S. N° 003-2013-JUS.",
};

/**
 * Aviso de privacidad público (Ley N° 29733 · Reglamento D.S. N° 003-2013-JUS).
 * Es el texto que sustenta el consentimiento informado registrado en la
 * plataforma y versionado por `backend/src/security/policy.js`.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans antialiased">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-sophia-blue dark:hover:text-sky-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio de sesión</span>
        </Link>

        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sophia-blue/10 border border-sophia-blue/20 text-sophia-blue dark:text-sky-400 text-[11px] font-black uppercase tracking-widest mb-4">
            <Scale className="w-3.5 h-3.5" />
            <span>Protección de datos personales</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Aviso de Privacidad y Consentimiento Informado
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">
            Emitido conforme a la Ley N° 29733 — Ley de Protección de Datos Personales y su Reglamento aprobado por
            Decreto Supremo N° 003-2013-JUS. Versión vigente: <strong>v1.0-2026</strong>.
          </p>
        </header>

        <div className="space-y-6">
          {[
            {
              icon: Users,
              title: "1. Identidad y domicilio del responsable",
              body: (
                <>
                  <strong>Laboratorios Sophia S.A.</strong>, identificada con RUC 20512345678, con domicilio en Lima,
                  Perú, es la responsable del tratamiento de sus datos personales a través de la plataforma Sophia XAI.
                  Contacto del Delegado de Protección de Datos:{" "}
                  <strong className="text-sophia-blue dark:text-sky-400">protecciondedatos@laboratoriossophia.com</strong>.
                </>
              ),
            },
            {
              icon: ShieldCheck,
              title: "2. Datos personales recabados",
              body: (
                <>
                  Tratamos: nombre completo, correo electrónico corporativo, empresa, rol comercial y zona comercial
                  asignada (datos de identificación); así como registros de acceso, dirección IP, marca de tiempo y
                  trazabilidad de las simulaciones ejecutadas (datos de seguridad y auditoría). No se recaban datos
                  personales sensibles de pacientes ni información clínica identificable.
                </>
              ),
            },
            {
              icon: Lock,
              title: "3. Finalidades del tratamiento",
              body: (
                <>
                  <ol className="list-decimal list-inside space-y-1.5 mt-2">
                    <li>Gestión de la cartera de clientes, zonas y vendedores de la red comercial.</li>
                    <li>Modelado predictivo de demanda farmacéutica y recomendaciones terapéuticas.</li>
                    <li>Generación del argumentario comercial explicable (XAI) de cada recomendación.</li>
                    <li>Auditoría de seguridad y trazabilidad de operaciones críticas (ISO/IEC 27001).</li>
                    <li>Soporte técnico, mantenimiento del modelo y notificaciones operativas.</li>
                  </ol>
                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    Tratamiento sujeto al consentimiento informado del titular (Art. 12° de la Ley N° 29733).
                  </p>
                </>
              ),
            },
            {
              icon: Globe2,
              title: "4. Transferencia internacional y seguridad",
              body: (
                <>
                  Sus datos se alojan en <strong>Supabase, Inc.</strong> sobre infraestructura AWS (us-west-2,
                  Estados Unidos de América), en calidad de encargado del tratamiento. Garantías aplicadas: cifrado en
                  tránsito mediante <strong>TLS 1.2 o superior</strong>, cifrado en reposo con AES-256, control de
                  acceso basado en roles, políticas de seguridad a nivel de fila (RLS) y registro inmutable de
                  auditoría.
                </>
              ),
            },
            {
              icon: Scale,
              title: "5. Derechos ARCO y revocabilidad",
              body: (
                <>
                  El titular puede ejercer de forma gratuita y en cualquier momento sus derechos de{" "}
                  <strong>Acceso</strong>, <strong>Rectificación</strong>, <strong>Cancelación</strong> y{" "}
                  <strong>Oposición</strong>, así como <strong>limitar el uso</strong> de sus datos o{" "}
                  <strong>revocar</strong> el consentimiento otorgado, mediante solicitud al correo del Delegado de
                  Protección de Datos. La revocación no afecta la licitud del tratamiento realizado con anterioridad ni
                  las obligaciones legales de conservación de los registros de auditoría.
                </>
              ),
            },
            {
              icon: ShieldCheck,
              title: "6. Conservación y exactitud",
              body: (
                <>
                  Los registros de auditoría se conservan por <strong>24 meses</strong> atendiendo al principio de
                  exactitud y obligaciones de ISO/IEC 27002 (control 5.33). Puede solicitar la rectificación de datos
                  inexactos en cualquier momento.
                </>
              ),
            },
          ].map((section) => (
            <section
              key={section.title}
              className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-sophia-blue/10 border border-sophia-blue/20 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-sophia-blue dark:text-sky-400" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                  {section.title}
                </h2>
              </div>
              <div className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{section.body}</div>
            </section>
          ))}
        </div>

        <footer className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
          Última actualización: 11 de octubre de 2026 · Laboratorios Sophia S.A. · Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
