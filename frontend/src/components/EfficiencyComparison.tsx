'use client'

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EfficiencyComparisonProps {
  efficiencyData: any[];
}

export default function EfficiencyComparison({ efficiencyData }: EfficiencyComparisonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Toma de Decisiones Manual vs Impulsada por IA</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Análisis de impacto: Antes vs Después de implementación de IA (Evidencia Sprint 2)
        </p>
      </div>
      <div className="w-full overflow-hidden">
        {isClient && (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={efficiencyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              id="efficiency-chart"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
              <XAxis dataKey="category" stroke="#64748B" />
              <YAxis stroke="#64748B" domain={[0, 100]} />
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
              <Bar
                dataKey="manual"
                fill="#64748B"
                radius={[8, 8, 0, 0]}
                name="Decisiones Manuales %"
                isAnimationActive={false}
              />
              <Bar
                dataKey="ai"
                fill="#10B981"
                radius={[8, 8, 0, 0]}
                name="Eficiencia con IA %"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
