'use client'

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface HitRateChartProps {
  hitRateData: any[];
  hitVal: number;
}

export default function HitRateChart({ hitRateData, hitVal }: HitRateChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Hit Rate Analysis</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Percentage of successful recommendations accepted by clients</p>
      </div>
      <div className="flex items-center justify-center">
        {isClient && (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }} id="hitrate-chart">
              <Pie
                data={hitRateData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
              >
                {hitRateData.map((entry) => (
                  <Cell key={`hitrate-cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="text-center mt-4">
        <p className="text-4xl font-black text-[#00B4D8]">{hitVal}%</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Recommendations Accepted</p>
      </div>
    </div>
  );
}
