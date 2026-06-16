'use client'

import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../../../lib/apiClient'
import { supabase } from '../../../lib/supabase'
import { RiUserAddLine, RiUserSettingsLine, RiDeleteBin7Line, RiRefreshLine, RiMailLine, RiBriefcaseLine, RiLockPasswordLine, RiUserLine, RiBuildingLine, RiShieldUserLine, RiCheckDoubleLine } from 'react-icons/ri'

interface UserItem {
  id: string
  email: string
  created_at: string
  deleted_at: string | null
  name: string
  role: string
  company: string
}

export default function UserManagement() {
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [checkingRole, setCheckingRole] = useState(true)
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // CRUD Form States
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    name: '',
    role: 'executive',
    company: 'Laboratorios Sophia S.A.'
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Verify Role and Fetch Data
  useEffect(() => {
    let mounted = true
    const initPage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && mounted) {
          setSessionUser(session.user)
          if (session.user?.user_metadata?.role === 'admin') {
            await fetchUsers()
          }
        }
      } catch (err) {
        console.error('Error verifying admin session:', err)
      } finally {
        if (mounted) setCheckingRole(false)
      }
    }
    initPage()

    // Suscripción reactiva a cambios de sesión (para sync inmediato si el layout refresca el rol)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (session) {
        setSessionUser(session.user)
        if (session.user?.user_metadata?.role === 'admin') {
          fetchUsers()
        }
      } else {
        setSessionUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/users')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUsers(data.data || [])
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la lista de representantes.')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setFormData({
      id: '',
      email: '',
      password: '',
      name: '',
      role: 'executive',
      company: 'Laboratorios Sophia S.A.'
    })
    setFormError(null)
    setFormSuccess(null)
    setShowModal('create')
  }

  const openEditModal = (user: UserItem) => {
    setFormData({
      id: user.id,
      email: user.email,
      password: '', // Leave empty to keep unchanged
      name: user.name,
      role: user.role || 'executive',
      company: user.company || 'Laboratorios Sophia S.A.'
    })
    setFormError(null)
    setFormSuccess(null)
    setShowModal('edit')
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      if (showModal === 'create') {
        const res = await fetchWithAuth('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'No se pudo crear la cuenta.')
        }
        setFormSuccess('Usuario creado y activado con éxito.')
        setTimeout(() => setShowModal(null), 1500)
      } else if (showModal === 'edit') {
        const res = await fetchWithAuth(`/api/users/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            role: formData.role,
            company: formData.company,
            password: formData.password || undefined
          })
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'No se pudo actualizar la cuenta.')
        }
        setFormSuccess('Usuario actualizado con éxito.')
        
        // Si el administrador se editó a sí mismo, refrescar la sesión del cliente inmediatamente
        const isEditingSelf = formData.id === sessionUser?.id
        if (isEditingSelf) {
          console.log('[USER MGMT] El administrador se editó a sí mismo. Refrescando sesión local...');
          await supabase.auth.refreshSession()
        }

        setTimeout(() => setShowModal(null), 1500)
      }
      await fetchUsers()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleSoftDelete = async (userId: string, isDeleted: boolean) => {
    if (!window.confirm(isDeleted ? '¿Deseas reactivar esta cuenta de representante?' : '¿Deseas inhabilitar (borrado lógico) esta cuenta? El representante no podrá iniciar sesión.')) {
      return
    }

    try {
      const url = `/api/users/${userId}${isDeleted ? '?restore=true' : ''}`
      const res = await fetchWithAuth(url, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al modificar estado del usuario.')
      }
      await fetchUsers()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Guards against unauthorized access
  if (checkingRole) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (sessionUser?.user_metadata?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 bg-red-950/10 border border-red-900/30 rounded-3xl animate-fadeIn">
        <RiShieldUserLine className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">Acceso Denegado</h2>
        <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
          Esta sección está restringida únicamente para administradores del sistema. Para probar esta vista, cambia tu rol en Supabase Auth metadata a <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-white text-xs font-mono">admin</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase">
            Administración de Representantes
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona accesos, cargos y estados lógicos de cuentas corporativas.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchUsers}
            className="p-3 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-850 rounded-xl transition-all text-neutral-600 dark:text-neutral-350"
            title="Refrescar lista"
          >
            <RiRefreshLine className="w-5 h-5" />
          </button>
          <button
            onClick={openCreateModal}
            className="flex-1 md:flex-none py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
          >
            <RiUserAddLine className="w-4 h-4 text-neutral-950" />
            Nuevo Representante
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm font-semibold">
          Error: {error}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800/80 shadow-2xl rounded-3xl overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto md:table-fixed">
              <thead>
                <tr className="bg-neutral-55 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Representante</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Correo</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/5">Rol / Cargo</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/6">Estado</th>
                  <th className="p-4 text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase text-center w-1/6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
                {users.map((u) => {
                  const isDeleted = u.deleted_at !== null
                  return (
                    <tr key={u.id} className={`hover:bg-neutral-100/30 dark:hover:bg-neutral-900/30 transition-colors ${isDeleted ? 'opacity-50' : ''}`}>
                      <td className="p-4 font-bold text-neutral-900 dark:text-white text-sm break-words">
                        {u.name || 'Sin Nombre'}
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-350 text-sm break-words">
                        {u.email}
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-black uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm inline-block">
                          {u.role || 'representative'}
                        </span>
                      </td>
                      <td className="p-4">
                        {isDeleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Inhabilitado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all"
                            title="Editar cuenta"
                          >
                            <RiUserSettingsLine className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleToggleSoftDelete(u.id, isDeleted)}
                            className={`p-2 rounded-lg transition-all ${
                              isDeleted
                                ? 'text-emerald-500 hover:bg-emerald-500/10'
                                : 'text-red-500 hover:bg-red-500/10'
                            }`}
                            title={isDeleted ? 'Habilitar representante' : 'Inhabilitar representante'}
                          >
                            {isDeleted ? (
                              <RiCheckDoubleLine className="w-5 h-5" />
                            ) : (
                              <RiDeleteBin7Line className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-neutral-500 dark:text-neutral-400 font-medium">
                      No se encontraron cuentas de representantes registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(null)}></div>
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl overflow-hidden p-8 animate-scaleIn">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase mb-6 flex items-center gap-2">
              {showModal === 'create' ? <RiUserAddLine className="text-emerald-500" /> : <RiUserSettingsLine className="text-emerald-500" />}
              {showModal === 'create' ? 'Nuevo Representante' : 'Editar Representante'}
            </h2>

            {formSuccess && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-semibold">
                {formSuccess}
              </div>
            )}

            {formError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">Nombre Completo *</label>
                <div className="relative">
                  <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Dr. Alejandro Gómez"
                    className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm transition-all"
                  />
                </div>
              </div>

              {showModal === 'create' && (
                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">Correo Electrónico *</label>
                  <div className="relative">
                    <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ejemplo@sophiasciences.com"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">
                  {showModal === 'create' ? 'Contraseña *' : 'Cambiar Contraseña (opcional)'}
                </label>
                <div className="relative">
                  <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                  <input
                    type="password"
                    required={showModal === 'create'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={showModal === 'create' ? '••••••••' : 'Dejar en blanco para no cambiar'}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">Cargo / Rol *</label>
                  <div className="relative">
                    <RiBriefcaseLine className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="appearance-none w-full pl-12 pr-8 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white text-sm transition-all cursor-pointer"
                    >
                      <option value="executive">Ejecutivo Comercial</option>
                      <option value="sales-manager">Gerente de Ventas</option>
                      <option value="data-analyst">Analista de Datos</option>
                      <option value="operations">Director Operaciones</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">Nombre Empresa *</label>
                  <div className="relative">
                    <RiBuildingLine className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Laboratorios Sophia"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-500 text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="flex-1 py-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-250 dark:hover:bg-neutral-700 text-neutral-750 dark:text-neutral-200 font-bold rounded-xl text-sm transition-all uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-sm transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {formLoading && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-neutral-950"></div>}
                  {showModal === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
