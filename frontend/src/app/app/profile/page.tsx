'use client'

import ProfileDetails from "../../../components/ProfileDetails";
import NotificationPreferences from "../../../components/NotificationPreferences";
import SecuritySettings from "../../../components/SecuritySettings";

export default function Profile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Mi Perfil y Configuración</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Gestiona la información de tu cuenta y preferencias comerciales</p>
      </div>

      <ProfileDetails />
      <NotificationPreferences />
      <SecuritySettings />
    </div>
  );
}
