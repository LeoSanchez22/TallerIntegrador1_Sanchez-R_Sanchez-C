'use client'

import { useState } from 'react';
import { RiRefreshLine, RiExternalLinkLine } from 'react-icons/ri';

export default function NotebookPage() {
  const [iframeKey, setIframeKey] = useState(0);
  const notebookUrl = "/jupyter/notebooks/pipeline_recomendaciones_mvp.ipynb?token=DiegoLeoSophia123";

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
      {/* Top Header Control Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50">
        <div>
          <h2 className="text-lg font-black text-neutral-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Notebook MVP - Entorno Interactivo
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Ejecuta celda por celda el pipeline desde tu Jupyter Server local.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <RiRefreshLine className="w-4 h-4" />
            Recargar
          </button>
          <a
            href={notebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20"
          >
            <RiExternalLinkLine className="w-4 h-4" />
            Abrir en nueva pestaña
          </a>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 w-full bg-neutral-100 dark:bg-neutral-950 relative">
        <div className="absolute inset-0 flex items-center justify-center text-neutral-400 pointer-events-none">
          <p className="text-sm font-medium">Cargando entorno interactivo Jupyter...</p>
        </div>
        <iframe
          key={iframeKey}
          src={notebookUrl}
          className="relative z-10 w-full h-full border-0"
          title="Jupyter Notebook"
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
