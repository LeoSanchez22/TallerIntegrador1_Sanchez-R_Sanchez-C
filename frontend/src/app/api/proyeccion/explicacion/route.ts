import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const {
      producto,
      itemAtencion,
      pesoAtencion,
      motor,
      modeloOculto,
      mes,
      lift,
      confianza,
      cantidadSugerida,
      ingresoEstimado
    } = await request.json()

    const ancla = itemAtencion || "Productos habituales"
    const confVal = Math.round(confianza || pesoAtencion || 85)
    const cantVal = cantidadSugerida || 15
    const valorVal = ingresoEstimado || (cantVal * 38)

    const explanationText = `Oportunidad oftalmológica basada en la rotación activa de '${ancla}'. '${producto}' fortalece el tratamiento y la demanda en clínica con una afinidad proyectada del ${confVal}%. Se sugiere una orden de ${cantVal} unidades (facturación estimada de S/ ${Number(valorVal).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) para optimizar el margen del cliente y asegurar disponibilidad preferencial de lote.`

    return NextResponse.json({ explanation: explanationText })
  } catch (e: any) {
    console.error("Failed to generate explanation:", e)
    return NextResponse.json({ error: e.message || "Failed to generate explanation" }, { status: 500 })
  }
}
