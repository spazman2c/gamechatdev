import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { useHubStore } from '@/store/hub'
import type { Hub, Zone, Channel } from '@nexora/types'

interface HubResponse {
  hub: Hub
  zones: Zone[]
  channels: Channel[]
}

export function useHub(hubId: string | null) {
  const { setActiveHub } = useHubStore()

  const query = useQuery({
    queryKey: ['hub', hubId],
    queryFn: async () => {
      const res = await api.get<HubResponse>(`/hubs/${hubId}`)
      return res.data
    },
    enabled: !!hubId,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) {
      setActiveHub(query.data.hub, query.data.zones, query.data.channels)
    }
  }, [query.data, setActiveHub])

  return query
}

export function useJoinedHubs() {
  const { setJoinedHubs } = useHubStore()

  const query = useQuery({
    queryKey: ['joined-hubs'],
    queryFn: async () => {
      const res = await api.get<{ hubs: Hub[] }>('/users/me/hubs')
      return res.data.hubs
    },
    staleTime: 30_000,
  })

  useEffect(() => {
    if (query.data) {
      setJoinedHubs(query.data)
    }
  }, [query.data, setJoinedHubs])

  return query
}
