'use client'

import React from 'react';

interface RecomendacionItem {
  producto: string;
  detonante?: string;
  motor: string;
}

interface CausalityOrbitalGraphProps {
  clienteId: number;
  historial: string[];
  recomendaciones: RecomendacionItem[];
}

export default function CausalityOrbitalGraph({ clienteId, historial, recomendaciones }: CausalityOrbitalGraphProps) {
  const width = 500;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const r1 = 80;
  const r2 = 130;

  const histList = historial.slice(-5);
  const recList = recomendaciones || [];

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Grafo Orbital de Causalidad (Topología de Recomendación)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Núcleo Cliente {clienteId} orbitado por su historial (Verde) y proyecciones Apriori (Naranja).
        </p>
      </div>

      <div className="flex justify-center items-center overflow-x-auto">
        <svg width={width} height={height} className="overflow-visible">
          {/* Orbits */}
          <circle cx={centerX} cy={centerY} r={r1} fill="none" stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.4} />
          <circle cx={centerX} cy={centerY} r={r2} fill="none" stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.4} />

          {/* Core Client Node */}
          <circle cx={centerX} cy={centerY} r={28} fill="#3b82f6" />
          <text x={centerX} y={centerY + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
            Cliente {clienteId}
          </text>

          {/* Orbit 1: Historial Nodes */}
          {histList.map((prod, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, histList.length);
            const x = centerX + r1 * Math.cos(angle);
            const y = centerY + r1 * Math.sin(angle);
            return (
              <g key={`hist-${i}`}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="#9ca3af" strokeWidth="1" />
                <circle cx={x} cy={y} r={14} fill="#22c55e" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                  {prod.substring(0, 7)}
                </text>
              </g>
            );
          })}

          {/* Orbit 2: Recommendation Nodes */}
          {recList.map((rec, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, recList.length) + 0.4;
            const x = centerX + r2 * Math.cos(angle);
            const y = centerY + r2 * Math.sin(angle);
            return (
              <g key={`rec-${i}`}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="#f97316" strokeDasharray="2 2" strokeWidth="1.5" />
                <circle cx={x} cy={y} r={16} fill="#f97316" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                  {rec.producto.substring(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
