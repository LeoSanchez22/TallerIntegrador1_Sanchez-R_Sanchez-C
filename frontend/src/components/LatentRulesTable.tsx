'use client'

import React from 'react';

interface LatentRuleItem {
  prioridad: string;
  regla: string;
  lift: number;
  confianza: number;
  soporte: number;
}

interface LatentRulesTableProps {
  data: LatentRuleItem[];
}

export default function LatentRulesTable({ data }: LatentRulesTableProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Auditoría de Oportunidades Secundarias (Reglas Latentes)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Reserva táctica de reglas de venta cruzada descubiertas por el motor pero no cotizadas en la propuesta activa.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 uppercase tracking-wider font-bold border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              <th className="p-3">Prioridad</th>
              <th className="p-3">Regla Algorítmica</th>
              <th className="p-3">Lift</th>
              <th className="p-3">Confianza</th>
              <th className="p-3">Soporte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{item.prioridad}</td>
                <td className="p-3 font-bold text-neutral-900 dark:text-white">{item.regla}</td>
                <td className="p-3 font-extrabold text-blue-500">{item.lift}</td>
                <td className="p-3 font-bold text-purple-500">{item.confianza}%</td>
                <td className="p-3 text-neutral-500">{item.soporte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
