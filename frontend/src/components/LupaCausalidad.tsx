'use client'

import React from 'react';

interface LupaCausalidadProps {
  ancla: string;
  sugerencia: string;
  lift: string | number;
  confianza: string | number;
  motor: string;
}

export default function LupaCausalidad({
  ancla,
  sugerencia,
  lift,
  confianza,
  motor
}: LupaCausalidadProps) {
  const isApriori = motor.includes('Apriori');

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Lupa de Causalidad (Transparencia del Algoritmo)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Este grafo aísla el ruido del perfil del cliente y muestra exclusivamente las conexiones matemáticas directas. Reemplaza la etiqueta genérica 'Regla' por las métricas reales calculadas por la Inteligencia Artificial, detallando exactamente qué evaluó el algoritmo para trazar la conexión.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black rounded-lg border border-emerald-500/20 text-xs">
          Ancla: {ancla}
        </div>
        <span className="text-neutral-400 font-black text-lg">--&gt;</span>
        <div className="px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 font-black rounded-lg border border-red-500/20 text-xs">
          Sugerencia: {sugerencia}
        </div>
      </div>

      <div className="text-xs space-y-3 leading-relaxed text-neutral-600 dark:text-neutral-400">
        <div>
          <span className="font-extrabold text-neutral-950 dark:text-white">Lift de {lift}: </span>
          {isApriori ? (
            `La presencia de ${ancla} en la canasta multiplica por ${lift} veces la probabilidad matemática de que compren ${sugerencia}.`
          ) : (
            `Afinidad clínica calculada mediante vectores TF-IDF entre el ancla y la sugerencia.`
          )}
        </div>
        <div>
          <span className="font-extrabold text-neutral-950 dark:text-white">Confianza del {confianza}%: </span>
          {isApriori ? (
            `Del total histórico de clínicas que compran ${ancla}, el ${confianza}% termina consolidando la compra conjunta con ${sugerencia}.`
          ) : (
            `Coincidencia en la composición terapéutica y formato del fármaco.`
          )}
        </div>
      </div>
    </div>
  );
}
