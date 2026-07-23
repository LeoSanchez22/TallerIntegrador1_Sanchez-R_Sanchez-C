'use client'

import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid } from 'recharts';

interface AprioriRuleItem {
  antecedente: string;
  consecuente: string;
  soporte: number;
  confianza: number;
  lift: number;
  tipo: string;
}

interface AprioriMatrixChartProps {
  data: AprioriRuleItem[];
  clienteId: number;
}

export default function AprioriMatrixChart({ data, clienteId }: AprioriMatrixChartProps) {
  if (!data || data.length === 0) return null;

  const reglasMercado = data.filter((d) => d.tipo !== 'Recomendada');
  const reglasRecomendadas = data.filter((d) => d.tipo === 'Recomendada');

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Matriz Estadística de Reglas de Asociación (Apriori)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Universo de reglas cruzadas (Soporte vs. Confianza vs. Lift). Las estrellas rojas marcan las reglas activadas para el Cliente {clienteId}.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" dataKey="soporte" name="Soporte" stroke="#888888" fontSize={11} />
            <YAxis type="number" dataKey="confianza" name="Confianza (%)" stroke="#888888" fontSize={11} />
            <ZAxis type="number" dataKey="lift" range={[60, 400]} name="Lift" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#333333',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Scatter name="Reglas del Mercado" data={reglasMercado} fill="#9ca3af" opacity={0.4} />
            <Scatter name="Reglas Recomendadas" data={reglasRecomendadas} fill="#ef4444" shape="star" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
