import { create } from 'zustand'
import type { Hub, Zone, Channel } from '@nexora/types'

export interface VoiceParticipant {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isSpeaking: boolean
}

interface HubStore {
  // Current hub
  activeHubId: string | null
  activeChannelId: string | null
  hub: Hub | null
  zones: Zone[]
  channels: Channel[]

  // Joined hubs list (for Space Rail)
  joinedHubs: Hub[]

  // Collapsed zones
  collapsedZones: Set<string>

  // Voice channel participants (channelId → participants)
  voiceParticipants: Record<string, VoiceParticipant[]>

  setActiveHub: (hub: Hub, zones: Zone[], channels: Channel[]) => void
  setActiveChannel: (channelId: string) => void
  setJoinedHubs: (hubs: Hub[]) => void
  toggleZone: (zoneId: string) => void
  updateHub: (partial: Partial<Hub>) => void
  addChannel: (channel: Channel) => void
  removeChannel: (channelId: string) => void
  addZone: (zone: Zone) => void
  clear: () => void

  setVoiceParticipants: (channelId: string, participants: VoiceParticipant[]) => void
  addVoiceParticipant: (channelId: string, participant: VoiceParticipant) => void
  removeVoiceParticipant: (channelId: string, userId: string) => void
  clearVoiceParticipants: () => void
}

export const useHubStore = create<HubStore>((set) => ({
  activeHubId: null,
  activeChannelId: null,
  hub: null,
  zones: [],
  channels: [],
  joinedHubs: [],
  collapsedZones: new Set(),
  voiceParticipants: {},

  setActiveHub: (hub, zones, channels) =>
    set({ hub, zones, channels, activeHubId: hub.id }),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  setJoinedHubs: (hubs) => set({ joinedHubs: hubs }),

  toggleZone: (zoneId) =>
    set((state) => {
      const next = new Set(state.collapsedZones)
      if (next.has(zoneId)) {
        next.delete(zoneId)
      } else {
        next.add(zoneId)
      }
      return { collapsedZones: next }
    }),

  updateHub: (partial) =>
    set((state) => ({
      hub: state.hub ? { ...state.hub, ...partial } : null,
    })),

  addChannel: (channel) =>
    set((state) => ({ channels: [...state.channels, channel] })),

  removeChannel: (channelId) =>
    set((state) => ({ channels: state.channels.filter((c) => c.id !== channelId) })),

  addZone: (zone) =>
    set((state) => ({ zones: [...state.zones, zone] })),

  clear: () =>
    set({
      activeHubId: null,
      activeChannelId: null,
      hub: null,
      zones: [],
      channels: [],
    }),

  setVoiceParticipants: (channelId, participants) =>
    set((state) => ({
      voiceParticipants: { ...state.voiceParticipants, [channelId]: participants },
    })),

  addVoiceParticipant: (channelId, participant) =>
    set((state) => {
      const existing = state.voiceParticipants[channelId] ?? []
      // Replace if already present (re-join), otherwise append
      const filtered = existing.filter((p) => p.userId !== participant.userId)
      return {
        voiceParticipants: { ...state.voiceParticipants, [channelId]: [...filtered, participant] },
      }
    }),

  removeVoiceParticipant: (channelId, userId) =>
    set((state) => {
      const existing = state.voiceParticipants[channelId] ?? []
      return {
        voiceParticipants: {
          ...state.voiceParticipants,
          [channelId]: existing.filter((p) => p.userId !== userId),
        },
      }
    }),

  clearVoiceParticipants: () => set({ voiceParticipants: {} }),
}))
