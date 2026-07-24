'use client'

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface MarketGapItem {
  producto: string;
  penetracion: number;
  estado: string;
}

interface AnalisisBrechasProps {
  data: MarketGapItem[];
  clienteId: number;
}

export default function AnalisisBrechas({ data, clienteId }: AnalisisBrechasProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
          Análisis de Brechas: Cliente vs. Mercado Nacional
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Este gráfico responde a la pregunta fundamental: ¿Qué está comprando el resto del país que este cliente no? Compara la penetración de los fármacos a nivel nacional frente al catálogo actual del cliente, revelando los 'vacíos' comerciales (barras naranjas) que el algoritmo Apriori intenta llenar mediante sus reglas de asociación.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
            <XAxis type="number" unit="%" stroke="#888888" fontSize={11} />
            <YAxis type="category" dataKey="producto" stroke="#888888" fontSize={10} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#333333',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Bar dataKey="penetracion" name="Penetración Nacional (%)" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.estado.includes('Ya lo consume') ? '#2e7d32' : '#f27a54'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#2e7d32]" />
          <span className="text-neutral-600 dark:text-neutral-400">✅ Ya lo consume</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#f27a54]" />
          <span className="text-neutral-600 dark:text-neutral-400">🎯 Oportunidad Causal</span>
        </div>
      </div>
    </div>
  );
}
