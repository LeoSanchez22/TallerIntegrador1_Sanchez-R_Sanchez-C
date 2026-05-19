'use client'

interface DataQualityMetricsProps {
  dataQuality: any[];
}

export default function DataQualityMetrics({ dataQuality }: DataQualityMetricsProps) {
  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Métricas de Calidad (Data Quality)</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Evaluación del dataset de Supabase para inferencia de Machine Learning</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataQuality.map((item, index) => (
          <div key={index} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{item.metric}</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20">
                {item.status}
              </span>
            </div>
            <p className="text-4xl font-black text-neutral-900 dark:text-white mb-3">{item.score}<span className="text-xl text-neutral-500">%</span></p>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${item.score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
