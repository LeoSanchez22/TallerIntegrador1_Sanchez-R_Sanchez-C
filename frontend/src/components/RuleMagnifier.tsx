'use client'

import React from 'react';

interface RuleMagnifierProps {
  ancla: string;
  sugerencia: string;
  lift: string | number;
  confianza: string | number;
  motor: string;
}

export default function RuleMagnifier({ ancla, sugerencia, lift, confianza, motor }: RuleMagnifierProps) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-lg">
          ANCLA: {ancla}
        </div>
        <span className="text-neutral-400 font-bold">---&gt;</span>
        <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-lg">
          SUGERENCIA: {sugerencia}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex flex-col text-right">
          <span className="text-neutral-400 font-semibold uppercase">Lift</span>
          <span className="font-extrabold text-neutral-900 dark:text-white">{lift}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-neutral-400 font-semibold uppercase">Confianza</span>
          <span className="font-extrabold text-emerald-500">{confianza}%</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-neutral-400 font-semibold uppercase">Motor</span>
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{motor}</span>
        </div>
      </div>
    </div>
  );
}
