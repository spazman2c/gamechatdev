# Nexora — Master Development Plan

> **Status:** Pre-development planning phase
> **Last Updated:** 2026-04-03
> **Working Directory:** C:/Projects/gamechat

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [Design System & Tokens](#3-design-system--tokens)
4. [Typography System](#4-typography-system)
5. [Color Palette — Complete Reference](#5-color-palette--complete-reference)
6. [Component Architecture](#6-component-architecture)
7. [Product Naming System](#7-product-naming-system)
8. [Feature Breakdown by Phase](#8-feature-breakdown-by-phase)
9. [Database Schema Design](#9-database-schema-design)
10. [API Architecture](#10-api-architecture)
11. [Real-Time Infrastructure](#11-real-time-infrastructure)
12. [Voice & Video Stack](#12-voice--video-stack)
13. [Authentication & Trust System](#13-authentication--trust-system)
14. [Atmosphere System](#14-atmosphere-system)
15. [Frontend Layout Architecture](#15-frontend-layout-architecture)
16. [Mobile Strategy](#16-mobile-strategy)
17. [Moderation System](#17-moderation-system)
18. [AI Features](#18-ai-features)
19. [Accessibility Requirements](#19-accessibility-requirements)
20. [Performance Targets](#20-performance-targets)
21. [Testing Strategy](#21-testing-strategy)
22. [Deployment & Infrastructure](#22-deployment--infrastructure)
23. [Phase Task Lists](#23-phase-task-lists)
24. [Open Questions & Decisions](#24-open-questions--decisions)

---

## 1. Project Overview

**Product Name:** Nexora
**Tagline:** Built for real connection. / Your people deserve a better home.
**Core Promise:** A calmer, more intentional platform for chat, voice, and video communities.

### What we're building

A full-stack real-time community platform. Think Discord as the nearest competitor but with:
- Superior atmosphere/theming per community
- Community-controlled modular trust system (not a single global identity wall)
- Smart catch-up summaries for busy channels
- Richer presence layers (not just online/away/offline)
- A calmer, more premium visual identity
- Proprietary naming language (Hubs, Zones, Streams, Rooms, Pulse, Aura)

### High-Level Architecture

```
Client (Web + Desktop + Mobile)
    ↓ REST + WebSocket + WebRTC
API Gateway / Load Balancer
    ↓
Microservices:
  - Auth Service
  - Hub/Community Service
  - Messaging Service
  - Voice/Video Service (WebRTC SFU)
  - Notification Service
  - AI/Summary Service
  - Media/CDN Service
    ↓
Data Layer:
  - PostgreSQL (primary relational data)
  - Redis (presence, caching, pub/sub)
  - S3-compatible object storage (media)
  - Elasticsearch (search)
```

---

## 2. Tech Stack Decision

### Frontend (Web)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR for landing/marketing, CSR for app shell |
| Language | **TypeScript** | Type safety critical at scale |
| Styling | **Tailwind CSS + CSS Variables** | Design token friendly, fast iteration |
| Component Library | **Custom (Radix UI primitives)** | Full control over Nexora visual identity |
| State Management | **Zustand** | Lightweight, no boilerplate, real-time friendly |
| Server State | **TanStack Query** | Caching + WebSocket sync |
| Real-Time | **Socket.io client** | WebSocket with fallback |
| Voice/Video | **Native WebRTC** (RTCPeerConnection mesh) | No external SDK; signaling via Socket.io |
| Animations | **Framer Motion** | Smooth, spring-physics, hardware-accelerated |
| Icons | **Lucide React** + custom SVG set | Clean, consistent |
| Forms | **React Hook Form + Zod** | Validation, type safe |
| Testing | **Vitest + Testing Library + Playwright** | Unit + E2E |

### Desktop App

| Layer | Choice |
|---|---|
| Framework | **Tauri** (preferred) or **Electron** |
| Why Tauri | Smaller bundle, faster, Rust backend, native feel |
| Fallback | Electron if Tauri proves limiting for voice/video native integrations |

### Mobile

| Layer | Choice |
|---|---|
| Framework | **React Native (Expo)** |
| Why | Code sharing with web logic, Expo managed workflow |
| Voice/Video | **Native WebRTC** (RTCPeerConnection) |

### Backend

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 20+** | Ecosystem, real-time strengths |
| Framework | **Fastify** | Faster than Express, schema-first |
| Language | **TypeScript** | Full-stack type sharing |
| ORM | **Drizzle ORM** | Type-safe, lightweight, fast migrations |
| Validation | **Zod** | Shared schemas front+back |
| Auth | **Custom JWT + refresh tokens** | Full control, no vendor lock |
| Real-Time | **Socket.io** (with Redis adapter for multi-node) | Mature, fallback support |
| Queue | **BullMQ (Redis-backed)** | Jobs, notifications, AI summaries |
| Search | **Elasticsearch** or **Meilisearch** | Full-text message/community search |

### Infrastructure

| Layer | Choice |
|---|---|
| Database | **PostgreSQL 16** |
| Cache/PubSub | **Redis 7** (Upstash or self-hosted) |
| Object Storage | **Cloudflare R2** or **AWS S3** |
| CDN | **Cloudflare** |
| Voice/Video | **Native WebRTC mesh** + STUN (Google public) + optional self-hosted TURN |
| Deployment | **Railway** / **Render** / **AWS ECS** |
| Containerization | **Docker + Docker Compose** |
| CI/CD | **GitHub Actions** |
| Monitoring | **Sentry** (errors) + **Grafana/Prometheus** (metrics) |
| Logging | **Pino** (structured JSON logs) |

---

## 3. Design System & Tokens

All tokens should be implemented as CSS custom properties and mirrored in a TypeScript `tokens.ts` file for use in JS/TS logic.

### CSS Variable Structure

```css
:root {
  /* Surfaces */
  --surface-base:    #0B1020;
  --surface-raised:  #121A2B;
  --surface-panel:   #1A2438;
  --surface-overlay: rgba(9, 14, 28, 0.82);

  /* Text */
  --text-primary:   #EAF1FF;
  --text-secondary: #AAB8D6;
  --text-muted:     #7D8BA8;
  --text-disabled:  #4A5568;

  /* Accent - Primary */
  --accent-primary:       #7C5CFF;
  --accent-primary-hover: #9A7BFF;
  --accent-primary-glow:  rgba(124, 92, 255, 0.25);

  /* Accent - Secondary */
  --accent-secondary:       #39D5FF;
  --accent-secondary-hover: #5DE0FF;
  --accent-secondary-glow:  rgba(57, 213, 255, 0.2);

  /* Accent - Supplemental */
  --accent-mint: #3EE6B5;
  --accent-rose: #FF6FAE;

  /* Functional */
  --color-success:      #38D39F;
  --color-success-bg:   rgba(56, 211, 159, 0.12);
  --color-warning:      #FFB84D;
  --color-warning-bg:   rgba(255, 184, 77, 0.12);
  --color-error:        #FF647C;
  --color-error-bg:     rgba(255, 100, 124, 0.12);
  --color-info:         #5AB2FF;
  --color-info-bg:      rgba(90, 178, 255, 0.12);

  /* Border */
  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-strong:  rgba(255, 255, 255, 0.18);

  /* Radius */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
  --radius-full: 9999px;

  /* Spacing scale (8pt grid) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shadows */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3);
  --shadow-lg:   0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
  --shadow-glow-violet: 0 0 20px rgba(124, 92, 255, 0.3);
  --shadow-glow-cyan:   0 0 20px rgba(57, 213, 255, 0.25);

  /* Z-index layers */
  --z-base:    0;
  --z-raised:  10;
  --z-dropdown: 100;
  --z-sticky:  200;
  --z-overlay: 300;
  --z-modal:   400;
  --z-toast:   500;
  --z-top:     9999;

  /* Transitions */
  --transition-fast:   120ms ease;
  --transition-normal: 200ms ease;
  --transition-slow:   350ms ease;
  --transition-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Light Theme Overrides

```css
[data-theme="light"] {
  --surface-base:    #F7F9FC;
  --surface-raised:  #EEF3FA;
  --surface-panel:   #E6EDF8;
  --surface-overlay: rgba(230, 237, 248, 0.92);

  --text-primary:   #152033;
  --text-secondary: #55627D;
  --text-muted:     #8896B0;
  --text-disabled:  #B0BED4;

  --accent-primary:       #6A52F5;
  --accent-primary-hover: #7C5CFF;
  --accent-secondary:     #20BFEA;

  --border-subtle:  rgba(21, 32, 51, 0.06);
  --border-default: rgba(21, 32, 51, 0.10);
  --border-strong:  rgba(21, 32, 51, 0.18);

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.08);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
}
```

---

## 4. Typography System

### Font Loading (Next.js)

```typescript
import { Sora, Inter } from 'next/font/google'

export const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '500', '600', '700', '800'],
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})
```

### Type Scale

```css
:root {
  --font-brand: var(--font-sora), 'Sora', system-ui, sans-serif;
  --font-ui:    var(--font-inter), 'Inter', system-ui, sans-serif;

  /* Scale */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   16px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  36px;
  --text-4xl:  48px;
  --text-5xl:  64px;

  /* Line heights */
  --leading-tight:  1.2;
  --leading-snug:   1.35;
  --leading-normal: 1.5;
  --leading-relaxed:1.65;

  /* Letter spacing */
  --tracking-tight:  -0.02em;
  --tracking-normal:  0;
  --tracking-wide:    0.04em;
  --tracking-wider:   0.08em;
}
```

### Usage Guidelines

| Element | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero headline | Sora | 48–64px | 800 | -0.02em |
| Section headline | Sora | 28–36px | 700 | -0.01em |
| Card title | Sora | 18–22px | 600 | 0 |
| UI label | Inter | 13px | 500 | 0.02em |
| Body / chat text | Inter | 15px | 400 | 0 |
| Caption / metadata | Inter | 11–13px | 400 | 0.03em |
| Button | Inter | 14px | 600 | 0.01em |
| Code / monospace | JetBrains Mono | 13px | 400 | 0 |

---

## 5. Color Palette — Complete Reference

### Dark Theme (Default)

#### Surfaces

| Token | Hex | Use |
|---|---|---|
| `surface/base` | `#0B1020` | App background, main canvas |
| `surface/raised` | `#121A2B` | Sidebars, panels slightly above base |
| `surface/panel` | `#1A2438` | Cards, modals, elevated panels |
| `surface/overlay` | `rgba(9,14,28,0.82)` | Backdrop overlays, dropdowns over content |
| `surface/hover` | `rgba(255,255,255,0.04)` | Hover state on interactive surfaces |
| `surface/active` | `rgba(255,255,255,0.08)` | Selected/active interactive surfaces |

#### Text

| Token | Hex | Use |
|---|---|---|
| `text/primary` | `#EAF1FF` | Main readable content |
| `text/secondary` | `#AAB8D6` | Subdued labels, metadata |
| `text/muted` | `#7D8BA8` | Timestamps, hints, inactive |
| `text/disabled` | `#4A5568` | Truly disabled states |
| `text/inverse` | `#152033` | Text on light backgrounds |
| `text/link` | `#9A7BFF` | Clickable links (Electric Iris) |
| `text/link-hover` | `#B89EFF` | Link hover state |

#### Primary Accent (Violet)

| Token | Hex | Use |
|---|---|---|
| `accent/primary` | `#7C5CFF` | Aurora Violet — primary buttons, active states, focus rings |
| `accent/primary-light` | `#9A7BFF` | Electric Iris — hover, lighter accent uses |
| `accent/primary-dark` | `#5E42D6` | Pressed states, darker gradient end |
| `accent/primary-glow` | `rgba(124,92,255,0.25)` | Drop shadows, glow effects |
| `accent/primary-bg` | `rgba(124,92,255,0.12)` | Subtle tinted backgrounds |
| `accent/primary-border` | `rgba(124,92,255,0.35)` | Bordered accent containers |

#### Secondary Accent (Cyan)

| Token | Hex | Use |
|---|---|---|
| `accent/secondary` | `#39D5FF` | Cyan Pulse — live indicators, info, links |
| `accent/secondary-light` | `#5DE0FF` | Hover state for cyan elements |
| `accent/secondary-dark` | `#1BBAEB` | Darker cyan, pressed state |
| `accent/secondary-glow` | `rgba(57,213,255,0.2)` | Cyan glow on live/active rooms |
| `accent/secondary-bg` | `rgba(57,213,255,0.10)` | Tinted background, info banners |

#### Supplemental Accents

| Token | Hex | Use |
|---|---|---|
| `accent/mint` | `#3EE6B5` | Mint Signal — success adjacent, growth indicators |
| `accent/rose` | `#FF6FAE` | Rose Ember — warm highlights, DM indicators, reactions |

#### Functional Colors

| Token | Hex | Use |
|---|---|---|
| `functional/success` | `#38D39F` | Success toasts, positive confirmations |
| `functional/success-bg` | `rgba(56,211,159,0.12)` | Success banner backgrounds |
| `functional/success-border` | `rgba(56,211,159,0.25)` | Success bordered elements |
| `functional/warning` | `#FFB84D` | Warnings, caution states |
| `functional/warning-bg` | `rgba(255,184,77,0.12)` | Warning backgrounds |
| `functional/warning-border` | `rgba(255,184,77,0.25)` | Warning borders |
| `functional/error` | `#FF647C` | Errors, destructive actions |
| `functional/error-bg` | `rgba(255,100,124,0.12)` | Error backgrounds |
| `functional/error-border` | `rgba(255,100,124,0.25)` | Error borders |
| `functional/info` | `#5AB2FF` | Info states, tips |
| `functional/info-bg` | `rgba(90,178,255,0.12)` | Info backgrounds |

#### Presence / Status Colors

| Status | Hex | Label |
|---|---|---|
| Online | `#38D39F` | Available |
| Open to chat | `#3EE6B5` | Open to chat |
| Focused | `#FFB84D` | Focused |
| Listening only | `#5AB2FF` | Listening only |
| Available for calls | `#7C5CFF` | Available for calls |
| Co-op mode | `#39D5FF` | Co-op mode |
| Hosting | `#FF6FAE` | Hosting |
| Quiet mode | `#AAB8D6` | Quiet mode |
| Offline | `#4A5568` | Offline |

### Light Theme (Optional)

| Token | Hex | Use |
|---|---|---|
| `surface/base` | `#F7F9FC` | Cloud White |
| `surface/raised` | `#EEF3FA` | Frost Panel |
| `surface/panel` | `#E6EDF8` | Elevated panels |
| `border/default` | `#D5DEEE` | Silver Line |
| `text/primary` | `#152033` | Ink Primary |
| `text/secondary` | `#55627D` | Ink Secondary |
| `accent/primary` | `#6A52F5` | Violet Accent (slightly darker for WCAG) |
| `accent/secondary` | `#20BFEA` | Cyan Accent |

### Gradients

```css
/* Brand gradient — used on hero sections and premium CTAs */
--gradient-brand: linear-gradient(135deg, #7C5CFF 0%, #39D5FF 100%);

/* Subtle brand glow — panel borders, highlight elements */
--gradient-brand-subtle: linear-gradient(135deg,
  rgba(124,92,255,0.3) 0%,
  rgba(57,213,255,0.2) 100%
);

/* Dark depth — backgrounds of large containers */
--gradient-depth: linear-gradient(180deg, #121A2B 0%, #0B1020 100%);

/* Surface elevation gradient */
--gradient-surface: linear-gradient(180deg,
  rgba(255,255,255,0.05) 0%,
  rgba(255,255,255,0.02) 100%
);

/* Violet to rose — accent for special moments, events */
--gradient-warm: linear-gradient(135deg, #7C5CFF 0%, #FF6FAE 100%);

/* Mint to cyan — used for success/live states */
--gradient-cool: linear-gradient(135deg, #3EE6B5 0%, #39D5FF 100%);
```

---

## 6. Component Architecture

### Component Hierarchy

```
/components
  /primitives          — Atoms: Button, Input, Avatar, Badge, Icon, Spinner
  /composed            — Molecules: MessageBubble, UserCard, RoomTile, ChannelRow
  /patterns            — Organisms: ChatFeed, MemberList, VoiceRoom, HubSidebar
  /layout              — Layout shells: AppShell, SpaceRail, ContextPanel, MainSurface
  /modals              — Overlays: CreateHub, InviteModal, ProfileModal, ConfirmDialog
  /overlays            — Non-blocking: Toast, Tooltip, Popover, ContextMenu
  /forms               — Form components: LoginForm, HubSettingsForm, RoleEditor
  /atmosphere          — Atmosphere-specific overrides and theme shells
  /admin               — Moderation panel, Trust Center, Permission Editor
```

### Key Components to Build

#### Primitive Layer

- `<Button>` — variants: primary, secondary, ghost, danger, icon. Sizes: sm, md, lg
- `<Input>` — text, password, search variants. Error/label/hint support
- `<Avatar>` — sizes xs/sm/md/lg/xl, with presence dot, fallback initials
- `<Badge>` — status badge, count badge, label badge
- `<Chip>` — dismissible, selectable variants
- `<Icon>` — wrapper for Lucide + custom SVGs, consistent sizing
- `<Skeleton>` — loading placeholder system
- `<Spinner>` — loading states

#### Composed Layer

- `<MessageBubble>` — chat message with avatar, reactions, reply chain, edit state
- `<UserCard>` — hover card with presence, roles, mutual hubs
- `<RoomTile>` — voice/video room with participant avatars, active glow, purpose mode label
- `<ChannelRow>` (StreamRow) — channel in sidebar, with unread dot, lock icon, type icon
- `<HubIcon>` — hub avatar in space rail, with notification bubble
- `<PresenceDot>` — colored dot with tooltip for status
- `<ReactionPicker>` — emoji reaction overlay
- `<ThreadPreview>` — collapsed thread with reply count

#### Pattern Layer

- `<ChatFeed>` — virtualized message list, date dividers, unread separator
- `<MessageInput>` — rich text input with emoji, attachments, mentions, slash commands
- `<MemberList>` — right drawer member list grouped by role with presence
- `<VoiceRoom>` — participant grid, speaking indicator, controls bar
- `<HubSidebar>` — zones, streams, rooms navigation tree
- `<SpaceRail>` — left column with hub icons + DM icon + settings
- `<LivePulseBar>` — top bar with active rooms, mentions, events
- `<SmartCatchUp>` — catch-up summary card

---

## 7. Product Naming System

| UI Term | Internal/DB Term | Description |
|---|---|---|
| Hub | `hub` / `guild` | Top-level community space |
| Zone | `zone` / `category` | Grouping of streams and rooms |
| Stream | `channel` (type: text) | Text chat channel |
| Room | `channel` (type: voice/video) | Voice or video room |
| Pulse | `pulse` / `activity` | Live activity indicator |
| Path | `onboarding_path` | Admin-configured onboarding flow |
| Aura | `atmosphere` / `theme` | Visual theme preset for a hub |
| Presence Layer | `presence_status` | Rich user presence state |
| Trust Center | `trust_settings` | Admin hub trust configuration |
| Clips | `media_clip` | Saved voice/video moments |
| Moments | `highlight` | Saved highlights from rooms |
| Smart Catch-Up | `channel_summary` | AI-generated channel summary |

### Atmosphere Presets

| Aura Name | Vibe | Primary Palette Shift |
|---|---|---|
| Studio | Clean, creator, minimal | Neutral with violet accents |
| Arcade | Energetic, neon, playful | Bright cyan and rose, higher saturation |
| Lounge | Warm, cozy, conversational | Amber tones, muted violets |
| Guild | Fantasy, structured, role-heavy | Deep purples, gold accents |
| Orbit | Futuristic, minimal, tech-forward | Pure cyan/mint, minimal chrome |

---

## 8. Feature Breakdown by Phase

### Phase 1 — Foundation (MVP)

**Goal:** A working community platform. Core functionality, no fluff.

#### Authentication System
- [ ] Email/password registration
- [ ] Email verification flow
- [ ] JWT access tokens (15min expiry)
- [ ] Refresh token rotation (7-day sliding window)
- [ ] Secure HttpOnly cookies
- [ ] Password reset flow
- [ ] OAuth: Google, GitHub (optional at launch)
- [ ] Rate limiting on auth endpoints

#### User Profiles
- [ ] Username (unique, lowercase, 3–32 chars)
- [ ] Display name (20 chars max)
- [ ] Avatar upload (compress to WebP, multiple sizes: 32/64/128/256px)
- [ ] Bio field (200 chars)
- [ ] Presence status picker (7 states)
- [ ] Profile card component
- [ ] User settings page

#### Hubs (Communities)
- [ ] Create hub (name, description, icon, public/private)
- [ ] Hub icon upload
- [ ] Hub invite link generation (with expiry options)
- [ ] Join hub by invite link
- [ ] Leave hub
- [ ] Hub discovery page (public hubs only)
- [ ] Hub settings (name, description, icon, region/visibility)
- [ ] Delete hub (owner only, with confirmation)

#### Zones (Categories)
- [ ] Create zone within a hub
- [ ] Zone name and optional description
- [ ] Reorder zones (drag and drop)
- [ ] Delete zone
- [ ] Collapse/expand zone in sidebar

#### Streams (Text Channels)
- [ ] Create stream in a zone
- [ ] Stream types: general, announcements (admin-post only), readonly
- [ ] Text message send/receive (WebSocket)
- [ ] Message history (load on scroll, paginated)
- [ ] Message editing (with "edited" label)
- [ ] Message deletion (own message + admin)
- [ ] Emoji reactions (add, remove, view reactors)
- [ ] Reply to message (with quote preview)
- [ ] @mention users and roles
- [ ] Pin messages (admin)
- [ ] File/image uploads
- [ ] Link preview embeds (unfurling)
- [ ] Markdown rendering (bold, italic, code, code blocks, lists)
- [ ] Unread message tracking
- [ ] Mark as read
- [ ] Search within a hub

#### Rooms (Voice/Video)
- [ ] Create voice room
- [ ] Join/leave voice room
- [ ] See who is in a room (member list)
- [ ] Mute/unmute mic
- [ ] Deafen self
- [ ] Push-to-talk support
- [ ] Voice activity detection (speaking indicator)
- [ ] Basic video call support
- [ ] Screen share
- [ ] Hand raise control (moderated rooms)
- [ ] Admin kick from room
- [ ] Room capacity limit
- [ ] Noise suppression toggle

#### Roles & Permissions
- [ ] Default roles: @everyone, @member, @mod, @admin, @owner
- [ ] Custom role creation
- [ ] Role color picker
- [ ] Assign role to member
- [ ] Role hierarchy (position order)
- [ ] Permission overrides per zone or stream
- [ ] Permissions: send messages, manage messages, kick, ban, manage roles, manage hub, view channel, connect to room, speak, stream, manage rooms

#### Moderation (Basic)
- [ ] Kick member from hub
- [ ] Ban member (with optional reason)
- [ ] Timeout member (mute for duration)
- [ ] Delete any message
- [ ] Slow mode per stream (configurable cooldown)
- [ ] View mod action log
- [ ] Basic auto-filter (configurable word list)

#### DMs & Group DMs
- [ ] Direct message any user
- [ ] DM conversation list
- [ ] Group DM (up to 10 users)
- [ ] DM notifications
- [ ] Read receipts in DMs

#### Notifications
- [ ] In-app notification feed
- [ ] @mention notifications
- [ ] DM notifications
- [ ] Per-stream notification settings (all, mentions, none)
- [ ] Per-hub notification settings
- [ ] Browser push notifications (web)
- [ ] Desktop notifications (Tauri)

#### Search
- [ ] Search messages within a stream
- [ ] Search messages across a hub
- [ ] Search by user, date range, has:image, has:link filters
- [ ] Search for hubs (public discovery)

#### Invites & Onboarding
- [ ] Hub invite links (permanent + timed)
- [ ] Welcome screen on first join
- [ ] Basic welcome message from bot/system
- [ ] Hub rules display on join

---

### Phase 2 — Differentiation

**Goal:** The features that make Nexora feel different and better.

#### Atmosphere / Aura System
- [ ] 5 built-in atmosphere presets (Studio, Arcade, Lounge, Guild, Orbit)
- [ ] Hub admin can set atmosphere for the community
- [ ] Atmosphere affects: color hue shifts, border radii, spacing density, motion intensity
- [ ] User can override atmosphere preference in their own settings
- [ ] Preview atmosphere before applying

#### Presence Layers
- [ ] Rich presence states: Open to chat, Focused, Listening only, Available for calls, Co-op mode, Hosting, Quiet mode
- [ ] Presence displayed in member list and user cards
- [ ] Presence-aware notification behavior (e.g., "Focused" reduces ping noise)
- [ ] Presence shown in voice lobby
- [ ] Mobile presence sync

#### Smart Catch-Up
- [ ] Per-stream AI-generated summary (last 24h / since last visit)
- [ ] Catch-up card with: key topics, decisions, links shared, active participants
- [ ] "You were mentioned" highlight in catch-up
- [ ] Summary accuracy feedback (thumbs up/down)
- [ ] Opt-out per stream or globally
- [ ] Admin can enable/disable summaries for their hub

#### Live Pulse Bar
- [ ] Top-of-app bar showing: active rooms in joined hubs, mentions, events starting soon, welcome requests pending
- [ ] Click pulse item to jump directly to it
- [ ] Dismiss individual items
- [ ] Collapse pulse bar when not needed
- [ ] Subtle animation on new pulse events

#### Room Purpose Modes
- [ ] Preset modes: Hangout, Study, Co-work, Game Squad, Stage/Q&A, Watch Party, Music Room, Support Room
- [ ] Mode changes: control visibility, layout, suggested permissions, UI density
- [ ] Admin can restrict available modes per room

#### Dynamic Voice Lobby
- [ ] Show users who are "hovering" near a room (presence: looking to join)
- [ ] "Knock" to signal interest in joining
- [ ] Waiting room indicator for Stage rooms
- [ ] Joining-soon status visible to room participants

#### Community Paths (Onboarding)
- [ ] Admin can create multi-step onboarding flows
- [ ] Steps: welcome message, rules accept, role picker, channel tour, intro prompt
- [ ] Conditional routing (if role X selected, show path Y)
- [ ] Track completion rate in analytics

#### Scene-Based Navigation
- [ ] Views: Chat view, Live view, Events view, People view, Knowledge view
- [ ] Knowledge view shows pinned messages, important links, shared files
- [ ] People view shows member list with filtering and sorting
- [ ] Live view shows all active rooms across the hub

#### Trust Center (Admin)
- [ ] Visual dashboard for hub trust settings
- [ ] Join options: Open, Invite-only, Email-confirmed, Phone-confirmed, Mutual vouch, Waitlist, Age-gated
- [ ] Tiered new member limits (rate limit first 7 days)
- [ ] Suspicious account auto-quarantine toggle
- [ ] Invite chain tracking

#### Soft-Gated Communities
- [ ] Hub can designate "preview zones" visible before full join
- [ ] Apply to join button with custom questions/requirements
- [ ] Admin review pending applications

---

### Phase 3 — Scale & Ecosystem

**Goal:** Events, creator tools, marketplace foundation, analytics.

#### Events System
- [ ] Create recurring and one-time events
- [ ] Event RSVP
- [ ] Event rooms (auto-created room at event time)
- [ ] Event notifications and reminders
- [ ] Event calendar view (hub and personal)
- [ ] Event discovery

#### Clips & Moments
- [ ] Save short voice/video clips during a room session
- [ ] Clip library per hub
- [ ] Share clip to a stream
- [ ] Moment highlights (pinned memorable messages)
- [ ] Clip permissions (who can save, who can view)

#### Advanced Moderation
- [ ] Raid detection and auto-lockdown
- [ ] Appeal system for bans
- [ ] Evidence bundle creation for incidents
- [ ] Cross-hub ban sharing (opt-in)
- [ ] Adaptive moderation per channel type
- [ ] AI-assisted content flagging

#### Advanced Admin Analytics
- [ ] Member growth graphs
- [ ] Message volume by stream
- [ ] Voice room usage stats
- [ ] Event attendance tracking
- [ ] Member activity heatmap

#### Creator Tools
- [ ] Subscription tiers for communities
- [ ] Exclusive streams/rooms for subscriber tiers
- [ ] Creator profile badges
- [ ] Tip/support integrations

#### Marketplace Foundation
- [ ] Custom atmosphere packs (purchasable)
- [ ] Community visual kits
- [ ] Event templates
- [ ] Third-party bot/app integrations API

---

## 9. Database Schema Design

### Core Tables

```sql
-- Users
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  display_name  VARCHAR(50),
  email         VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  presence      VARCHAR(32) DEFAULT 'offline',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
)

-- Hubs (Communities)
hubs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID REFERENCES users(id),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) UNIQUE,
  description   TEXT,
  icon_url      TEXT,
  banner_url    TEXT,
  atmosphere    VARCHAR(32) DEFAULT 'orbit',
  is_public     BOOLEAN DEFAULT true,
  join_policy   VARCHAR(32) DEFAULT 'open',
  member_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Hub Members
hub_members (
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  nickname      VARCHAR(32),
  PRIMARY KEY   (hub_id, user_id)
)

-- Roles
roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  name          VARCHAR(64) NOT NULL,
  color         VARCHAR(7),
  position      INTEGER DEFAULT 0,
  is_default    BOOLEAN DEFAULT false,
  permissions   BIGINT DEFAULT 0,  -- bitmask
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Member Roles
member_roles (
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY   (hub_id, user_id, role_id)
)

-- Zones (Categories)
zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  position      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Channels (Streams + Rooms)
channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  zone_id       UUID REFERENCES zones(id) ON DELETE SET NULL,
  name          VARCHAR(100) NOT NULL,
  type          VARCHAR(16) NOT NULL, -- 'text' | 'voice' | 'video' | 'announcement' | 'stage'
  topic         TEXT,
  position      INTEGER DEFAULT 0,
  is_nsfw       BOOLEAN DEFAULT false,
  slowmode_delay INTEGER DEFAULT 0,
  room_mode     VARCHAR(32),  -- purpose mode for voice/video
  capacity      INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Messages
messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID REFERENCES channels(id) ON DELETE CASCADE,
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  content       TEXT,
  reply_to_id   UUID REFERENCES messages(id),
  is_pinned     BOOLEAN DEFAULT false,
  is_edited     BOOLEAN DEFAULT false,
  edited_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Message Attachments
message_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID REFERENCES messages(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  filename      TEXT,
  content_type  TEXT,
  size_bytes    INTEGER,
  width         INTEGER,
  height        INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Reactions
reactions (
  message_id    UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji         VARCHAR(32) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY   (message_id, user_id, emoji)
)

-- Direct Message Conversations
dm_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group      BOOLEAN DEFAULT false,
  name          VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT now()
)

dm_participants (
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY     (conversation_id, user_id)
)

-- Invite Links
invites (
  code          VARCHAR(12) PRIMARY KEY,
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  uses          INTEGER DEFAULT 0,
  max_uses      INTEGER,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Mod Action Log
mod_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id        UUID REFERENCES hubs(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id),
  target_id     UUID REFERENCES users(id),
  action        VARCHAR(32) NOT NULL,  -- 'kick' | 'ban' | 'timeout' | 'delete_message' | 'unban'
  reason        TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
)

-- Channel Summaries (AI)
channel_summaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID REFERENCES channels(id) ON DELETE CASCADE,
  summary_text  TEXT NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  message_count INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
)
```

### Key Indexes

```sql
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_author ON messages(author_id);
CREATE INDEX idx_hub_members_user ON hub_members(user_id);
CREATE INDEX idx_member_roles_user ON member_roles(user_id);
CREATE INDEX idx_channels_hub ON channels(hub_id, position);
CREATE INDEX idx_reactions_message ON reactions(message_id);
CREATE INDEX idx_mod_actions_hub ON mod_actions(hub_id, created_at DESC);
```

---

## 10. API Architecture

### REST Endpoints (Fastify)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/:userId
GET    /api/users/:userId/hubs

GET    /api/hubs
POST   /api/hubs
GET    /api/hubs/:hubId
PATCH  /api/hubs/:hubId
DELETE /api/hubs/:hubId
GET    /api/hubs/:hubId/members
DELETE /api/hubs/:hubId/members/:userId
GET    /api/hubs/:hubId/roles
POST   /api/hubs/:hubId/roles
PATCH  /api/hubs/:hubId/roles/:roleId
DELETE /api/hubs/:hubId/roles/:roleId
GET    /api/hubs/:hubId/invites
POST   /api/hubs/:hubId/invites
GET    /api/hubs/:hubId/channels
POST   /api/hubs/:hubId/channels
GET    /api/hubs/:hubId/mod-log

GET    /api/channels/:channelId
PATCH  /api/channels/:channelId
DELETE /api/channels/:channelId
GET    /api/channels/:channelId/messages
POST   /api/channels/:channelId/messages
PATCH  /api/channels/:channelId/messages/:messageId
DELETE /api/channels/:channelId/messages/:messageId
POST   /api/channels/:channelId/messages/:messageId/reactions
DELETE /api/channels/:channelId/messages/:messageId/reactions/:emoji
GET    /api/channels/:channelId/pins
POST   /api/channels/:channelId/messages/:messageId/pin

POST   /api/invites/:code/join

GET    /api/dms
POST   /api/dms
GET    /api/dms/:conversationId/messages
POST   /api/dms/:conversationId/messages
```

### WebSocket Events (Socket.io)

```typescript
// Client → Server
socket.emit('channel:join', { channelId })
socket.emit('channel:leave', { channelId })
socket.emit('message:send', { channelId, content, replyToId, attachments })
socket.emit('message:edit', { messageId, content })
socket.emit('message:delete', { messageId })
socket.emit('message:react', { messageId, emoji })
socket.emit('message:unreact', { messageId, emoji })
socket.emit('typing:start', { channelId })
socket.emit('typing:stop', { channelId })
socket.emit('presence:update', { status })
socket.emit('voice:join', { channelId })
socket.emit('voice:leave', { channelId })

// Server → Client
socket.on('message:new', MessagePayload)
socket.on('message:edited', MessagePayload)
socket.on('message:deleted', { messageId, channelId })
socket.on('reaction:added', ReactionPayload)
socket.on('reaction:removed', ReactionPayload)
socket.on('typing:users', { channelId, users: string[] })
socket.on('presence:changed', { userId, status })
socket.on('member:joined', MemberPayload)
socket.on('member:left', { userId, hubId })
socket.on('member:banned', { userId, hubId })
socket.on('channel:updated', ChannelPayload)
socket.on('hub:updated', HubPayload)
socket.on('pulse:new', PulsePayload)
```

---

## 11. Real-Time Infrastructure

### WebSocket Architecture

- **Socket.io** with Redis adapter for horizontal scaling
- Namespace per feature: `/chat`, `/voice`, `/presence`, `/notifications`
- Room-based isolation: users join socket rooms for each channel they view
- Redis pub/sub for cross-server message broadcasting

### Presence System

```
User connects → write presence to Redis (key: presence:{userId}, TTL: 65s)
Heartbeat every 30s → refresh TTL
User updates status → update Redis, publish to subscribers
User disconnects → TTL expires → presence:offline broadcast
```

### Message Delivery Flow

```
Client sends message
  → WebSocket to server
    → Validate permissions
      → Write to PostgreSQL
        → Publish to Redis channel
          → All server nodes receive
            → Broadcast to connected clients in that channel
```

---

## 12. Voice & Video Stack

### Architecture: Native WebRTC Mesh

We build our own WebRTC stack using browser-native APIs and Socket.io for signaling.
No external SDK dependency. Best for rooms up to ~8 participants (mesh scales as N² connections).

- **Signaling**: Socket.io (already running) relays SDP offer/answer and ICE candidates
- **NAT traversal**: Google public STUN servers by default; optional self-hosted TURN for strict firewalls
- **Audio**: `getUserMedia({ audio: true })` with echoCancellation, noiseSuppression, autoGainControl
- **Video**: `getUserMedia({ video: true })` on demand (off by default)
- **Screen share**: `getDisplayMedia({ video: true })`
- **Speaking detection**: Web Audio API `AnalyserNode` measuring frequency energy

### Voice Room Flow

```
User joins room
  → POST /api/voice/join (membership check + ICE server config)
    → socket.emit('room:join', { channelId })
      → Server sends 'room:participants' (existing peers)
        → For each existing peer: createOffer() → setLocalDescription → emit 'webrtc:offer'
          → Peer receives offer → createAnswer → emit 'webrtc:answer'
            → ICE candidates exchanged via 'webrtc:ice'
              → RTCPeerConnection established → audio/video flows peer-to-peer
```

### Room Controls

- Mute/unmute (local + admin-forced)
- Camera on/off
- Screen share start/stop
- Push-to-talk mode
- Hand raise queue
- Stage mode (only presenter unmuted by default)
- Noise suppression via Krisp or RNNoise (browser built-in)

---

## 13. Authentication & Trust System

### Standard Auth Flow

```
Register → email verification → login → JWT pair (access + refresh)
Access token: 15min, stored in memory (not localStorage)
Refresh token: 7 days, HttpOnly secure cookie
Refresh rotation on every use
```

### Trust System (Community-Controlled)

Hub admins configure their join policy from:

| Policy | Description |
|---|---|
| `open` | Anyone with link can join |
| `invite_only` | Must have invite link |
| `email_confirmed` | Must verify email first |
| `phone_confirmed` | Must verify phone number |
| `mutual_vouch` | Existing member must vouch |
| `waitlist` | Admin approves manually |
| `age_gated` | Self-declared age requirement |
| `tiered_new_user` | New accounts have limited permissions for N days |

### Trust Scoring (Behavior-Based)

Per-hub trust score computed from:
- Account age
- Email/phone verified status
- Invite chain depth (who invited them)
- Message volume and history
- Reports received vs. actions taken
- Community vouches received

### Device Reputation (Phase 2)

- Fingerprint browser/device at registration
- Rate-limit new accounts from same device
- Flag suspiciously fresh accounts joining rapidly
- Not used as permanent ban — only rate limiting tool

---

## 14. Atmosphere System

### How It Works

Each hub has an `atmosphere` setting. This applies a set of CSS class overrides that shift:

1. **Color hue** — temperature shift on surface colors
2. **Border radius** — how rounded or sharp UI elements are
3. **Spacing density** — how airy or compact the layout is
4. **Motion intensity** — subtle vs. pronounced animations
5. **Typography weight** — heavier/lighter feel
6. **Accent color** — primary accent hue shift

### Implementation

```typescript
type Atmosphere = 'studio' | 'arcade' | 'lounge' | 'guild' | 'orbit'

// Applied as data attribute on hub shell
<div data-atmosphere={hub.atmosphere}>

// CSS:
[data-atmosphere="arcade"] {
  --accent-primary: #FF4088;
  --radius-md: 8px;  // sharper
  --surface-base: #0D0B1A;
}
[data-atmosphere="lounge"] {
  --accent-primary: #C97B3F;
  --accent-secondary: #E8A85A;
  --surface-base: #130F0B;
  --surface-raised: #1C1610;
}
```

### Atmosphere Definitions

| Aura | Primary | Secondary | Surface Base | Radius | Motion |
|---|---|---|---|---|---|
| Studio | `#7C5CFF` | `#39D5FF` | `#0B1020` | 16px | Medium |
| Arcade | `#FF4088` | `#FFE040` | `#0D0B1A` | 8px | High |
| Lounge | `#C97B3F` | `#E8A85A` | `#130F0B` | 20px | Low |
| Guild | `#9B6AFF` | `#D4AF37` | `#0C0B14` | 12px | Medium |
| Orbit | `#00E5FF` | `#3EE6B5` | `#060D16` | 22px | Low |

---

## 15. Frontend Layout Architecture

### Desktop Shell

```
┌─────────────────────────────────────────────────────┐
│ Live Pulse Bar (optional, ~36px)                    │
├────────┬───────────────┬────────────────────────────┤
│  Space │  Context      │  Active Surface            │
│  Rail  │  Panel        │                            │
│ (60px) │ (240px)       │  (flex-1)                  │
│        │               │                            │
│  Hub   │  Zones &      │  Chat Feed / Voice Room /  │
│  Icons │  Streams      │  Video Stage / Dashboard   │
│        │  + Rooms      │                            │
│        │               ├────────────────────────────┤
│        │               │  Message Input (80px)      │
├────────┴───────────────┴────────────────────────────┤
│ User Controls Bar (~52px) [avatar, presence, audio] │
└─────────────────────────────────────────────────────┘

Optional: Insight Drawer (320px) slides in from right
```

### Key Layout Measurements

| Element | Width/Height |
|---|---|
| Space Rail | 60px wide |
| Context Panel | 240px wide (collapsible) |
| Active Surface | Fluid, min 400px |
| Insight Drawer | 320px (slides in) |
| Live Pulse Bar | 36px height |
| Message Input | ~80px min-height |
| User Controls | 52px height |
| Hub icon | 44px |
| Channel row | 34px height |

### Mobile Shell

```
Bottom Tab Bar navigation:
[ Home ] [ Streams ] [ Rooms ] [ Events ] [ Profile ]

Home = Pulse feed, active rooms, DMs
Streams = Swipe through channels
Rooms = Voice/video rooms (presence-first)
Events = Upcoming events in joined hubs
Profile = Settings, presence picker
```

---

## 16. Mobile Strategy

### React Native + Expo Setup

```bash
npx create-expo-app nexora-mobile --template expo-template-blank-typescript
```

### Shared Code Strategy

- Shared TypeScript types between web + mobile
- Shared business logic hooks (non-UI)
- Shared Zod validation schemas
- Separate UI components per platform

### Key Mobile Flows

- **Presence-first home screen** — see active rooms before streams
- **Swipe gestures** — swipe right for hub sidebar, swipe left for member list
- **Background audio** — voice rooms continue in background
- **Push notifications** — mentions, DMs, events via Expo Notifications
- **Deep links** — join a hub or room directly from a URL

### Performance on Mobile

- Virtualized message lists (FlashList by Shopify)
- Lazy load hub icons
- Image caching with expo-image
- Optimistic UI updates for message send
- Offline queue for messages sent while disconnected

---

## 17. Moderation System

### Permission Bitmask (64-bit)

```typescript
export const Permissions = {
  VIEW_CHANNEL:          1n << 0n,
  SEND_MESSAGES:         1n << 1n,
  SEND_DMS:             1n << 2n,
  EMBED_LINKS:           1n << 3n,
  ATTACH_FILES:          1n << 4n,
  READ_MESSAGE_HISTORY:  1n << 5n,
  ADD_REACTIONS:         1n << 6n,
  USE_SLASH_COMMANDS:    1n << 7n,
  MENTION_EVERYONE:      1n << 8n,
  CONNECT:               1n << 9n,
  SPEAK:                 1n << 10n,
  STREAM:                1n << 11n,
  MUTE_MEMBERS:          1n << 12n,
  DEAFEN_MEMBERS:        1n << 13n,
  MOVE_MEMBERS:          1n << 14n,
  MANAGE_MESSAGES:       1n << 15n,
  MANAGE_CHANNELS:       1n << 16n,
  MANAGE_ROLES:          1n << 17n,
  MANAGE_MEMBERS:        1n << 18n,
  BAN_MEMBERS:           1n << 19n,
  KICK_MEMBERS:          1n << 20n,
  MANAGE_HUB:            1n << 21n,
  ADMINISTRATOR:         1n << 22n,  // overrides all
} as const
```

### Moderation Actions Log Schema

Every moderation action is logged with:
- Who did it (actor)
- Who was targeted
- What action
- Reason
- Evidence (message IDs, screenshot URLs)
- Timestamp

### Auto-Moderation Rules (Phase 1)

- Spam detection: >5 identical messages in 5s from same user
- Link filtering: optional per-hub blocked domain list
- Word filter: configurable per-hub word list
- Mass mention: block messages with >5 @mentions
- Join flood: if >20 accounts join in 60s, trigger slowdown + alert

---

## 18. AI Features

### Smart Catch-Up (Phase 2)

**Stack:** Claude claude-haiku-4-5-20251001 (fast, cost-efficient) via Anthropic API or self-hosted summarization model.

**Trigger:**
- On request (user clicks "Catch me up")
- Automatically when user opens a channel after >2hr absence with >50 new messages

**Prompt structure:**
```
Summarize the following chat messages from the past [X hours].
Include:
- Main topics discussed
- Decisions made
- Important links shared
- Whether the conversation is still active

Format as structured bullet points. Be concise.
```

**Privacy considerations:**
- Summaries are ephemeral (TTL: 6 hours)
- User can opt out per-hub or globally
- Never summarize DMs unless explicitly enabled

### Mention Detection

- Highlight @mentions and extract them from messages
- Smart notification routing based on presence state

---

## 19. Accessibility Requirements

All Phase 1 work must ship with:

### WCAG 2.1 AA Targets

- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard accessible
- Focus rings visible and styled (not hidden)
- All images have alt text
- Form inputs have associated labels
- Error states are announced to screen readers

### Implementation Checklist

- [ ] `aria-label` on icon-only buttons
- [ ] `aria-live` regions for notifications and real-time updates
- [ ] `role="log"` on chat feed
- [ ] Keyboard trap inside modals with `focus-trap` library
- [ ] Skip-to-main-content link
- [ ] `prefers-reduced-motion` media query respected (no spring/bounce anims)
- [ ] `prefers-contrast: high` media query adds higher contrast borders
- [ ] All status indicators have non-color fallback (shape or text)
- [ ] Tab order follows visual order
- [ ] Tooltips on hover AND focus

---

## 20. Performance Targets

| Metric | Target |
|---|---|
| Time to First Byte | < 200ms |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Message send → visible | < 100ms (optimistic) |
| Voice join latency | < 500ms |
| Search results | < 300ms |
| Image load (avatar) | < 150ms (cached) |
| App bundle (initial JS) | < 250KB gzipped |
| Mobile TTI | < 3s on mid-range device |

### Strategies

- Virtual list for chat feed (only render visible messages)
- Image CDN with automatic WebP conversion and resizing
- Edge caching for static assets
- Code splitting per route
- Prefetch hub data on hover
- Skeleton screens everywhere (no blank loading)
- Optimistic updates on all user actions

---

## 21. Testing Strategy

### Layers

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit (functions/hooks) | Vitest | 80%+ |
| Component | Testing Library | Critical paths |
| Integration (API) | Vitest + supertest | All endpoints |
| E2E | Playwright | Core user flows |
| Visual Regression | Chromatic (Storybook) | Component library |
| Load Testing | k6 | 1000 concurrent users |

### E2E Test Scenarios (Critical)

- [ ] Register, verify email, log in
- [ ] Create a hub, create a zone, create a stream
- [ ] Send a message, receive it in another browser session
- [ ] Join a voice room, see participant list update
- [ ] Invite user via link, join hub
- [ ] Ban user, verify they are blocked
- [ ] Create role, assign to user, verify permission change

---

## 22. Deployment & Infrastructure

### Environments

| Env | Purpose |
|---|---|
| local | Development (Docker Compose) |
| staging | PR previews + QA |
| production | Live app |

### Docker Compose (Local Dev)

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  livekit:
    image: livekit/livekit-server
    ports: ["7880:7880"]
  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    ports: ["3001:3001"]
  web:
    build: ./apps/web
    ports: ["3000:3000"]
```

### Monorepo Structure

```
nexora/
  apps/
    web/          Next.js web app
    api/          Fastify backend
    mobile/       React Native (Expo)
    desktop/      Tauri wrapper
  packages/
    types/        Shared TypeScript types
    schemas/      Shared Zod schemas
    ui/           Shared component library (web)
    config/       Shared ESLint, Prettier, TS config
  infra/
    docker/
    k8s/         (Phase 3)
    scripts/
```

### CI/CD Pipeline (GitHub Actions)

```
On PR:
  → Lint + type check
  → Unit tests
  → Build check
  → Playwright E2E (against staging)
  → Deploy preview to staging URL

On merge to main:
  → Full test suite
  → Build production artifacts
  → Deploy to production
  → Run smoke tests
  → Notify on Slack/Discord
```

---

## 23. Phase Task Lists

### Phase 1 Foundation Tasks

#### Setup & Infrastructure
- [x] Initialize monorepo with Turborepo
- [x] Configure shared TypeScript settings
- [x] Set up ESLint + Prettier across all packages
- [x] Create Docker Compose for local dev
- [x] Set up PostgreSQL + Redis locally
- [x] Configure GitHub Actions CI pipeline
- [x] Set up Drizzle ORM with migration workflow
- [x] Configure environment variable handling (dotenv + zod validation)

#### Design System
- [x] Create `packages/ui` shared component library
- [x] Implement all CSS design tokens as CSS variables
- [x] Set up Tailwind config extending design tokens
- [x] Import and configure Sora + Inter fonts
- [x] Build primitive components: Button, Input, Avatar, Badge, Icon, Spinner, Skeleton
- [ ] Build Storybook for component documentation
- [ ] Write visual snapshot tests for primitives

#### API Foundation
- [x] Fastify server setup with TypeScript
- [x] Zod request validation plugin
- [x] JWT middleware (access + refresh)
- [x] Error handling middleware (structured errors)
- [x] Request logging with Pino
- [x] CORS configuration
- [x] Health check endpoint
- [x] Rate limiting (global + per-route)

#### Authentication
- [x] User registration endpoint + email verification
- [x] Login endpoint with JWT pair
- [x] Refresh token endpoint
- [x] Logout (invalidate refresh token)
- [x] Forgot password + reset flow
- [x] Auth middleware for protected routes
- [x] Registration form (web)
- [x] Login form (web)
- [x] Email verification page

#### Hub System
- [x] Hub CRUD endpoints
- [x] Zone CRUD endpoints
- [x] Channel CRUD endpoints
- [x] Hub member endpoints (list, kick)
- [x] Role CRUD endpoints
- [x] Permission calculation logic (bitmask)
- [x] Invite link generation + join
- [x] Hub list/discovery page (web)
- [x] Create hub modal (web)
- [x] Hub settings page (web)

#### Messaging
- [x] WebSocket server setup (Socket.io + Redis adapter)
- [x] Message send/receive via WebSocket
- [x] Message history REST endpoint (paginated)
- [x] Message edit + delete
- [x] Emoji reactions
- [x] Reply threading (schema done, UI pending)
- [x] @mention parsing + highlighting
- [x] File upload to S3/R2
- [x] Chat feed component (virtualized)
- [x] Message input component
- [x] Typing indicators

#### Voice/Video
- [x] WebRTC signaling server (Socket.io room + offer/answer/ICE relay)
- [x] Voice join verification endpoint + ICE config
- [x] Voice room join/leave (UI)
- [x] Audio controls (mute, deafen) (UI)
- [x] Speaking indicator UI
- [x] Participant list in room
- [x] Screen share
- [x] Basic video grid

#### Moderation (Basic)
- [x] Kick/ban/timeout endpoints
- [x] Slow mode configuration (UI)
- [x] Word filter setup
- [x] Mod action log endpoint
- [x] Moderation UI in hub settings

#### Web App Shell
- [x] App shell layout (Space Rail, Context Panel, Active Surface)
- [x] Hub icon sidebar with navigation
- [x] Channel/stream/room list sidebar
- [x] Routing structure (Next.js App Router)
- [x] Auth guard and redirect flow
- [x] User presence picker in bottom bar
- [x] User settings modal
- [x] Notification system (in-app)

---

## 24. Open Questions & Decisions

| Question | Options | Status |
|---|---|---|
| Desktop: Tauri vs Electron | Tauri (preferred), Electron (fallback) | Undecided |
| Voice SFU (future): native mesh vs mediasoup | Native mesh for MVP; mediasoup for 8+ participant rooms | Decided: native mesh |
| Deploy target: Railway vs Render vs AWS | Railway for MVP | Undecided |
| Search: Elasticsearch vs Meilisearch | Meilisearch for MVP (simpler) | Undecided |
| AI model for summaries: Claude vs OpenAI vs self-hosted | Claude Haiku (fast, cheap) | Undecided |
| Mobile: MVP or post-launch | Post-launch (web first) | Undecided |
| Monorepo tool: Turborepo vs Nx | Turborepo (recommended) | Undecided |
| ORM: Drizzle vs Prisma | Drizzle (faster, lighter) | Undecided |

---

## Appendix A — Brand Quick Reference

| Property | Value |
|---|---|
| Name | Nexora |
| Tagline | Built for real connection. |
| Hero copy | Your people deserve a better home. |
| Primary violet | `#7C5CFF` (Aurora Violet) |
| Primary cyan | `#39D5FF` (Cyan Pulse) |
| Surface base | `#0B1020` (Midnight Base) |
| Brand fonts | Sora (brand) + Inter (UI) |
| Community = | Hub |
| Category = | Zone |
| Text channel = | Stream |
| Voice/video = | Room |
| Theme = | Aura |
| Live indicator = | Pulse |
| Onboarding flow = | Path |

## Appendix B — Competitive Differentiators Summary

| Feature | Discord | Nexora |
|---|---|---|
| Trust system | Global, one-size | Modular per community |
| Community theming | Minimal | Full Atmosphere/Aura system |
| Presence states | 4 basic | 7 rich states |
| Catch-up summaries | Limited | AI-powered smart catch-up |
| Room purpose modes | None | 8 predefined modes |
| Voice lobby | Static | Dynamic with hover/knock |
| Naming language | Generic | Proprietary (Hub/Zone/Stream/Room) |
| Design feel | Chaotic/gamer | Calm premium |
| Onboarding | Basic | Community-built Paths |
| Reputation | Levels (clout) | Contribution categories |
