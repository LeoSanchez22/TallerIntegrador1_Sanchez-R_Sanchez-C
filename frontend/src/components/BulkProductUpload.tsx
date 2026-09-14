'use client'

import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Download, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '../lib/apiClient'

interface ParsedProduct {
  nombre: string
  sub_familia: string
  formato: string
  composicion: string
  indicacion: string
  valido: boolean
  errorMsg?: string
}

interface BulkProductUploadProps {
  onSuccess?: () => void
}

export default function BulkProductUpload({ onSuccess }: BulkProductUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const parseFile = (file: File) => {
    setFileName(file.name)
    setErrorMsg(null)
    setSuccessMsg(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json: any[] = XLSX.utils.sheet_to_json(worksheet)

        if (json.length === 0) {
          setErrorMsg('El archivo Excel está vacío o no contiene filas con datos.')
          setProducts([])
          return
        }

        const parsed: ParsedProduct[] = json.map((row, idx) => {
          // Mapeo flexible de columnas (insensible a mayúsculas/espacios)
          const findVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k.toLowerCase().trim().replace(/_/g, ' ')
              if (keys.some(target => cleanK.includes(target))) {
                return String(row[k]).trim()
              }
            }
            return ''
          }

          const nombre = findVal(['nombre', 'producto', 'farmaco'])
          const sub_familia = findVal(['sub familia', 'familia', 'linea', 'categoria']) || 'Línea Oftalmológica'
          const formato = findVal(['formato', 'presentacion', 'tipo']) || 'SUSPENSIÓN OFTÁLMICA'
          const composicion = findVal(['composicion', 'formula', 'principio activo'])
          const indicacion = findVal(['indicacion', 'uso', 'descripcion'])

          let valido = true
          let error = ''
          if (!nombre) {
            valido = false
            error = 'Falta el nombre del producto'
          } else if (!composicion) {
            valido = false
            error = 'Falta la composición química'
          } else if (!indicacion) {
            valido = false
            error = 'Falta la indicación clínica'
          }

          return {
            nombre,
            sub_familia,
            formato,
            composicion,
            indicacion,
            valido,
            errorMsg: error
          }
        })

        setProducts(parsed)
      } catch (err: any) {
        console.error('Error parseando Excel:', err)
        setErrorMsg('Error al leer el archivo Excel. Asegúrate de que sea un formato válido (.xlsx o .csv).')
        setProducts([])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0])
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        nombre: 'SOPHIXAL OFTENO',
        sub_familia: 'ANTIBIÓTICOS',
        formato: 'SOLUCIÓN OFTÁLMICA',
        composicion: 'Ciprofloxacino 0.3% / Dexametasona 0.1%',
        indicacion: 'Tratamiento de infecciones oculares bacterianas con componente inflamatorio severo.'
      },
      {
        nombre: 'HUMYLUB PF',
        sub_familia: 'LUBRICANTES',
        formato: 'SUSPENSIÓN OFTÁLMICA',
        composicion: 'Hialuronato de sodio 0.18% / Sulfato de condroitina 0.3%',
        indicacion: 'Alivio del ojo seco moderado a severo sin conservadores.'
      }
    ]
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PlantillaProductos')
    XLSX.writeFile(workbook, 'Plantilla_Carga_Productos_Sophia.xlsx')
  }

  const handleConfirmUpload = async () => {
    const validProducts = products.filter(p => p.valido)
    if (validProducts.length === 0) {
      setErrorMsg('No hay productos válidos para registrar.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // 1. Intentar endpoint bulk en backend
      const res = await fetchWithAuth('/api/productos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos: validProducts })
      })

      if (!res.ok) {
        // Fallback: Registrar uno a uno si bulk no está disponible
        let exitoCount = 0
        for (const p of validProducts) {
          const singleRes = await fetchWithAuth('/api/productos/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: p.nombre,
              sub_familia: p.sub_familia,
              formato: p.formato,
              composicion: p.composicion,
              indicacion: p.indicacion
            })
          })
          if (singleRes.ok) exitoCount++
        }
        setSuccessMsg(`¡Carga completada! Se registraron ${exitoCount} productos exitosamente en el catálogo.`)
      } else {
        const data = await res.json()
        setSuccessMsg(`¡Carga exitosa! Se importaron ${data.count || validProducts.length} fármacos al catálogo de Sophia.`)
      }

      setProducts([])
      setFileName(null)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los productos en la base de datos.')
    } finally {
      setLoading(false)
    }
  }

  const validCount = products.filter(p => p.valido).length
  const invalidCount = products.filter(p => !p.valido).length

  return (
    <div className="bg-white dark:bg-neutral-900/60 rounded-3xl border border-neutral-200 dark:border-neutral-800/80 p-6 shadow-2xl space-y-6">
      {/* Header & Template Download */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sophia-blue dark:text-sophia-blue-400" />
            Importación Masiva de Catálogo (Excel / CSV)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Carga múltiples lanzamientos y fármacos al motor de contenido y similitud NLP en un solo paso.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all"
        >
          <Download className="w-4 h-4 text-sophia-blue dark:text-sophia-blue-400" />
          <span>Descargar Plantilla Excel</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 rounded-2xl text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-sky-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Drag & Drop Area */}
      {products.length === 0 ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-sophia-blue bg-sophia-blue/5 scale-[1.01]'
              : 'border-neutral-300 dark:border-neutral-800 hover:border-sophia-blue dark:hover:border-sophia-blue-400/60 bg-neutral-50/50 dark:bg-neutral-950/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-sophia-blue/10 flex items-center justify-center mx-auto mb-4 border border-sophia-blue/20 shadow-inner">
            <Upload className="w-8 h-8 text-sophia-blue dark:text-sophia-blue-400" />
          </div>
          <h4 className="text-base font-black text-neutral-900 dark:text-white uppercase mb-1">
            Arrastra tu archivo Excel (.xlsx o .csv) aquí
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            o haz clic para explorar en tu computadora. El sistema validará automáticamente las columnas y formato.
          </p>
        </div>
      ) : (
        /* Preview Table */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-neutral-100 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-sophia-blue dark:text-sophia-blue-400" />
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{fileName}</p>
                <div className="flex items-center gap-3 text-xs mt-0.5">
                  <span className="text-sky-700 dark:text-sky-300 font-bold">✔ {validCount} válidos</span>
                  {invalidCount > 0 && <span className="text-red-500 font-bold">✖ {invalidCount} con errores</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setProducts([]); setFileName(null); }}
                className="px-3 py-2 text-xs font-bold text-neutral-500 hover:text-red-500 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={loading || validCount === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-sophia-blue hover:bg-sophia-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 min-h-[40px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <span>Confirmar e Importar {validCount} Fármacos</span>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-lg bg-white dark:bg-neutral-950/40 max-h-72 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3 font-black uppercase text-neutral-500 tracking-wider">Estado</th>
                  <th className="p-3 font-black uppercase text-neutral-500 tracking-wider">Nombre</th>
                  <th className="p-3 font-black uppercase text-neutral-500 tracking-wider">Sub-Familia</th>
                  <th className="p-3 font-black uppercase text-neutral-500 tracking-wider">Formato</th>
                  <th className="p-3 font-black uppercase text-neutral-500 tracking-wider">Composición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {products.map((p, idx) => (
                  <tr key={idx} className={`hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${!p.valido ? 'bg-red-500/5' : ''}`}>
                    <td className="p-3">
                      {p.valido ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold text-[10px]">
                          Válido
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold text-[10px]" title={p.errorMsg}>
                          {p.errorMsg || 'Inválido'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-neutral-900 dark:text-white uppercase">{p.nombre || '—'}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400">{p.sub_familia}</td>
                    <td className="p-3 uppercase text-[10px]">{p.formato}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 truncate max-w-xs">{p.composicion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
