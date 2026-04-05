'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { Badge } from '@nexora/ui/badge'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'

interface Role {
  id: string
  name: string
  color: string | null
  position: number
  isDefault: boolean
  permissions: number
}

function EditRoleRow({ role, hubId, onDone }: { role: Role; hubId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(role.name)
  const [color, setColor] = useState(role.color ?? '#99aab5')

  const mutation = useMutation({
    mutationFn: () => api.patch(`/hubs/${hubId}/roles/${role.id}`, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      notify.success('Role updated')
      onDone()
    },
    onError: () => notify.error('Failed to update role'),
  })

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-[var(--surface-panel)] border border-[var(--accent-primary)] rounded-[var(--radius-md)]">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-7 w-10 cursor-pointer rounded border border-[var(--border-default)] bg-transparent shrink-0"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none border-b border-[var(--border-default)] focus:border-[var(--accent-primary)]"
        autoFocus
      />
      <button
        onClick={() => mutation.mutate()}
        className="p-1 rounded text-[var(--functional-success)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={onDone}
        className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function RolesTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['roles', hubId],
    queryFn: () => api.get<{ roles: Role[] }>(`/hubs/${hubId}/roles`).then((r) => r.data.roles),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<Role>(`/hubs/${hubId}/roles`, { name: 'New Role', color: '#99aab5' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      setEditingId(res.data.id)
      notify.success('Role created')
    },
    onError: () => notify.error('Failed to create role'),
  })

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/hubs/${hubId}/roles/${roleId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles', hubId] }),
    onError: () => notify.error('Failed to delete role'),
  })

  const roles = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">Roles</h2>
        <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Role
        </Button>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-4">
        Roles are shown from highest to lowest. Members are granted permissions of all their roles.
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-[var(--radius-md)] bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {roles.map((role) => (
            editingId === role.id ? (
              <EditRoleRow key={role.id} role={role} hubId={hubId} onDone={() => setEditingId(null)} />
            ) : (
              <div
                key={role.id}
                className="flex items-center gap-3 px-4 py-3 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] group"
              >
                <span
                  className="h-4 w-4 rounded-full shrink-0 border border-white/10"
                  style={{ backgroundColor: role.color ?? '#99aab5' }}
                />
                <span className="text-sm font-medium text-[var(--text-primary)] flex-1">{role.name}</span>
                {role.isDefault && <Badge variant="default" size="sm">Default</Badge>}
                <div className={cn('flex items-center gap-1', role.isDefault ? 'invisible' : 'opacity-0 group-hover:opacity-100 transition-opacity')}>
                  <button
                    onClick={() => setEditingId(role.id)}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    aria-label={`Edit ${role.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {!role.isDefault && (
                    <button
                      onClick={() => deleteMutation.mutate(role.id)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-colors"
                      aria-label={`Delete ${role.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          ))}
          {roles.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No roles yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
