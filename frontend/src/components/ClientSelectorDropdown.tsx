'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, MapPin, Hospital, Check } from 'lucide-react';

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
  const [isZonaOpen, setIsZonaOpen] = useState(false);
  const [isClienteOpen, setIsClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');

  const zonaRef = useRef<HTMLDivElement>(null);
  const clienteRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (zonaRef.current && !zonaRef.current.contains(event.target as Node)) {
        setIsZonaOpen(false);
      }
      if (clienteRef.current && !clienteRef.current.contains(event.target as Node)) {
        setIsClienteOpen(false);
        setClienteSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients dynamically based on search query
  const filteredClientes = clientes.filter(c => 
    c.name.toLowerCase().includes(clienteSearch.toLowerCase()) || 
    c.id.toString().includes(clienteSearch)
  );

  const currentCliente = clientes.find(c => c.id === selectedCliente);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      {/* 1. Selector de Zona Comercial Custom */}
      <div className="flex flex-col gap-2 relative w-full" ref={zonaRef}>
        <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-1">
          Zona Comercial
        </label>
        
        <button
          type="button"
          onClick={() => {
            setIsZonaOpen(!isZonaOpen);
            setIsClienteOpen(false);
          }}
          className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300/80 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 transition-all text-left shadow-sm min-h-[46px]"
        >
          <div className="flex items-center gap-2.5 truncate">
            <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="truncate">{selectedZona || 'Seleccionar Zona'}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isZonaOpen ? 'rotate-180' : ''}`} />
        </button>

        {isZonaOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] bg-white dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 py-2 max-h-60 overflow-y-auto custom-scrollbar animate-fadeIn">
            {zonas.map((zona) => (
              <button
                key={zona}
                type="button"
                onClick={() => {
                  onSelectZona(zona);
                  setIsZonaOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-left transition-colors ${
                  selectedZona === zona
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                }`}
              >
                <span>{zona}</span>
                {selectedZona === zona && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Selector de Institución / Clínica Custom */}
      <div className="flex flex-col gap-2 relative w-full" ref={clienteRef}>
        <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-1">
          Institución / Clínica
        </label>
        
        <button
          type="button"
          onClick={() => {
            setIsClienteOpen(!isClienteOpen);
            setIsZonaOpen(false);
            setClienteSearch('');
          }}
          className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300/80 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 transition-all text-left shadow-sm min-h-[46px]"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Hospital className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="truncate">
              {currentCliente ? `ID: ${currentCliente.id} - ${currentCliente.name}` : 'Seleccionar Cliente'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isClienteOpen ? 'rotate-180' : ''}`} />
        </button>

        {isClienteOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] bg-white dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-2 animate-fadeIn min-w-[280px]">
            {/* Search input field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                placeholder="Buscar por ID o nombre..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-350 dark:border-neutral-850 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto max-h-52 custom-scrollbar flex flex-col">
              {filteredClientes.length > 0 ? (
                filteredClientes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCliente(c.id);
                      setIsClienteOpen(false);
                      setClienteSearch('');
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                      selectedCliente === c.id
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <span className="truncate pr-2">ID: {c.id} - {c.name}</span>
                    {selectedCliente === c.id && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs font-bold text-neutral-400 dark:text-neutral-500">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
