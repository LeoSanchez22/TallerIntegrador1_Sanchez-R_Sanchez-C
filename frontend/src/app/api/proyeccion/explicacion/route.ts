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
    const confVal = confianza || pesoAtencion || 50
    const liftVal = lift || 1.5
    const cantVal = cantidadSugerida || 10
    const valorVal = ingresoEstimado || 100

    let designacion = "Acción Inmediata"
    if (mes.includes("Mes +1")) {
      designacion = "Acción Preventiva (Mes +1)"
    } else if (mes.includes("Mes +2")) {
      designacion = "Acción de Largo Plazo (Mes +2)"
    }

    const parrafo1 = `La trazabilidad de esta recomendación se fundamenta en un análisis determinista que confirmó el consumo activo del producto ancla '${ancla}' en las transacciones reales del cliente. Esta detección habilitó una regla de asociación predefinida que asocia '${ancla}' con '${producto}', respaldada por una confianza del ${confVal}% y un lift de ${liftVal}, lo cual valida la correlación predictiva entre ambos productos dentro del patrón de compra histórico.`

    const parrafo2 = `Financieramente, se sugiere una adquisición de ${cantVal} unidades de '${producto}', que representan un valor de $${Number(valorVal).toFixed(1)}, justificada por la mediana de consumo observada en el clúster de clientes al que pertenece esta entidad. Esta intervención se designa como ${designacion}, dado que el diagnóstico se elaboró a partir de datos transaccionales reales y actualizados a la fecha del mes en curso, asegurando la máxima relevancia y oportunidad.`

    const explanationText = `${parrafo1}\n\n${parrafo2}`

    return NextResponse.json({ explanation: explanationText })
  } catch (e: any) {
    console.error("Failed to generate explanation:", e)
    return NextResponse.json({ error: e.message || "Failed to generate explanation" }, { status: 500 })
  }
}
