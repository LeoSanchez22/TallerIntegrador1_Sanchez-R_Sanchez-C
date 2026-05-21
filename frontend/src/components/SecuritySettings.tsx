'use client'

import { RiShieldKeyholeLine, RiKey2Line } from "react-icons/ri";

export default function SecuritySettings() {
  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all duration-200">
      <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <RiShieldKeyholeLine className="w-5 h-5 text-neutral-800 dark:text-white" />
          <h3 className="font-bold text-neutral-850 dark:text-white">Seguridad y Acceso</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900/40 transition-colors border border-neutral-200 dark:border-neutral-800 cursor-pointer">
          <div className="flex items-center gap-3">
            <RiKey2Line className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            <div>
              <p className="font-bold text-neutral-800 dark:text-white">Cambiar Contraseña</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Actualizada hace 3 meses</p>
            </div>
          </div>
          <button className="px-4 py-2 text-[#00B4D8] hover:text-[#0096C7] font-bold text-sm">
            Actualizar
          </button>
        </div>
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div>
            <p className="font-bold text-neutral-800 dark:text-white">Doble Factor de Autenticación (2FA)</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Agrega una capa adicional de protección</p>
          </div>
          <button className="px-4 py-2 bg-neutral-900 dark:bg-[#1A365D] hover:bg-neutral-800 dark:hover:bg-[#2D4A73] text-white rounded-lg transition-colors font-bold text-sm">
            Activar
          </button>
        </div>
      </div>
    </div>
  );
}
