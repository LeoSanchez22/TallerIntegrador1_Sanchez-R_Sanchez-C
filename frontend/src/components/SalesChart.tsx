'use client'

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SalesChartProps {
  chartData: any[];
  clientesActivos: number;
}

export default function SalesChart({ chartData, clientesActivos }: SalesChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Ventas Históricas vs Predicción LSTM</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Forecasting a 3 meses con predicciones de red neuronal basado en {clientesActivos} clientes</p>
      </div>
      {chartData && chartData.length > 0 ? (
        <div className="w-full overflow-hidden">
          {isClient && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                id="sales-chart"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(23, 23, 23, 0.95)",
                    border: "1px solid rgba(64, 64, 64, 0.3)",
                    borderRadius: "12px",
                    color: "#F5F5F5",
                    backdropFilter: "blur(8px)",
                  }}
                  itemStyle={{ color: "#F5F5F5" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Ventas Históricas (S/)"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#00B4D8"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name="Predicción LSTM (S/)"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className="flex justify-center items-center h-64 text-neutral-500 dark:text-neutral-400">
          No hay suficientes datos temporales para proyectar en esta zona.
        </div>
      )}
    </div>
  );
}
