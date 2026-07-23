'use client'

import React from 'react';

export default function AlgorithmicFunnel() {
  const pasos = [
    { num: '1', titulo: 'Base de Datos Nacional', desc: 'Facturas e historial acumulado B2B' },
    { num: '2', titulo: 'Universo Apriori', desc: 'Data Mining de reglas Apriori' },
    { num: '3', titulo: 'Filtro de Perfil', desc: 'Cruze con historial y detonantes del cliente' },
    { num: '4', titulo: 'Cross-Selling Táctico', desc: 'Productos finales sugeridos sin canibalización' }
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Arquitectura del Motor B2B (Embudo Algorítmico)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Flujo de procesamiento en 4 etapas: Extracción, Filtrado de Perfil y Aplicación de Reglas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
        {pasos.map((paso) => (
          <div key={paso.num} className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center">
                {paso.num}
              </span>
            </div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{paso.titulo}</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{paso.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
