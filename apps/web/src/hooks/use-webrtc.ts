'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/hooks/use-socket'

export interface RoomParticipant {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  stream: MediaStream | null
  isSpeaking: boolean
  isMuted: boolean   // their mic is muted from our perspective
  hasVideo: boolean
  isScreenSharing: boolean
}

interface UseWebRTCOptions {
  channelId: string | null
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null
  screenStream: MediaStream | null
  participants: RoomParticipant[]
  isMuted: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  isConnecting: boolean
  error: string | null
  toggleMic: () => void
  toggleCamera: () => void
  toggleScreenShare: () => Promise<void>
  leave: () => void
}

// AudioContext is shared across the hook instance
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}

export function useWebRTC({ channelId }: UseWebRTCOptions): UseWebRTCReturn {
  // The global socket is created eagerly by AppShellInner via useSocket().
  // We access it directly with getSocket() to avoid subscribing to accessToken
  // changes (which would cause spurious effect re-runs that emit room:leave).
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Map of peerId → RTCPeerConnection
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  // Map of peerId → ICE candidate queue (candidates that arrived before remote description was set)
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ])
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // Speaking detection per peer
  const speakingIntervals = useRef<Map<string, number>>(new Map())

  // ── Speaking detection ─────────────────────────────────────────────
  function startSpeakingDetection(peerId: string, stream: MediaStream) {
    try {
      const ctx = getAudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      let speaking = false

      const intervalId = window.setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const nowSpeaking = avg > 10

        if (nowSpeaking !== speaking) {
          speaking = nowSpeaking
          setParticipants((prev) =>
            prev.map((p) =>
              p.userId === peerId ? { ...p, isSpeaking: speaking } : p,
            ),
          )
        }
      }, 100)

      speakingIntervals.current.set(peerId, intervalId)
    } catch {
      // AudioContext may be unavailable in some environments
    }
  }

  function stopSpeakingDetection(peerId: string) {
    const id = speakingIntervals.current.get(peerId)
    if (id !== undefined) {
      clearInterval(id)
      speakingIntervals.current.delete(peerId)
    }
  }

  // ── Peer connection factory ────────────────────────────────────────
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })

      // Add local tracks to this connection
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current)
        }
      }

      // ICE candidate → send to peer via signaling
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          const socket = getSocket()
          socket?.emit('webrtc:ice', { to: peerId, candidate: candidate.toJSON() })
        }
      }

      // Remote track arrived → update participant stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) { return }

        setParticipants((prev) =>
          prev.map((p) => {
            if (p.userId !== peerId) { return p }
            const hasVideo = remoteStream.getVideoTracks().length > 0
            return { ...p, stream: remoteStream, hasVideo }
          }),
        )

        // Start speaking detection on audio stream
        if (remoteStream.getAudioTracks().length > 0) {
          stopSpeakingDetection(peerId)
          startSpeakingDetection(peerId, remoteStream)
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeerConnection(peerId)
        }
      }

      peerConnections.current.set(peerId, pc)
      return pc
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  function closePeerConnection(peerId: string) {
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      pc.close()
      peerConnections.current.delete(peerId)
    }
    stopSpeakingDetection(peerId)
    pendingCandidates.current.delete(peerId)
    setParticipants((prev) => prev.filter((p) => p.userId !== peerId))
  }

  // ── Initiate offer to a new peer (we join after them) ─────────────
  const initiateOffer = useCallback(
    async (peerId: string) => {
      const pc = createPeerConnection(peerId)
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      await pc.setLocalDescription(offer)

      const socket = getSocket()
      socket?.emit('webrtc:offer', { to: peerId, offer })
    },
    [createPeerConnection],
  )

  // ── Main setup effect ──────────────────────────────────────────────
  useEffect(() => {
    if (!channelId) { setIsConnecting(false); return }

    let mounted = true
    const socket = getSocket()
    if (!socket) { return }

    setIsConnecting(true)

    async function init() {
      try {
        // 1. Verify membership + fetch ICE config
        const { data } = await api.post<{ channelId: string; iceServers: RTCIceServer[] }>(
          '/voice/join',
          { channelId },
        )
        if (!mounted) { return }
        iceServersRef.current = data.iceServers

        // 2. Get microphone (camera off by default)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        setLocalStream(stream)

        // 3. Join the Socket.io signaling room
        socket!.emit('room:join', { channelId })

        setIsConnecting(false)
      } catch (err) {
        if (!mounted) { return }
        const msg = err instanceof Error ? err.message : 'Failed to join room'
        setError(msg)
        setIsConnecting(false)
      }
    }

    // ── Socket event handlers ──────────────────────────────────────

    // Server sends current participants when we join
    const onParticipants = async ({
      participants: peers,
    }: {
      channelId: string
      participants: Omit<RoomParticipant, 'stream' | 'isSpeaking' | 'isMuted' | 'hasVideo' | 'isScreenSharing'>[]
    }) => {
      if (!mounted) { return }

      // Add all existing peers to state (stream arrives after negotiation)
      setParticipants(
        peers.map((p) => ({
          ...p,
          stream: null,
          isSpeaking: false,
          isMuted: false,
          hasVideo: false,
          isScreenSharing: false,
        })),
      )

      // We are the new joiner — send offers to all existing peers
      for (const peer of peers) {
        await initiateOffer(peer.userId)
      }
    }

    // A new peer joined after us — they will send us an offer
    const onPeerJoined = ({
      participant,
    }: {
      channelId: string
      participant: Omit<RoomParticipant, 'stream' | 'isSpeaking' | 'isMuted' | 'hasVideo' | 'isScreenSharing'>
    }) => {
      if (!mounted) { return }
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === participant.userId)) { return prev }
        return [
          ...prev,
          { ...participant, stream: null, isSpeaking: false, isMuted: false, hasVideo: false, isScreenSharing: false },
        ]
      })
      // Don't create a PC yet — wait for their offer
    }

    const onPeerLeft = ({ userId: peerId }: { channelId: string; userId: string }) => {
      if (!mounted) { return }
      closePeerConnection(peerId)
    }

    // Received an offer from a peer → answer it
    const onOffer = async ({
      from,
      offer,
    }: {
      from: string
      offer: RTCSessionDescriptionInit
    }) => {
      if (!mounted) { return }
      let pc = peerConnections.current.get(from)
      if (!pc) {
        pc = createPeerConnection(from)
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      // Flush queued ICE candidates
      const queued = pendingCandidates.current.get(from) ?? []
      for (const c of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(c))
      }
      pendingCandidates.current.delete(from)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket!.emit('webrtc:answer', { to: from, answer })
    }

    // Received an answer to our offer
    const onAnswer = async ({
      from,
      answer,
    }: {
      from: string
      answer: RTCSessionDescriptionInit
    }) => {
      if (!mounted) { return }
      const pc = peerConnections.current.get(from)
      if (!pc) { return }

      await pc.setRemoteDescription(new RTCSessionDescription(answer))

      // Flush queued ICE candidates
      const queued = pendingCandidates.current.get(from) ?? []
      for (const c of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(c))
      }
      pendingCandidates.current.delete(from)
    }

    // Received an ICE candidate from a peer
    const onIce = async ({
      from,
      candidate,
    }: {
      from: string
      candidate: RTCIceCandidateInit
    }) => {
      if (!mounted) { return }
      const pc = peerConnections.current.get(from)

      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        // Queue until remote description is set
        const queue = pendingCandidates.current.get(from) ?? []
        queue.push(candidate)
        pendingCandidates.current.set(from, queue)
      }
    }

    socket.on('room:participants', onParticipants)
    socket.on('room:peer-joined', onPeerJoined)
    socket.on('room:peer-left', onPeerLeft)
    socket.on('webrtc:offer', onOffer)
    socket.on('webrtc:answer', onAnswer)
    socket.on('webrtc:ice', onIce)

    init()

    return () => {
      mounted = false

      // Leave the signaling room
      socket.emit('room:leave', { channelId })

      // Cleanup all peer connections
      for (const [peerId, pc] of peerConnections.current) {
        pc.close()
        stopSpeakingDetection(peerId)
      }
      peerConnections.current.clear()
      pendingCandidates.current.clear()

      // Stop local media
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())

      // Remove listeners
      socket.off('room:participants', onParticipants)
      socket.off('room:peer-joined', onPeerJoined)
      socket.off('room:peer-left', onPeerLeft)
      socket.off('webrtc:offer', onOffer)
      socket.off('webrtc:answer', onAnswer)
      socket.off('webrtc:ice', onIce)
    }
  }, [channelId, initiateOffer, createPeerConnection]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ───────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) { return }
    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) { return }
    audioTrack.enabled = !audioTrack.enabled
    setIsMuted(!audioTrack.enabled)
  }, [])

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current
    if (!stream) { return }

    const existingVideo = stream.getVideoTracks()[0]
    if (existingVideo) {
      existingVideo.enabled = !existingVideo.enabled
      setIsCameraOn(existingVideo.enabled)
      // Replace track in all peer connections
      for (const pc of peerConnections.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) { await sender.replaceTrack(existingVideo.enabled ? existingVideo : null) }
      }
    } else {
      // First time — acquire camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const videoTrack = camStream.getVideoTracks()[0]
        if (!videoTrack) { return }
        stream.addTrack(videoTrack)
        localStreamRef.current = stream
        setLocalStream(new MediaStream(stream.getTracks()))
        setIsCameraOn(true)

        // Add to all peer connections and renegotiate so remote peers receive the video track
        for (const [peerId, pc] of peerConnections.current.entries()) {
          pc.addTrack(videoTrack, stream)
          try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            getSocket()?.emit('webrtc:offer', { to: peerId, offer })
          } catch { /* peer disconnected */ }
        }
      } catch {
        // User denied camera
      }
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      setScreenStream(null)
      setIsScreenSharing(false)

      // Remove screen share track from peer connections; restore camera if on
      for (const pc of peerConnections.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) {
          const camTrack = localStreamRef.current?.getVideoTracks()[0] ?? null
          await sender.replaceTrack(camTrack)
        }
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false,
        })
        screenStreamRef.current = screen
        setScreenStream(screen)
        setIsScreenSharing(true)

        const screenTrack = screen.getVideoTracks()[0]!

        // Replace video track in all peer connections; renegotiate if no sender existed yet
        for (const [peerId, pc] of peerConnections.current.entries()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) {
            await sender.replaceTrack(screenTrack)
          } else {
            pc.addTrack(screenTrack, screen)
            try {
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              getSocket()?.emit('webrtc:offer', { to: peerId, offer })
            } catch { /* peer disconnected */ }
          }
        }

        // Auto-stop when user clicks browser's "stop sharing" button
        screenTrack.onended = () => {
          setIsScreenSharing(false)
          setScreenStream(null)
          screenStreamRef.current = null
        }
      } catch {
        // User cancelled or denied
      }
    }
  }, [isScreenSharing])

  const leave = useCallback(() => {
    const socket = getSocket()
    socket?.emit('room:leave', { channelId })

    for (const [peerId, pc] of peerConnections.current) {
      pc.close()
      stopSpeakingDetection(peerId)
    }
    peerConnections.current.clear()

    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())

    setLocalStream(null)
    setScreenStream(null)
    setParticipants([])
  }, [channelId])

  return {
    localStream,
    screenStream,
    participants,
    isMuted,
    isCameraOn,
    isScreenSharing,
    isConnecting,
    error,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leave,
  }
}
