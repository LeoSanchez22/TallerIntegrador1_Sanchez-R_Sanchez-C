import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function getGeminiApiKey(): string {
  function parseEnvContent(content: string): string {
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) continue
      const parts = trimmed.split('=')
      if (parts[0] && parts[0].trim() === 'GEMINI_API_KEY') {
        return parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
    return ''
  }

  // 1. First, try reading parent directory's .env (which is the root of the project)
  try {
    const parentEnvPath = path.resolve(process.cwd(), '../.env')
    if (fs.existsSync(parentEnvPath)) {
      const content = fs.readFileSync(parentEnvPath, 'utf8')
      const key = parseEnvContent(content)
      if (key) return key
    }
  } catch (e) {
    console.error("Error reading parent .env:", e)
  }

  // 2. Try reading from the current directory's .env
  try {
    const rootEnvPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(rootEnvPath)) {
      const content = fs.readFileSync(rootEnvPath, 'utf8')
      const key = parseEnvContent(content)
      if (key) return key
    }
  } catch (e) {
    console.error("Error reading root .env:", e)
  }

  // 3. Fallback to process.env if manual reading failed
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY
  }
  
  return ''
}

export async function POST(request: Request) {
  try {
    const { producto, itemAtencion, pesoAtencion, motor, modeloOculto, mes } = await request.json()
    
    const apiKey = getGeminiApiKey()
    
    const mesTexto = mes.includes(" (") 
      ? mes.split(" (")[1].replace(")", "").toLowerCase() 
      : mes.toLowerCase()
      
    const histBase = itemAtencion || "Productos habituales"
    
    let pesoVal = pesoAtencion || 100
    if (typeof pesoVal === 'string') {
      pesoVal = parseFloat(pesoVal.replace('%', ''))
    }
    if (isNaN(Number(pesoVal))) {
      pesoVal = 100
    }

    // 1. BASE LÓGICA ESTRATÉGICA (Ahora con justificación clara del "Disparador" - Idéntico a app.py)
    let logicaXai = ""
    const isGRU = modeloOculto === 'Atención-GRU' || 
                  motor === 'Atención-GRU' || 
                  motor?.includes('Reposicion') || 
                  motor?.includes('Reposición') || 
                  motor?.includes('Atencion') || 
                  motor?.includes('Atención')
                  
    const isColdStart = modeloOculto === 'Cold Start' || 
                        motor === 'Cold Start' || 
                        motor?.includes('Exito') || 
                        motor?.includes('Éxito') || 
                        motor?.includes('Cold')
                        
    const isContenido = modeloOculto === 'Contenido (Nuevo Lanzamiento)' || 
                        motor === 'Contenido (Nuevo Lanzamiento)' || 
                        motor?.includes('Contenido') || 
                        motor?.includes('Lanzamiento') || 
                        motor?.includes('Nuevo')
    
    if (isGRU) {
      logicaXai = `Correlación secuencial de inventario. El sistema analizó el historial y detectó con un ${pesoVal}% de certeza matemática que la reciente compra de '${histBase}' funciona como un indicador temprano del quiebre de stock inminente de '${producto}'. No es coincidencia, es su ciclo de rotación habitual.`
    } else if (isColdStart) {
      logicaXai = `Estrategia de penetración geográfica. Ante la escasez de datos históricos de esta clínica, sugerimos '${producto}' por ser el motor de rentabilidad principal en otras instituciones de la zona.`
    } else if (isContenido) {
      logicaXai = `Expansión de portafolio sin riesgo. '${producto}' es un lanzamiento que comparte el mismo ADN clínico que '${histBase}' (el cual ya compran), garantizando fácil adopción institucional.`
    } else {
      logicaXai = `Oportunidad de Cross-Selling (NCF). Clínicas idénticas a nivel nacional que ya abastecen '${histBase}', están maximizando sus ventas incluyendo '${producto}' en sus compras.`
    }

    // 1.5 SUPOSICIONES DE HORIZONTE: EL "CAMINO FELIZ" DEL PIPELINE DE VENTAS
    if (mes.includes("Mes +1")) {
      const suposicion = "Proyección en cascada: Asume que lograremos cerrar la cuota del Mes Actual, preparando a la clínica para adoptar este fármaco el próximo mes."
      logicaXai += ` ${suposicion}`
    } else if (mes.includes("Mes +2")) {
      const suposicion = "Camino Feliz (Happy Path): Meta de expansión a largo plazo, asumiendo que el cliente cerró las recomendaciones de los dos meses anteriores."
      logicaXai += ` ${suposicion}`
    }

    if (!apiKey) {
      return NextResponse.json({ explanation: `Proyección Comercial: ${logicaXai}` })
    }

    // 2. PROMPT DE GRADO EMPRESARIAL (System Persona + Restricciones Cuantitativas)
    const prompt = `
    Actúa como un Director de Inteligencia Comercial B2B experto en Supply Chain farmacéutico.
    Tu objetivo es transformar un dato matemático en un argumento de ventas B2B persuasivo, fluido y directo al grano, para guiar a un visitador médico.
    
    DATOS DEL NEGOCIO:
    - Fármaco a vender: '${producto}'
    - Fármaco detonante (marcador temporal/contexto): '${histBase}'
    - Horizonte Temporal: ${mes}
    - Fundamento Logístico y Suposiciones: ${logicaXai}
    
    REGLAS ESTRICTAS:
    1. PROHIBIDO LO MÉDICO: No diagnostiques, no hables de pacientes ni biología. Habla de inventario, rotación, y ciclos de reposición.
    2. DATOS CUANTITATIVOS (CRÍTICO): Si el 'Fundamento Logístico' incluye un porcentaje (%), OBLIGATORIAMENTE debes escribir ese número exacto en tu respuesta para darle peso científico e irrefutable a la recomendación.
    3. HORIZONTE Y SUPOSICIÓN: Si la sugerencia es para 'Mes +1' o 'Mes +2', tu texto DEBE explicarle al visitador que esta es una estrategia "en cadena" (depende de cerrar los meses anteriores).
    4. CLARIDAD DEL DISPARADOR: Explica de forma lógica por qué la compra del Fármaco detonante avisa de la necesidad del Fármaco a vender.
    5. CERO PLANTILLAS: Redacta orgánicamente. Prohibido decir "Nuestros análisis revelan" o "El modelo sugiere".
    `

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      }
    )
    if (!res.ok) {
      throw new Error(`Google API HTTP ${res.status}`)
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) {
      throw new Error("No output generated")
    }
    
    // Clean emojis
    const cleanText = text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      
    return NextResponse.json({ explanation: cleanText })
  } catch (e: any) {
    console.error("Gemini API call failed, falling back to static:", e)
    return NextResponse.json({ error: e.message || "Failed to generate explanation" }, { status: 500 })
  }
}
