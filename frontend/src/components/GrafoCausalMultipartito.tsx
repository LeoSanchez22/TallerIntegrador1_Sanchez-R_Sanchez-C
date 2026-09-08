'use client'

import React from 'react';

interface RecomendacionItem {
  producto: string;
  detonante?: string;
  motor: string;
}

interface GrafoCausalMultipartitoProps {
  clienteId: number;
  historial: string[];
  recomendaciones: RecomendacionItem[];
}

export default function GrafoCausalMultipartito({
  clienteId,
  historial,
  recomendaciones
}: GrafoCausalMultipartitoProps) {
  const width = 600;
  const height = 350;
  const col0X = 70;
  const col1X = 280;
  const col2X = 510;

  const recList = recomendaciones || [];
  
  // Garantizar que todos los detonantes (anclas) estén en la columna de historial
  const histSet = new Set<string>();
  recList.forEach(rec => {
    if (rec.detonante) {
      histSet.add(rec.detonante);
    }
  });
  
  // Rellenar con historial reciente hasta completar máximo 6 nodos
  const reversedHist = [...historial].reverse();
  for (const item of reversedHist) {
    if (histSet.size >= 6) break;
    histSet.add(item);
  }
  
  const histList = Array.from(histSet);

  return (
    <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
          Grafo Causal Multipartito (Caja de Cristal)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Visualización explicable de la procedencia y causalidad de las recomendaciones en 3 capas.
        </p>
      </div>

      <div className="flex justify-center items-center overflow-x-auto custom-scrollbar py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-full min-w-[320px] overflow-visible">
          {/* Enlaces de Cliente a Historial */}
          {histList.map((hist, i) => {
            const y1 = height / 2;
            const y2 = (height / (histList.length + 1)) * (i + 1);
            return (
              <g key={`edge-h-${i}`}>
                <line x1={col0X} y1={y1} x2={col1X} y2={y2} stroke="#9ca3af" strokeWidth="1" />
              </g>
            );
          })}

          {/* Enlaces de Causalidad e Incorporación */}
          {recList.map((rec, i) => {
            const yClient = height / 2;
            const yRec = (height / (recList.length + 1)) * (i + 1);
            const histIdx = rec.detonante ? histList.indexOf(rec.detonante) : -1;
            const yHist = histIdx !== -1 ? (height / (histList.length + 1)) * (histIdx + 1) : height / 2;

            return (
              <g key={`edge-r-${i}`}>
                {/* Conexión directa cliente-sugerido */}
                <line x1={col0X} y1={yClient} x2={col2X} y2={yRec} stroke="#d1d5db" strokeWidth="1" />
                {/* Línea de Causalidad Regla (Dashed Purple) */}
                {histIdx !== -1 && (
                  <line x1={col1X} y1={yHist} x2={col2X} y2={yRec} stroke="#8b5cf6" strokeDasharray="3 3" strokeWidth="1.5" />
                )}
              </g>
            );
          })}

          {/* Capa 0: Cliente */}
          <circle cx={col0X} cy={height / 2} r={28} fill="#87CEFA" stroke="#6b7280" />
          <text x={col0X} y={height / 2 + 4} textAnchor="middle" fill="#1f2937" fontSize="9" fontWeight="bold">
            Cliente {clienteId}
          </text>

          {/* Capa 1: Historial (Disparadores) */}
          {histList.map((hist, i) => {
            const y = (height / (histList.length + 1)) * (i + 1);
            return (
              <g key={`node-h-${i}`}>
                <circle cx={col1X} cy={y} r={16} fill="#98FB98" stroke="#6b7280" />
                <text x={col1X} y={y + 3} textAnchor="middle" fill="#1f2937" fontSize="7" fontWeight="bold">
                  {hist}
                </text>
              </g>
            );
          })}

          {/* Capa 2: Recomendaciones Finales */}
          {recList.map((rec, i) => {
            const y = (height / (recList.length + 1)) * (i + 1);
            return (
              <g key={`node-r-${i}`}>
                <circle cx={col2X} cy={y} r={18} fill="#F08080" stroke="#6b7280" />
                <text x={col2X} y={y + 3} textAnchor="middle" fill="#1f2937" fontSize="7" fontWeight="bold">
                  {rec.producto}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
