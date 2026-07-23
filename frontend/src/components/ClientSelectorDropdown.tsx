'use client'

import React from 'react';

interface ClientOption {
  id: number;
  name: string;
}

interface ClientSelectorDropdownProps {
  zonas: string[];
  selectedZona: string;
  onSelectZona: (zona: string) => void;
  clientes: ClientOption[];
  selectedCliente: number | null;
  onSelectCliente: (clienteId: number) => void;
}

export default function ClientSelectorDropdown({
  zonas,
  selectedZona,
  onSelectZona,
  clientes,
  selectedCliente,
  onSelectCliente
}: ClientSelectorDropdownProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      {/* 1. Selector de Zona Comercial */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Zona Comercial
        </label>
        <select
          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium cursor-pointer"
          value={selectedZona}
          onChange={(e) => onSelectZona(e.target.value)}
        >
          {zonas.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Selector de Institución / Clínica */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Institución / Clínica
        </label>
        <select
          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium cursor-pointer"
          value={selectedCliente || ''}
          onChange={(e) => onSelectCliente(Number(e.target.value))}
        >
          {clientes.length > 0 ? (
            clientes.map((c) => (
              <option key={c.id} value={c.id}>
                ID: {c.id} - {c.name}
              </option>
            ))
          ) : (
            <option value="">No hay clientes registrados en esta zona</option>
          )}
        </select>
      </div>
    </div>
  );
}
