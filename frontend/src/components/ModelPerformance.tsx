'use client'

interface ModelPerformanceProps {
  modelSummary: any;
}

export default function ModelPerformance({ modelSummary }: ModelPerformanceProps) {
  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Model Performance Summary</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Key performance indicators for deployed models</p>
      </div>
      <div className="space-y-4">
        {/* NCF */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">NCF Model Accuracy</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">{modelSummary?.ncfAccuracy || 0}%</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-[#00B4D8]" style={{ width: `${modelSummary?.ncfAccuracy || 0}%` }}></div>
          </div>
        </div>

        {/* Attention-Gru */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">Attention-Gru Forecast Accuracy</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">{modelSummary?.attentionGruAccuracy || 0}%</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-[#00B4D8]" style={{ width: `${modelSummary?.attentionGruAccuracy || 0}%` }}></div>
          </div>
        </div>

        {/* Data Quality */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">Data Quality Score</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">{modelSummary?.dataQuality || 0}%</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-600" style={{ width: `${modelSummary?.dataQuality || 0}%` }}></div>
          </div>
        </div>

        {/* Training */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">Model Training Status</span>
            <span className="text-sm font-bold text-green-600">{modelSummary?.status || 'Loading...'}</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-600" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
