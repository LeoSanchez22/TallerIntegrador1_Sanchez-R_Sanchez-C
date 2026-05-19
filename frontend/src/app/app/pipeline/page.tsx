'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RiRefreshLine, RiLoader4Line } from "react-icons/ri";
import PipelineStatus from "../../../components/PipelineStatus";
import TransactionTable from "../../../components/TransactionTable";
import DataQualityMetrics from "../../../components/DataQualityMetrics";

export default function DataPipeline() {
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPipeline = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    fetch('http://127.0.0.1:3005/api/pipeline', { signal })
      .then(res => res.json())
      .then(data => {
        setPipelineData(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPipeline(controller.signal);
    return () => controller.abort();
  }, [fetchPipeline]);

  const totalRows = pipelineData?.total_rows || 0;

  const dataQuality = useMemo(() => [
    { metric: "Completeness", score: 99.8, status: "excellent" },
    { metric: "Accuracy", score: 98.2, status: "excellent" },
    { metric: "Consistency", score: 95.5, status: "excellent" },
    { metric: "Timeliness", score: 100, status: "excellent" },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Flujo de Datos (Pipeline)</h1>
        </div>
        <button 
          onClick={() => fetchPipeline()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Supabase
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RiLoader4Line className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          <PipelineStatus totalRows={totalRows} />
          <TransactionTable pipelineData={pipelineData} totalRows={totalRows} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataQualityMetrics dataQuality={dataQuality} />
          </div>
        </>
      )}
    </div>
  );
}
