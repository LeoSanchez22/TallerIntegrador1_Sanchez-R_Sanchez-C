'use client'

import { useState, useMemo } from 'react';
import { RiTableLine, RiSearchLine } from "react-icons/ri";

interface TransactionTableProps {
  pipelineData: any;
  totalRows: number;
}

export default function TransactionTable({ pipelineData, totalRows }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado reactivo en tiempo real por Cliente ID, Zona Comercial y Producto (SKU)
  const filteredData = useMemo(() => {
    if (!pipelineData?.sample_data) return [];
    return pipelineData.sample_data.filter((row: any) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const matchClienteId = row.cliente_id?.toString().includes(term);
      const matchProducto = row.producto?.toLowerCase().includes(term);
      const matchZona = (row.zona || row.zona_comercial)?.toLowerCase().includes(term);

      return matchClienteId || matchProducto || matchZona;
    });
  }, [pipelineData?.sample_data, searchTerm]);

  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden transition-all duration-200">
      <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <RiTableLine className="w-5 h-5 text-emerald-500" />
          Muestra de Transacciones
        </h3>

        {/* Buscador Dinámico */}
        <div className="relative w-full md:w-80">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por Cliente ID, Zona o Producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-500 transition-colors"
          />
        </div>

        <span className="text-xs text-neutral-500">
          Mostrando {filteredData.length} de {totalRows.toLocaleString()}
        </span>
      </div>

      <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-55 dark:bg-neutral-900/80 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-black tracking-wider text-neutral-500 uppercase">ID Local</th>
              <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-black tracking-wider text-neutral-500 uppercase">Cliente ID</th>
              <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-black tracking-wider text-neutral-500 uppercase">Producto (SKU)</th>
              <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-black tracking-wider text-neutral-500 uppercase">Zona Comercial</th>
              <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-black tracking-wider text-neutral-500 uppercase text-right">Ingresos (S/)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/50 bg-white dark:bg-neutral-950/40">
            {filteredData.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors">
                <td className="p-4 text-sm text-neutral-500 dark:text-neutral-400 font-mono">{row.id}</td>
                <td className="p-4 text-sm font-bold text-neutral-900 dark:text-white">{row.cliente_id}</td>
                <td className="p-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{row.producto || 'N/A'}</td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md text-xs border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold">{row.zona || 'N/A'}</span>
                </td>
                <td className="p-4 text-sm text-neutral-900 dark:text-white font-bold text-right">
                  {(Number(row.ingresos) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-neutral-500 dark:text-neutral-400 font-medium bg-neutral-50/50 dark:bg-neutral-900/10">
                  No se encontraron transacciones que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
