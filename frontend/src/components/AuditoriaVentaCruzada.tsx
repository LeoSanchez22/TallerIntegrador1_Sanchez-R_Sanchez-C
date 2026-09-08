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

interface AuditoriaVentaCruzadaProps {
  data: AprioriRuleItem[];
  clienteId: number;
}

export default function AuditoriaVentaCruzada({ data, clienteId }: AuditoriaVentaCruzadaProps) {
  if (!data || data.length === 0) return null;

  const universoNacional = data.filter((d) => d.tipo === 'Mercado');
  const reglasFinales = data.filter((d) => d.tipo === 'Recomendada');

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Auditoría de Venta Cruzada (Trazabilidad Apriori)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Este gráfico aísla y demuestra matemáticamente las reglas que justifican los productos finales recomendados al cliente en la cotización:
        </p>
        <ul className="text-xs text-neutral-500 dark:text-neutral-400 list-disc pl-5 mt-2 space-y-1">
          <li><strong>Gris:</strong> Universo completo de reglas del mercado nacional.</li>
          <li><strong>Coral:</strong> Reglas de Cross-Selling viables, pero descartadas o secundarias (Latentes).</li>
          <li><strong>Estrellas Rojas Numeradas:</strong> Las reglas exactas que el motor seleccionó para la cotización de este mes.</li>
        </ul>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" dataKey="soporte" name="Soporte" stroke="#888888" fontSize={11} />
            <YAxis type="number" dataKey="confianza" name="Confianza (%)" stroke="#888888" fontSize={11} />
            <ZAxis type="number" dataKey="lift" range={[60, 450]} name="Lift" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#333333',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Scatter name="Universo Nacional de Reglas" data={universoNacional} fill="#9ca3af" opacity={0.2} />
            <Scatter name="Reglas Finales" data={reglasFinales} fill="#ef4444" shape="star" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
