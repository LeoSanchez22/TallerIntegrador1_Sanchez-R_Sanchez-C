'use client'

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface MarketGapItem {
  producto: string;
  penetracion: number;
  estado: string;
}

interface MarketGapChartProps {
  data: MarketGapItem[];
  clienteId: number;
}

export default function MarketGapChart({ data, clienteId }: MarketGapChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Análisis de Brechas: Cliente vs. Mercado Nacional
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Compara la penetración de los fármacos a nivel nacional frente al catálogo actual del Cliente {clienteId}.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
            <XAxis type="number" unit="%" stroke="#888888" fontSize={12} />
            <YAxis type="category" dataKey="producto" stroke="#888888" fontSize={11} width={100} />
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
                  fill={entry.estado.includes('Ya lo consume') ? '#10b981' : '#f97316'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 pt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-neutral-600 dark:text-neutral-400 font-medium">Ya lo consume (Catálogo Cubierto)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-neutral-600 dark:text-neutral-400 font-medium">Oportunidad Causal (Brecha a cerrar)</span>
        </div>
      </div>
    </div>
  );
}
