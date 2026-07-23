'use client'

import React from 'react';

interface RecomendacionItem {
  producto: string;
  detonante?: string;
  motor: string;
}

interface TopologiaRecomendacionProps {
  clienteId: number;
  historial: string[];
  recomendaciones: RecomendacionItem[];
}

export default function TopologiaRecomendacion({
  clienteId,
  historial,
  recomendaciones
}: TopologiaRecomendacionProps) {
  const width = 500;
  const height = 350;
  const centerX = width / 2;
  const centerY = height / 2;
  const r1 = 70;
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
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Topología de Recomendación (Reglas de Asociación y Similitud)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Este grafo de fuerza dirigida explica visualmente qué detonó cada recomendación. El cliente se ubica en el núcleo, orbitado por su historial de compras reales. Los nodos externos representan los fármacos sugeridos, los cuales son 'atraídos' matemáticamente hacia el producto histórico que disparó la regla de Apriori o la similitud de TF-IDF.
        </p>
      </div>

      <div className="flex justify-center items-center overflow-x-auto">
        <svg width={width} height={height} className="overflow-visible">
          {/* Inner orbit connection lines */}
          {histList.map((prod, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, histList.length);
            const x = centerX + r1 * Math.cos(angle);
            const y = centerY + r1 * Math.sin(angle);
            return (
              <g key={`edge-h-${i}`}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Outer orbit connections and Causality lines */}
          {recList.map((rec, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, recList.length) + 0.5;
            const x = centerX + r2 * Math.cos(angle);
            const y = centerY + r2 * Math.sin(angle);
            
            const histIdx = rec.detonante ? histList.indexOf(rec.detonante) : -1;
            const anchorX = histIdx !== -1 
              ? centerX + r1 * Math.cos((2 * Math.PI * histIdx) / Math.max(1, histList.length)) 
              : centerX;
            const anchorY = histIdx !== -1 
              ? centerY + r1 * Math.sin((2 * Math.PI * histIdx) / Math.max(1, histList.length)) 
              : centerY;

            return (
              <g key={`edge-r-${i}`}>
                {/* Conexión de Causalidad Regla */}
                <line x1={anchorX} y1={anchorY} x2={x} y2={y} stroke="#f97316" strokeDasharray="3 3" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Core Node */}
          <circle cx={centerX} cy={centerY} r={24} fill="#87CEFA" stroke="#4b5563" />
          <text x={centerX} y={centerY + 3} textAnchor="middle" fill="#1f2937" fontSize="8" fontWeight="bold">
            Cliente {clienteId}
          </text>

          {/* Inner orbit nodes */}
          {histList.map((prod, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, histList.length);
            const x = centerX + r1 * Math.cos(angle);
            const y = centerY + r1 * Math.sin(angle);
            return (
              <g key={`node-h-${i}`}>
                <circle cx={x} cy={y} r={14} fill="#98FB98" stroke="#4b5563" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#1f2937" fontSize="7" fontWeight="bold">
                  {prod}
                </text>
              </g>
            );
          })}

          {/* Outer orbit nodes */}
          {recList.map((rec, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, recList.length) + 0.5;
            const x = centerX + r2 * Math.cos(angle);
            const y = centerY + r2 * Math.sin(angle);
            return (
              <g key={`node-r-${i}`}>
                <circle cx={x} cy={y} r={16} fill="#FF7F50" stroke="#4b5563" />
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
