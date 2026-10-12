/**
 * =============================================================================
 *  POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES — CONSENTIMIENTO INFORMADO
 *  Ley N° 29733 (Ley de Protección de Datos Personales) y su Reglamento
 *  D.S. N° 003-2013-JUS · Art. 9° y 12° (derecho a la información y
 *  consentimiento informado) — ISO/IEC 27002 control 5.34 y 8.28
 * =============================================================================
 * El texto íntegro del aviso de privacidad se publica en la ruta pública
 * `/privacy` del frontend. Esta definición centraliza la versión vigente y las
 * finalidades para dejar constancia verificable del consentimiento otorgado
 * (o revocado) por cada usuario de la plataforma.
 * =============================================================================
 */

export const POLICY_VERSION = 'v1.0-2026'
export const POLICY_EFFECTIVE_DATE = '2026-10-11'
export const DATA_CONTROLLER = 'Laboratorios Sophia S.A.'
export const DPO_CONTACT = 'protecciondedatos@laboratoriossophia.com'

export const POLICY_PURPOSES = [
  {
    id: 'gestion_comercial',
    label: 'Gestión de la cartera de clientes, zonas y vendedores de la red comercial.'
  },
  {
    id: 'analitica_predictiva',
    label: 'Modelado predictivo de demanda farmacéutica y recomendaciones terapéuticas (Attention-GRU, Apriori, K-Means).'
  },
  {
    id: 'argumentario_xai',
    label: 'Generación del argumentario comercial explicable (XAI) asociado a cada recomendación.'
  },
  {
    id: 'auditoria_seguridad',
    label: 'Registro de accesos, auditoría de seguridad y trazabilidad de operaciones críticas (ISO/IEC 27001).'
  },
  {
    id: 'soporte_y_mantenimiento',
    label: 'Soporte técnico, mantenimiento del modelo y notificaciones operativas de la plataforma.'
  }
]

export const PURPOSE_IDS = POLICY_PURPOSES.map(p => p.id)

/** Transferencia internacional declarada al titular (Art. 17 Ley 29733). */
export const INTERNATIONAL_TRANSFER = {
  destinatario: 'Supabase, Inc. (AWS us-west-2)',
  pais: 'Estados Unidos de América',
  garantia: 'Cifrado en tránsito TLS 1.2+ y en reposo AES-256; encargado de tratamiento bajo cláusulas contractuales estándar.'
}
