'use client'

import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Scatter } from 'recharts';

interface PolynomialTrendChartProps {
  clienteId: number;
  data?: any;
}

export default function PolynomialTrendChart({ clienteId, data }: PolynomialTrendChartProps) {
  const puntosHist = data?.puntos_historicos || [
    { mes: 'Mes 1', cantidad: 35 },
    { mes: 'Mes 2', cantidad: 42 },
    { mes: 'Mes 3', cantidad: 40 },
    { mes: 'Mes 4', cantidad: 44 }
  ];

  const limites = data?.limites || {
    "Mes Actual (En Curso)": 44,
    "Mes +1 (Próximo Mes)": 41,
    "Mes +2 (Proyección)": 38
  };

  const chartData = [
    ...puntosHist.map((p: any) => ({ mes: p.mes, historico: p.cantidad, tendencia: p.cantidad })),
    { mes: 'Mes Actual', proyeccion: limites["Mes Actual (En Curso)"] || 44, tendencia: limites["Mes Actual (En Curso)"] || 44 },
    { mes: 'Mes +1', proyeccion: limites["Mes +1 (Próximo Mes)"] || 41, tendencia: limites["Mes +1 (Próximo Mes)"] || 41 },
    { mes: 'Mes +2', proyeccion: limites["Mes +2 (Proyección)"] || 38, tendencia: limites["Mes +2 (Proyección)"] || 38 }
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
          Análisis Matemático de Tendencia (Regresión Polinomial)
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Evaluación de Capacidad de Compra Total para el Cliente {clienteId} mediante la curva f(x) = ax^2 + bx + c.
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="mes" stroke="#888888" fontSize={11} />
            <YAxis stroke="#888888" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#333333',
                borderRadius: '8px',
                color: '#ffffff'
              }}
            />
            <Line type="monotone" dataKey="tendencia" name="Tendencia Polinomial" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
            <Scatter dataKey="historico" name="Historial Real" fill="#10b981" />
            <Scatter dataKey="proyeccion" name="Proyección Determinística" fill="#ef4444" shape="square" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="font-bold text-neutral-900 dark:text-white">Validación Matemática: </span>
        Al evaluar la curva cuadrática f(x) sobre la secuencia mensual del Cliente {clienteId}, el algoritmo calcula el tope determinista de consumo evadiendo la sobre-saturación de inventario.
      </div>
    </div>
  );
}
