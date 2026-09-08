'use client'

import React from 'react';

interface RecomendacionItem {
  producto: string;
  detonante?: string;
  motor: string;
}

interface SistemaSolarRecomendacionesProps {
  clienteId: number;
  historial: string[];
  recomendaciones: RecomendacionItem[];
}

export default function SistemaSolarRecomendaciones({
  clienteId,
  historial,
  recomendaciones
}: SistemaSolarRecomendacionesProps) {
  const width = 500;
  const height = 350;
  const centerX = width / 2;
  const centerY = height / 2;
  const r1 = 65;
  const r2 = 135;

  const recList = recomendaciones || [];
  
  // Garantizar que todos los detonantes estén en la órbita de historial
  const histSet = new Set<string>();
  recList.forEach(rec => {
    if (rec.detonante) {
      histSet.add(rec.detonante);
    }
  });

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
          Sistema Solar de Recomendaciones (Causalidad Exacta)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Este diseño orbital sitúa al cliente en el núcleo (0,0). El primer anillo (verde) contiene su historial real distribuido trigonométricamente. El segundo anillo (naranja) proyecta los productos recomendados en el mismo vector angular que su producto disparador, demostrando visualmente la regla de asociación Apriori.
        </p>
      </div>

      <div className="flex justify-center items-center overflow-x-auto custom-scrollbar py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-full min-w-[300px] overflow-visible">
          {/* Orbital rings */}
          <circle cx={centerX} cy={centerY} r={r1} fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" strokeOpacity={0.5} />
          <circle cx={centerX} cy={centerY} r={r2} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" strokeOpacity={0.5} />

          {/* Central Customer Node */}
          <circle cx={centerX} cy={centerY} r={26} fill="#87CEFA" stroke="#4b5563" />
          <text x={centerX} y={centerY + 3} textAnchor="middle" fill="#1f2937" fontSize="8" fontWeight="bold">
            Cliente {clienteId}
          </text>

          {/* Render Green History ring */}
          {histList.map((prod, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, histList.length);
            const x = centerX + r1 * Math.cos(angle);
            const y = centerY + r1 * Math.sin(angle);
            return (
              <g key={`solar-h-${i}`}>
                <circle cx={x} cy={y} r={12} fill="#98FB98" stroke="#4b5563" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#1f2937" fontSize="7" fontWeight="bold">
                  {prod}
                </text>
              </g>
            );
          })}

          {/* Render Tomato/Orange Recommendations ring mapped to the angular vector of their trigger */}
          {recList.map((rec, i) => {
            const histIdx = rec.detonante ? histList.indexOf(rec.detonante) : -1;
            const angle = histIdx !== -1 
              ? (2 * Math.PI * histIdx) / Math.max(1, histList.length) + 0.15 
              : (2 * Math.PI * i) / Math.max(1, recList.length);

            const x = centerX + r2 * Math.cos(angle);
            const y = centerY + r2 * Math.sin(angle);
            const x1 = centerX + r1 * Math.cos(angle);
            const y1 = centerY + r1 * Math.sin(angle);

            return (
              <g key={`solar-r-${i}`}>
                <line x1={x1} y1={y1} x2={x} y2={y} stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx={x} cy={y} r={14} fill="#FF6347" stroke="#4b5563" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
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
