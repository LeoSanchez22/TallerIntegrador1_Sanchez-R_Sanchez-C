'use client'

import { RiNotification3Line } from "react-icons/ri";

export default function NotificationPreferences() {
  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all duration-200">
      <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <RiNotification3Line className="w-5 h-5 text-neutral-800 dark:text-white" />
          <h3 className="font-bold text-neutral-850 dark:text-white">Preferencias de Notificaciones</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-transparent">
          <div>
            <p className="font-bold text-neutral-800 dark:text-white">Alertas de Reentrenamiento</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Recibir avisos cuando se actualicen los modelos de IA</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-transparent">
          <div>
            <p className="font-bold text-neutral-800 dark:text-white">Riesgo de Quiebre de Stock</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Recibir alertas ante proyecciones críticas de inventario</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-transparent">
          <div>
            <p className="font-bold text-neutral-800 dark:text-white">Nuevas Oportunidades de Venta</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Notificaciones sobre recomendaciones de alta probabilidad</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-transparent">
          <div>
            <p className="font-bold text-neutral-800 dark:text-white">Reportes Semanales</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Resúmenes detallados de la exactitud y rendimiento general</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
