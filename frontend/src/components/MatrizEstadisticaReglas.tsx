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

interface MatrizEstadisticaReglasProps {
  data: AprioriRuleItem[];
  clienteId: number;
}

export default function MatrizEstadisticaReglas({ data, clienteId }: MatrizEstadisticaReglasProps) {
  if (!data || data.length === 0) return null;

  const reglasMercado = data.filter((d) => d.tipo !== 'Recomendada');
  const reglasRecomendadas = data.filter((d) => d.tipo === 'Recomendada');

  return (
    <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
          Matriz Estadística de Reglas de Asociación (Apriori)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Este gráfico de dispersión (Bubble Chart) visualiza el universo completo de patrones de compra cruzada descubiertos a nivel nacional. Nos permite auditar visualmente las 3 métricas clave del algoritmo:
        </p>
        <ul className="text-xs text-neutral-500 dark:text-neutral-400 list-disc pl-5 mt-2 space-y-1">
          <li><strong>Eje X (Soporte):</strong> ¿Qué tan frecuente es esta combinación en todo el país? (Descartamos nichos muy raros).</li>
          <li><strong>Eje Y (Confianza):</strong> Si compran el Producto A, ¿cuál es la probabilidad matemática de que también lleven el B?</li>
          <li><strong>Tamaño del punto (Lift):</strong> La fuerza de la correlación. Un círculo más grande indica una dependencia comercial altísima (no es simple casualidad).</li>
        </ul>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          Los puntos resaltados en <strong>rojo</strong> representan las reglas específicas que el algoritmo activó para el portafolio de este cliente en particular.
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" dataKey="soporte" name="Soporte" stroke="#888888" fontSize={11} />
            <YAxis type="number" dataKey="confianza" name="Confianza (%)" stroke="#888888" fontSize={11} />
            <ZAxis type="number" dataKey="lift" range={[50, 400]} name="Lift" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#333333',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Scatter name="Universo Nacional de Reglas" data={reglasMercado} fill="#9ca3af" opacity={0.3} />
            <Scatter name="Reglas del Cliente" data={reglasRecomendadas} fill="#ef4444" shape="star" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
