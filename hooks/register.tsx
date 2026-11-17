import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { OfficeAgent } from '../types'

// ─── Constantes ────────────────────────────────────────────────────────────

const PANE = 'oficina'
const TITLE = 'Oficina'
const RASTER = 'office'
const MAIN = 'main'
const TICK_MS = 125
const SPEED = 2 // píxeles por tick
const DWELL_MS = 1500 // lo que se quedan al recibir o entregar un encargo
const COFFEE_AFTER_MS = 15000
const TALK_MS = 4500
const MIN_COLUMNS = 56

// Si el panel está abierto: en $.state para que sobreviva a las recargas del mod.
const isOpen = atom({ plugin: 'oficina-agentes', key: 'isOpen' } as const, false)

async function setOpen($: Dollar, value: boolean) {
  paneOpen = value
  try {
    await update($, isOpen, () => value)
  } catch {
    // Sin estado, el interruptor se guía por la variable del módulo.
  }
}

const roster = atom({ plugin: 'oficina-agentes', key: 'roster' } as const, [], {
  shape: 'roster-1',
})

// ─── Paleta ────────────────────────────────────────────────────────────────

const C = {
  wall: 0xd8c9a8,
  wallStripe: 0xd0c09d,
  wallTrim: 0xbfae8a,
  wallCap: 0x5c4a38,
  carpetDot: 0x6f3434,
  glassShine: 0xd6ecf5,
  lampBase: 0x6b5d48,
  lampShade: 0xe9d8a6,
  bulbOn: 0xffd98a,
  bulbOff: 0xd8d0b8,
  deskEdge: 0xd8b088,
  paperShade: 0xd9d9d0,
  keyboard: 0x50555e,
  keys: 0x7a808a,
  monitorTop: 0x3a3f48,
  rackSlot: 0x30353d,
  bubble: 0xfdfdf8,
  paintingFrame: 0x6b4a2a,
  rugs: [0x6f8f8a, 0x8f6f8a, 0x7f8f6a, 0x6a7f9a],
  meetingFloor: 0x5b6b7c,
  meetingGrout: 0x52606f,
  meetChair: 0x2f4858,
  meetChairTop: 0x3d5a6c,
  boardFrame: 0x9aa3ad,
  board: 0xf4f6f8,
  boardTray: 0x7d858f,
  inkBlue: 0x2b59c3,
  inkRed: 0xd1495b,
  inkGreen: 0x2a9d48,
  shelf: 0x7a5230,
  books: [0xb23a48, 0x2b59c3, 0x2a9d8f, 0xe9c46a, 0x6a4c93, 0xf4a261],
  printerStand: 0x8d949c,
  printer: 0xe3e6ea,
  printerSlot: 0x3a3f48,
  bubbleEdge: 0x3a3a40,
  wallBoss: 0xc9d4c5,
  wallBossStripe: 0xbfcbbb,
  baseboard: 0x7a5c3e,
  plankA: 0xa9774b,
  plankB: 0xb07e51,
  seam: 0x8c5f3a,
  carpet: 0x7a3b3b,
  carpetEdge: 0x5e2b2b,
  glass: 0x9cc3d5,
  glassEdge: 0x7fa9bd,
  deskTop: 0xc8a074,
  deskFront: 0x8b5e3c,
  deskLeg: 0x5e3f28,
  bossTop: 0x9a6238,
  bossFront: 0x6e3f22,
  chair: 0x3d3f4a,
  chairTop: 0x4a4d5a,
  bossChair: 0x8e2c2c,
  bossChairTop: 0xa63a3a,
  monitor: 0x2b2f36,
  screenOff: 0x1c2430,
  screenOn: 0x3fa7d6,
  screenLine: 0xbfe6f7,
  paper: 0xf5f5f0,
  cabinet: 0x8796a5,
  cabinetTop: 0xa3b0bd,
  cabinetLine: 0x6b7a89,
  handle: 0xdfe6ec,
  rack: 0x23272e,
  ledOff: 0x3a3f47,
  ledGreen: 0x39d353,
  ledAmber: 0xf4a261,
  counter: 0x6d4c33,
  counterTop: 0x8a6445,
  machine: 0x2f3136,
  red: 0xe63946,
  white: 0xffffff,
  steam: 0xe8e8e8,
  frame: 0xf4f1ea,
  doorFrame: 0x5a3d26,
  door: 0x8b5a34,
  doorDark: 0x2a1d14,
  knob: 0xe9c46a,
  pot: 0xb5562f,
  leaf: 0x3f8f3a,
  leafLight: 0x5bb04f,
  pants: 0x2d3446,
  shoes: 0x1b1e26,
  eye: 0x1b1e26,
  tie: 0x1f2a44,
  default: 0x01000000,
}

const KIND_COLOR: Record<string, number> = {
  main: 0xe8823a,
  Explore: 0x3a86ff,
  Plan: 0x9b5de5,
  'general-purpose': 0x2a9d8f,
  fork: 0xe0b100,
}
const EXTRA_COLORS = [0xe63946, 0x06d6a0, 0xff70a6, 0x8ac926, 0x4cc9f0, 0xf77f00]
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac]
const HAIRS = [0x2b1d14, 0x5a3825, 0xd6b370, 0x1c1c1c, 0xa0522d, 0x6b6b6b]

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

const pick = <T,>(list: readonly T[], n: number): T => list[n % list.length] as T

function shirtOf(a: OfficeAgent) {
  return KIND_COLOR[a.kind] ?? pick(EXTRA_COLORS, hash(a.kind))
}

function darken(color: number, f = 0.6) {
  const r = ((color >> 16) & 255) * f
  const g = ((color >> 8) & 255) * f
  const b = (color & 255) * f
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`

// ─── Distribución de la oficina ────────────────────────────────────────────
//
// Pared con muebles arriba y pasillo (lane) delante. A la izquierda, el
// despacho del jefe y, debajo, la sala de reuniones con la pizarra. El resto
// son islas de 4 puestos: dos de cara (detrás de la mesa) y dos de espaldas.

type Pt = { x: number; y: number }
type StationId = 'archivo' | 'estanteria' | 'servidor' | 'impresora' | 'ventana' | 'cafe'
type Station = { x: number; w: number; spot: Pt }

type Seat = {
  x: number
  /** Pies del agente sentado. */
  y: number
  face: 'down' | 'up'
  aisle: number
  /** Dónde brilla su pantalla. */
  screen: Pt
  island: number
}

type Island = { x: number; y: number; lamp: Pt; rug: number }

type Meeting = {
  top: number
  doorY: number
  table: { x: number; y: number; w: number }
  seats: Seat[]
  board: Pt
  boardSpot: Pt
}

type Layout = {
  cols: number
  rows: number
  W: number
  H: number
  wallH: number
  lane: number
  bossW: number
  /** Pasillo vertical que baja junto a la mampara hasta la sala de reuniones. */
  sideAisle: number
  bossDesk: Pt
  bossSeat: Pt
  bossVisit: Pt
  bossWindow?: number
  islands: Island[]
  seats: Seat[]
  stations: Partial<Record<StationId, Station>>
  window?: number
  paintings: { x: number; seed: number }[]
  door: { x: number; spot: Pt; inside: Pt }
  plants: Pt[]
  lamps: number[]
  meeting?: Meeting
}

const ISLAND_W = 24
const ISLAND_STEP = 28
const ISLAND_ROW = 19

function islandSeats(ix: number, iy: number, island: number): Seat[] {
  const left = ix - 3
  const right = ix + ISLAND_W + 2
  return [
    { x: ix + 8, y: iy + 1, face: 'down', aisle: left, screen: { x: ix + 3, y: iy - 3 }, island },
    { x: ix + 15, y: iy + 1, face: 'down', aisle: right, screen: { x: ix + 20, y: iy - 3 }, island },
    { x: ix + 7, y: iy + 9, face: 'up', aisle: left, screen: { x: ix + 6, y: iy }, island },
    { x: ix + 16, y: iy + 9, face: 'up', aisle: right, screen: { x: ix + 15, y: iy }, island },
  ]
}

function makeLayout(cols: number, rows: number): Layout {
  const W = cols
  const H = rows * 2
  const wallH = 10
  const lane = wallH + 4
  const bossW = Math.min(36, Math.max(20, Math.round(W * 0.26)))
  const sideAisle = bossW + 2
  const bossDesk = { x: Math.max(2, Math.round((bossW - 20) / 2)), y: lane + 12 }
  const bossSeat = { x: bossDesk.x + 10, y: bossDesk.y + 1 }
  const bossVisit = { x: bossDesk.x + 18, y: bossDesk.y + 2 }

  // Muebles de pared, de izquierda a derecha, mientras quepan
  const door = { x: W - 9, spot: { x: W - 6, y: lane }, inside: { x: W - 6, y: wallH - 1 } }
  const cafeX = door.x - 11
  const stations: Partial<Record<StationId, Station>> = {
    cafe: { x: cafeX, w: 9, spot: { x: cafeX + 4, y: lane } },
  }
  const order: [StationId, number][] = [
    ['archivo', 6],
    ['servidor', 6],
    ['estanteria', 8],
    ['ventana', 12],
    ['impresora', 6],
  ]
  let cursor = bossW + 4
  const taken: [number, number][] = [[cafeX - 1, W]]
  for (const [id, w] of order) {
    if (cursor + w > cafeX - 2) continue
    stations[id] = { x: cursor, w, spot: { x: cursor + Math.floor(w / 2), y: lane } }
    taken.push([cursor - 1, cursor + w + 1])
    cursor += w + 2
  }
  const windowX = stations.ventana?.x

  // Cuadros en los huecos de pared que sobran
  const paintings: { x: number; seed: number }[] = []
  for (let x = cursor; x + 7 < cafeX - 2; x += 10) {
    paintings.push({ x, seed: x })
    taken.push([x - 1, x + 8])
  }

  // Islas de mesas
  const x0 = bossW + 7
  const perRow = Math.max(1, Math.floor((W - 1 - 3 - x0 - ISLAND_W) / ISLAND_STEP) + 1)
  const islands: Island[] = []
  const seats: Seat[] = []
  for (let iy = lane + 12; iy + 11 <= H - 1; iy += ISLAND_ROW) {
    for (let c = 0; c < perRow; c++) {
      const ix = x0 + c * ISLAND_STEP
      const n = islands.length
      islands.push({ x: ix, y: iy, lamp: { x: ix + 11, y: iy - 1 }, rug: n })
      seats.push(...islandSeats(ix, iy, n))
    }
  }

  // Sala de reuniones debajo del despacho, si hay sitio
  let meeting: Meeting | undefined
  const top = bossDesk.y + 14
  if (bossW >= 22 && H - top >= 28) {
    const doorY = top + 11
    const tw = Math.min(16, bossW - 7)
    const tx = Math.max(2, Math.round((bossW - 4 - tw) / 2))
    const ty = top + 17
    const seatXs = [tx + 4, tx + tw - 5]
    const mseats: Seat[] = [
      ...seatXs.map((x) => ({ x, y: ty + 1, face: 'down' as const, aisle: bossW - 3, screen: { x, y: ty }, island: -1 })),
      ...seatXs.map((x) => ({ x, y: ty + 9, face: 'up' as const, aisle: bossW - 3, screen: { x, y: ty }, island: -1 })),
    ]
    meeting = {
      top,
      doorY,
      table: { x: tx, y: ty, w: tw },
      seats: mseats,
      board: { x: 2, y: top + 2 },
      boardSpot: { x: 8, y: doorY },
    }
  }

  const plants: Pt[] = [{ x: W - 4, y: H - 2 }, { x: bossW + 3, y: H - 2 }]
  if (!meeting) plants.push({ x: 1, y: H - 2 })
  else plants.push({ x: bossW - 4, y: H - 2 }, { x: 1, y: meeting.top - 2 })

  // Apliques donde no estorban
  const lamps: number[] = []
  if (bossW >= 18) lamps.push(2)
  for (let x = bossW + 4; x < W - 4; x += 9) {
    if (!taken.some(([from, to]) => x + 3 > from && x < to) && !lamps.some((l) => Math.abs(l - x) < 12)) lamps.push(x)
  }

  return {
    cols,
    rows,
    W,
    H,
    wallH,
    lane,
    bossW,
    sideAisle,
    bossDesk,
    bossSeat,
    bossVisit,
    bossWindow: bossW >= 18 ? Math.round(bossW / 2 - 5) : undefined,
    islands,
    seats,
    stations,
    window: windowX,
    paintings,
    door,
    plants,
    lamps,
    meeting,
  }
}

// ─── Estado del módulo ─────────────────────────────────────────────────────

// Copia local de la lista para el reloj; la de verdad está en $.state.
let mirror: OfficeAgent[] = []
let layout: Layout | undefined
let canDraw = false
let lastFrame = ''
let ticker: { cancel: () => void } | undefined
let ticking = false
let tickCount = 0
let openedOnce = false
let paneOpen = false

type Sim = {
  id: string
  x: number
  y: number
  path: Pt[]
  goalKey: string
  /** Camino de vuelta al pasillo desde donde está. */
  exit?: Pt[]
  /** El destino al que va, para saber cómo colocarse al llegar. */
  pending?: Goal
  arrivedAt: number
  sit: boolean
  moving: boolean
  step: number
  briefed: boolean
  reported: boolean
  gone: boolean
  /** Hasta cuándo espera tras la puerta: los que llegan a la vez entran de uno en uno. */
  waitUntil: number
  dir: Dir
}
let lastEntry = 0
const sims = new Map<string, Sim>()

type Dollar = EngineInterface

async function apply($: Dollar, fn: (list: OfficeAgent[]) => OfficeAgent[]) {
  mirror = fn(mirror)
  try {
    await update($, roster, (list: OfficeAgent[] | undefined) => fn(list ?? []))
  } catch {
    // Si falla la escritura, la copia local sigue sirviendo para la animación.
  }
}

// ─── Herramientas → sitio y texto ──────────────────────────────────────────

function arg(e: unknown, key: string): string | undefined {
  const value = (e as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

const base = (path?: string) => (path ? (path.split(/[\\/]/).pop() ?? path) : '')
const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

function stationFor(tool?: string): StationId | undefined {
  if (!tool) return undefined
  if (['Read', 'NotebookRead'].includes(tool)) return 'estanteria'
  if (['Grep', 'Glob'].includes(tool)) return 'archivo'
  if (tool === 'Write') return 'impresora'
  if (['Bash', 'PowerShell', 'Monitor'].includes(tool)) return 'servidor'
  if (['WebFetch', 'WebSearch'].includes(tool) || tool.startsWith('mcp__')) return 'ventana'
  return undefined
}

function describeTool(e: { tool: string }): string {
  const file = base(arg(e, 'file_path') ?? arg(e, 'notebook_path') ?? arg(e, 'path'))
  switch (e.tool) {
    case 'Read':
      return `leyendo ${file}`
    case 'Grep':
      return `buscando «${clip(arg(e, 'pattern') ?? '', 24)}»`
    case 'Glob':
      return 'buscando archivos'
    case 'Write':
      return `escribiendo ${file}`
    case 'Edit':
      return `editando ${file}`
    case 'Bash':
    case 'PowerShell':
      return `ejecutando ${clip(arg(e, 'description') ?? 'un comando', 32)}`
    case 'WebFetch':
      return 'consultando una web'
    case 'WebSearch':
      return 'buscando en internet'
    case 'Agent':
      return `delegando: ${clip(arg(e, 'description') ?? '', 30)}`
    case 'SendMessage':
      return `hablando con ${arg(e, 'to') ?? 'alguien'}`
    case 'Skill':
      return `usando la skill ${arg(e, 'skill') ?? ''}`
    default:
      return e.tool.startsWith('mcp__') ? `usando ${e.tool.split('__').pop()}` : `usando ${e.tool}`
  }
}

function activityOf(a: OfficeAgent, now: number) {
  if (a.status === 'done') return 'terminado, entregando el informe'
  if (a.detail) return a.detail
  if (a.id !== MAIN && now - a.lastActive > COFFEE_AFTER_MS) return 'tomando un café'
  if (a.team) return 'en la sala de reuniones'
  if (a.kind === 'Plan') return 'pensando en la pizarra'
  return 'pensando'
}

// ─── Destinos y rutas ──────────────────────────────────────────────────────
//
// Cada destino lleva su "entrada": los puntos desde el pasillo de arriba hasta
// él. Al llegar se guarda al revés como salida, así nadie atraviesa una mesa.

type Goal = { key: string; pt: Pt; entry: Pt[]; sit: boolean; face?: Dir }

/** El sitio de herramienta que existe en esta distribución. */
function stationOf(L: Layout, tool?: string): StationId | undefined {
  const wanted = stationFor(tool)
  if (!wanted) return undefined
  if (L.stations[wanted]) return wanted
  if (wanted === 'estanteria' && L.stations.archivo) return 'archivo'
  return undefined
}

function meetingEntry(L: Layout, m: Meeting): Pt[] {
  return [
    { x: L.sideAisle, y: L.lane },
    { x: L.sideAisle, y: m.doorY },
  ]
}

function seatGoal(L: Layout, seat: Seat, key: string): Goal {
  if (seat.island < 0 && L.meeting) {
    return {
      key,
      pt: { x: seat.x, y: seat.y },
      entry: [...meetingEntry(L, L.meeting), { x: seat.aisle, y: L.meeting.doorY }, { x: seat.aisle, y: seat.y }],
      sit: true,
      face: seat.face,
    }
  }
  return {
    key,
    pt: { x: seat.x, y: seat.y },
    entry: [
      { x: seat.aisle, y: L.lane },
      { x: seat.aisle, y: seat.y },
    ],
    sit: true,
    face: seat.face,
  }
}

/** Puesto en la sala de reuniones de un miembro de un equipo o workflow. */
function meetingSeatOf(L: Layout, a: OfficeAgent): Seat | undefined {
  if (!a.team || !L.meeting) return undefined
  const team = mirror
    .filter((b) => b.team && b.status === 'working')
    .sort((p, q) => p.startedAt - q.startedAt)
  const i = team.findIndex((b) => b.id === a.id)
  return i >= 0 ? L.meeting.seats[i] : undefined
}

/** Dónde se pone alguien que viene a hablar con este agente. */
function visitSpot(L: Layout, targetId: string): Goal {
  const boss: Goal = { key: `visit:${MAIN}`, pt: L.bossVisit, entry: [{ x: L.bossVisit.x, y: L.lane }], sit: false, face: 'left' }
  if (targetId === MAIN) return boss
  const target = mirror.find((a) => a.id === targetId)
  if (!target) return boss
  if ((target.team || target.kind === 'Plan') && L.meeting) {
    const m = L.meeting
    return {
      key: `visit:${targetId}`,
      pt: { x: L.bossW - 3, y: m.doorY },
      entry: meetingEntry(L, m),
      sit: false,
      face: 'left',
    }
  }
  const seat = L.seats[target.desk]
  if (!seat) return boss
  return {
    key: `visit:${targetId}`,
    pt: { x: seat.aisle, y: seat.y },
    entry: [{ x: seat.aisle, y: L.lane }],
    sit: false,
    face: seat.aisle < seat.x ? 'right' : 'left',
  }
}

function slotOffset(id: string, key: string) {
  const others = [...sims.values()].filter((s) => s.goalKey === key && s.id !== id).length
  return pick([0, -4, 4, -8, 8], others)
}

/** Los que visitan a la misma persona hacen cola, uno detrás de otro. */
function queued(g: Goal, key: string, sim: Sim): Goal {
  if (sim.goalKey === key) return { ...g, key }
  const ahead = [...sims.values()].filter((s) => s.goalKey === key && s.id !== sim.id).length
  const dy = Math.min(ahead, 2) * 5
  const dx = ahead > 2 ? (ahead - 2) * 4 : 0
  return { ...g, key, pt: { x: g.pt.x + dx, y: g.pt.y + dy } }
}

function stationGoal(L: Layout, st: StationId, a: OfficeAgent, sim: Sim): Goal {
  const key = `st:${st}`
  const spot = (L.stations[st] as Station).spot
  const dx = sim.goalKey === key ? 0 : slotOffset(a.id, key)
  return { key, pt: { x: spot.x + dx, y: spot.y }, entry: [], sit: false, face: st === 'cafe' ? 'down' : 'up' }
}

function goalFor(L: Layout, a: OfficeAgent, sim: Sim, now: number): Goal {
  const arrivedFor = sim.arrivedAt ? now - sim.arrivedAt : 0

  if (a.id === MAIN) {
    const st = stationOf(L, a.tool)
    if (st) return stationGoal(L, st, a, sim)
    return { key: 'desk', pt: L.bossSeat, entry: [{ x: L.bossSeat.x, y: L.lane }], sit: true, face: 'down' }
  }

  if (a.status === 'done') {
    if (!sim.reported) {
      const g = visitSpot(L, a.parent)
      const key = `report:${g.key}`
      if (sim.goalKey === key && !sim.path.length && arrivedFor > DWELL_MS) sim.reported = true
      else return queued(g, key, sim)
    }
    if (sim.goalKey === 'exit' || (sim.goalKey === 'door' && !sim.path.length)) {
      if (sim.goalKey === 'exit' && !sim.path.length) sim.gone = true
      return { key: 'exit', pt: L.door.inside, entry: [L.door.spot], sit: false }
    }
    return { key: 'door', pt: L.door.spot, entry: [], sit: false }
  }

  if (!sim.briefed) {
    const g = visitSpot(L, a.parent)
    const key = `brief:${g.key}`
    if (sim.goalKey === key && !sim.path.length && arrivedFor > DWELL_MS) sim.briefed = true
    else return queued(g, key, sim)
  }

  if (a.talkTo && (a.talkUntil ?? 0) > now) {
    const g = visitSpot(L, a.talkTo)
    return queued(g, `talk:${g.key}`, sim)
  }

  const st = stationOf(L, a.tool) ?? (!a.tool && now - a.lastActive > COFFEE_AFTER_MS ? 'cafe' : undefined)
  if (st) return stationGoal(L, st, a, sim)

  const mseat = meetingSeatOf(L, a)
  if (mseat) return seatGoal(L, mseat, 'meet')

  // Plan piensa de pie delante de la pizarra
  if (a.kind === 'Plan' && L.meeting) {
    const m = L.meeting
    const key = 'board'
    const dx = sim.goalKey === key ? 0 : slotOffset(a.id, key)
    return {
      key,
      pt: { x: m.boardSpot.x + dx, y: m.boardSpot.y },
      entry: meetingEntry(L, m),
      sit: false,
      face: 'up',
    }
  }

  const seat = L.seats[a.desk]
  if (seat) return seatGoal(L, seat, 'desk')
  // Sin mesa libre: se queda de pie en el pasillo.
  const extra = a.desk - L.seats.length
  const x = L.bossW + 8 + ((extra * 6) % Math.max(6, L.W - L.bossW - 20))
  return { key: 'standing', pt: { x, y: L.lane + 3 }, entry: [], sit: false }
}

function route(L: Layout, sim: Sim, goal: Goal): Pt[] {
  const pts: Pt[] = []
  let cur = { x: Math.round(sim.x), y: Math.round(sim.y) }
  const push = (p: Pt) => {
    if (p.x !== cur.x || p.y !== cur.y) {
      pts.push(p)
      cur = p
    }
  }
  for (const p of sim.exit ?? []) push(p)
  push({ x: cur.x, y: L.lane })
  const first = goal.entry[0]
  push({ x: first ? first.x : goal.pt.x, y: L.lane })
  for (const p of goal.entry) push(p)
  // Último tramo: primero en horizontal y luego en vertical, o al revés si se
  // llega por un pasillo vertical (para no cruzar la mesa).
  if (cur.x !== goal.pt.x && cur.y !== goal.pt.y) push({ x: cur.x, y: goal.pt.y })
  push(goal.pt)
  return pts
}

function exitFrom(goal: Goal): Pt[] {
  return [...goal.entry].reverse()
}

function newSim(L: Layout, a: OfficeAgent, now: number): Sim {
  const fresh = a.id !== MAIN && now - a.startedAt < 4000
  const sim: Sim = {
    id: a.id,
    x: L.door.inside.x,
    y: L.door.inside.y,
    path: [],
    goalKey: '',
    arrivedAt: 0,
    sit: false,
    moving: false,
    step: 0,
    briefed: !fresh,
    reported: false,
    gone: false,
    waitUntil: 0,
    dir: 'down',
  }
  if (fresh) {
    sim.waitUntil = Math.max(now, lastEntry + 900)
    lastEntry = sim.waitUntil
  } else {
    // Tras recargar el mod (o al abrir el panel tarde) cada uno aparece ya en su sitio.
    const g = goalFor(L, a, sim, now)
    sim.x = g.pt.x
    sim.y = g.pt.y
    sim.dir = g.face ?? 'down'
    sim.goalKey = g.key
    sim.exit = exitFrom(g)
    sim.sit = g.sit
    sim.arrivedAt = now - DWELL_MS - 1
  }
  return sim
}

/** Avanza la simulación un tick y devuelve los ids de quien ya ha salido. */
function step(L: Layout, now: number): string[] {
  const gone: string[] = []
  for (const a of mirror) {
    let sim = sims.get(a.id)
    if (!sim) {
      sim = newSim(L, a, now)
      sims.set(a.id, sim)
    }
    if (now < sim.waitUntil) continue
    const g = goalFor(L, a, sim, now)
    if (sim.gone) {
      gone.push(a.id)
      continue
    }
    if (g.key !== sim.goalKey) {
      sim.path = route(L, sim, g)
      sim.exit = undefined
      sim.goalKey = g.key
      sim.arrivedAt = 0
      sim.sit = false
      sim.pending = g
    }
    let budget = SPEED
    sim.moving = sim.path.length > 0
    while (budget > 0 && sim.path.length) {
      const next = sim.path[0] as Pt
      const dx = next.x - sim.x
      const dy = next.y - sim.y
      const dist = Math.abs(dx) + Math.abs(dy)
      if (dx !== 0) sim.dir = dx < 0 ? 'left' : 'right'
      else if (dy !== 0) sim.dir = dy < 0 ? 'up' : 'down'
      if (dist <= budget) {
        sim.x = next.x
        sim.y = next.y
        budget -= dist
        sim.path.shift()
      } else {
        sim.x += Math.sign(dx) * Math.min(budget, Math.abs(dx))
        sim.y += dx === 0 ? Math.sign(dy) * budget : 0
        budget = 0
      }
    }
    if (sim.moving) sim.step++
    if (!sim.path.length && !sim.arrivedAt) {
      const arrived = sim.pending ?? g
      sim.arrivedAt = now
      sim.sit = arrived.sit
      sim.dir = arrived.face ?? 'down'
      sim.exit = exitFrom(arrived)
      sim.pending = undefined
    }
  }
  for (const id of [...sims.keys()]) if (!mirror.some((a) => a.id === id)) sims.delete(id)
  return gone
}

// ─── Dibujo ────────────────────────────────────────────────────────────────

let px = new Uint32Array(0)
let W = 0
let H = 0
type Label = { row: number; col: number; text: string; fg: number; bg: number }
let labels: Label[] = []

type Dir = 'down' | 'up' | 'left' | 'right'
type Palette = 'calida' | 'pastel' | 'retro' | 'neon'
type LightMode = 'auto' | 'dia' | 'tarde' | 'noche'
const PALETTES: Palette[] = ['calida', 'pastel', 'retro', 'neon']
const LIGHTS: LightMode[] = ['auto', 'dia', 'tarde', 'noche']
let palette: Palette = 'calida'
let lightMode: LightMode = 'auto'

function put(x: number, y: number, c: number) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= W || y >= H) return
  px[y * W + x] = c
}

function rect(x: number, y: number, w: number, h: number, c: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c)
}

/** Oscurece lo que ya hay pintado: sombras. */
function shade(x: number, y: number, w: number, h: number, f: number) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const X = Math.round(x + i)
      const Y = Math.round(y + j)
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue
      px[Y * W + X] = darken(px[Y * W + X] ?? 0, f)
    }
  }
}

const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const
const pack = (r: number, g: number, b: number) =>
  (Math.max(0, Math.min(255, Math.round(r))) << 16) |
  (Math.max(0, Math.min(255, Math.round(g))) << 8) |
  Math.max(0, Math.min(255, Math.round(b)))

function mix(a: number, b: number, t: number) {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return pack(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

type Phase = 'dia' | 'tarde' | 'noche'

function phaseNow(): Phase {
  if (lightMode !== 'auto') return lightMode
  const hour = new Date().getHours()
  if (hour >= 8 && hour < 18) return 'dia'
  if (hour >= 6 && hour < 21) return 'tarde'
  return 'noche'
}

const SKY: Record<Phase, { sky: number; accent: number }> = {
  dia: { sky: 0x9fd3f0, accent: 0xfff3b0 },
  tarde: { sky: 0xf4a261, accent: 0xffe0a3 },
  noche: { sky: 0x1d2b4f, accent: 0xf1f1d0 },
}

function drawWindow(x: number, y: number, w: number, h: number, seed: number, phase: Phase) {
  const { sky, accent } = SKY[phase]
  rect(x - 1, y - 1, w + 2, h + 2, darken(C.frame, 0.8))
  rect(x, y, w, h, C.frame)
  rect(x + 1, y + 1, w - 2, h - 2, sky)
  if (phase === 'noche') {
    put(x + 2 + (seed % 3), y + 2, accent)
    put(x + w - 3, y + 3, accent)
    put(x + w - 4, y + 2, 0xd8dcc0) // luna
  } else {
    const cx = x + 1 + (((tickCount >> 4) + seed) % (w - 4))
    rect(cx, y + 2, 3, 1, 0xffffff)
    put(x + w - 3, y + 2, accent)
  }
  for (let j = 1; j < h - 1; j++) put(x + Math.floor(w / 2), y + j, C.frame)
  // Alféizar
  rect(x - 1, y + h, w + 2, 1, darken(C.frame, 0.7))
}

function drawPainting(x: number, seed: number) {
  rect(x, 3, 7, 5, C.paintingFrame)
  const sky = pick([0x9fd3f0, 0xf4c27a, 0xc9b6e4], seed)
  const land = pick([0x5bb04f, 0x3f8f3a, 0xd98c5f], seed >> 2)
  rect(x + 1, 4, 5, 3, sky)
  rect(x + 1, 6, 5, 1, land)
  put(x + 2 + (seed % 3), 5, land)
  put(x + 4, 4, pick([0xfff3b0, 0xffffff, 0xe63946], seed >> 4))
}

function drawBackground(L: Layout, phase: Phase) {
  const { wallH, bossW } = L
  const m = L.meeting
  const bossBottom = m ? m.top : H
  // Pared, con remate oscuro arriba para darle grosor
  for (let y = 0; y < wallH; y++) {
    for (let x = 0; x < W; x++) {
      const boss = x < bossW
      const stripe = x % 6 === 0
      put(x, y, boss ? (stripe ? C.wallBossStripe : C.wallBoss) : stripe ? C.wallStripe : C.wall)
    }
  }
  rect(0, 0, W, 1, C.wallCap)
  rect(0, 1, W, 1, C.wallTrim)
  rect(0, wallH - 2, W, 1, darken(C.baseboard, 1.15))
  rect(0, wallH - 1, W, 1, C.baseboard)
  // Suelo de tablones
  for (let y = wallH; y < H; y++) {
    const band = Math.floor((y - wallH) / 3)
    for (let x = bossW; x < W; x++) {
      const seam = (x + band * 5) % 12 === 0
      const grain = hash(`${x >> 2},${band}`) % 7 === 0
      const plank = band % 2 ? C.plankA : C.plankB
      put(x, y, seam ? C.seam : grain ? darken(plank, 0.94) : plank)
    }
  }
  // Alfombras bajo las islas
  for (const isl of L.islands) {
    const color = pick(C.rugs, isl.rug)
    rect(isl.x - 2, isl.y - 7, ISLAND_W + 4, 19, darken(color, 0.82))
    rect(isl.x - 1, isl.y - 6, ISLAND_W + 2, 17, color)
    for (let x = isl.x; x < isl.x + ISLAND_W; x += 3) {
      put(x, isl.y - 6, darken(color, 1.15))
      put(x, isl.y + 10, darken(color, 1.15))
    }
  }
  // Moqueta del despacho
  rect(0, wallH, bossW, bossBottom - wallH, C.carpetEdge)
  rect(1, wallH + 1, bossW - 2, bossBottom - wallH - 2, C.carpet)
  for (let y = wallH + 2; y < bossBottom - 1; y += 2) {
    for (let x = 2 + (y % 4 === 0 ? 1 : 0); x < bossW - 1; x += 4) put(x, y, C.carpetDot)
  }
  // Sala de reuniones: baldosas y cristal arriba
  if (m) {
    for (let y = m.top + 1; y < H; y++) {
      for (let x = 0; x < bossW; x++) {
        put(x, y, x % 5 === 0 || (y - m.top) % 5 === 0 ? C.meetingGrout : C.meetingFloor)
      }
    }
    for (let x = 0; x < bossW; x++) put(x, m.top, x % 4 === 0 ? C.glassEdge : C.glass)
  }
  // Mampara de cristal, con una puerta para el despacho y otra para la sala
  const gaps: [number, number][] = [[L.lane - 9, L.lane + 1]]
  if (m) gaps.push([m.doorY - 9, m.doorY + 1])
  for (let y = 0; y < H; y++) {
    if (y < wallH) put(bossW, y, C.baseboard)
    else if (!gaps.some(([from, to]) => y >= from && y <= to)) {
      put(bossW, y, y % 4 === 0 ? C.glassEdge : C.glass)
      if (y % 5 === 0) put(bossW, y, C.glassShine)
    }
  }
  // Ventanas, cuadros y apliques
  if (L.bossWindow !== undefined) drawWindow(L.bossWindow, 3, 10, 5, 1, phase)
  if (L.window !== undefined) drawWindow(L.window, 3, 12, 5, 5, phase)
  for (const p of L.paintings) drawPainting(p.x, p.seed)
  for (const x of L.lamps) {
    rect(x, 2, 3, 1, C.lampBase)
    put(x + 1, 3, phase === 'noche' || phase === 'tarde' ? C.bulbOn : C.bulbOff)
  }
  // Puerta
  const d = L.door.x
  const someoneInDoor = [...sims.values()].some((s) => Math.abs(s.x - L.door.inside.x) < 4 && s.y < L.lane)
  rect(d, wallH - 9, 7, 9, C.doorFrame)
  rect(d + 1, wallH - 8, 5, 8, someoneInDoor ? C.doorDark : C.door)
  if (!someoneInDoor) {
    rect(d + 2, wallH - 7, 3, 2, darken(C.door, 0.85))
    rect(d + 2, wallH - 4, 3, 2, darken(C.door, 0.85))
    put(d + 5, wallH - 4, C.knob)
  }
}

/** Sombras de todo lo que está en el suelo; la luz viene de arriba a la izquierda. */
function drawShadows(L: Layout) {
  const { wallH, bossW } = L
  shade(0, wallH, W, 1, 0.78)
  shade(0, wallH + 1, W, 1, 0.9)
  shade(bossW + 1, wallH, 1, H - wallH, 0.86)
  for (const isl of L.islands) {
    shade(isl.x + 1, isl.y + 5, ISLAND_W, 1, 0.72)
    shade(isl.x + ISLAND_W, isl.y + 1, 1, 4, 0.8)
  }
  const b = L.bossDesk
  shade(b.x + 1, b.y + 6, 18, 1, 0.72)
  shade(b.x + 18, b.y + 2, 1, 4, 0.8)
  if (L.meeting) {
    const t = L.meeting.table
    shade(t.x + 1, t.y + 5, t.w, 1, 0.72)
    shade(L.meeting.board.x + 1, L.meeting.board.y + 9, 12, 1, 0.75)
  }
  for (const st of Object.values(L.stations)) {
    if (!st || st === L.stations.ventana) continue
    shade(st.x + 1, wallH + 2, st.w, 1, 0.75)
  }
  for (const p of L.plants) shade(p.x, p.y + 1, 4, 1, 0.72)
  for (const sim of sims.values()) {
    if (sim.sit || Date.now() < sim.waitUntil || sim.y < wallH) continue
    shade(Math.round(sim.x) - 2, Math.round(sim.y) + 1, 5, 1, 0.7)
    shade(Math.round(sim.x) - 1, Math.round(sim.y) + 2, 3, 1, 0.88)
  }
}

type Drawable = { base: number; draw: () => void }

function colorsFor(a: OfficeAgent): Record<string, number> {
  const n = hash(a.id)
  return {
    H: pick(HAIRS, n),
    S: pick(SKINS, n >> 3),
    E: C.eye,
    T: shirtOf(a),
    t: darken(shirtOf(a), 0.78),
    K: C.tie,
    P: C.pants,
    B: C.shoes,
  }
}

const isTyping = (a: OfficeAgent | undefined, sim: Sim | undefined) =>
  !!(a && sim?.sit && a.tool !== undefined && (sim.goalKey === 'desk' || sim.goalKey === 'meet'))

function keyboard(x: number, y: number, a: OfficeAgent | undefined, sim: Sim | undefined) {
  rect(x, y, 5, 1, C.keyboard)
  put(x + 1, y, C.keys)
  put(x + 3, y, C.keys)
  if (a && isTyping(a, sim)) {
    const skin = colorsFor(a).S ?? C.white
    const k = tickCount % 2
    put(x + 1 + k, y, skin)
    put(x + 3 + k, y, skin)
  }
}

function screenOn(owner: OfficeAgent | undefined): boolean {
  const sim = owner ? sims.get(owner.id) : undefined
  return !!(sim?.sit && (sim.goalKey === 'desk' || sim.goalKey === 'meet'))
}

function screenLines(x: number, y: number, owner: OfficeAgent | undefined) {
  const sim = owner ? sims.get(owner.id) : undefined
  const k = isTyping(owner, sim) ? tickCount : 0
  put(x + (k % 3), y, C.screenLine)
  put(x + ((k + 1) % 2), y + 1, C.screenLine)
}

function chairBack(x: number, y: number, color = C.chair, top = C.chairTop) {
  rect(x, y, 5, 5, color)
  rect(x, y, 5, 1, top)
  put(x, y + 4, darken(color, 0.8))
  put(x + 4, y + 4, darken(color, 0.8))
}

/** Respaldo de una silla vista por detrás, delante de quien se sienta de espaldas. */
function chairFront(seat: Seat, color = C.chair, top = C.chairTop): Drawable {
  return {
    base: seat.y + 0.2,
    draw: () => {
      rect(seat.x - 2, seat.y - 2, 5, 3, color)
      rect(seat.x - 2, seat.y - 2, 5, 1, top)
      put(seat.x - 2, seat.y + 1, darken(color, 0.7))
      put(seat.x + 2, seat.y + 1, darken(color, 0.7))
    },
  }
}

function islandDrawables(L: Layout, bySeat: Map<number, OfficeAgent>, phase: Phase): Drawable[] {
  const out: Drawable[] = []
  L.islands.forEach((isl, n) => {
    const { x, y } = isl
    const seats = L.seats.map((s, i) => ({ s, i })).filter(({ s }) => s.island === n)
    for (const { s } of seats) {
      if (s.face === 'down') out.push({ base: y - 0.5, draw: () => chairBack(s.x - 2, y - 5) })
      else out.push(chairFront(s))
    }
    const anyone = seats.some(({ i }) => screenOn(bySeat.get(i)))
    out.push({
      base: y + 5,
      draw: () => {
        // Mesa compartida
        rect(x, y, ISLAND_W, 3, C.deskTop)
        rect(x, y, ISLAND_W, 1, C.deskEdge)
        rect(x + 1, y + 1, ISLAND_W - 2, 1, darken(C.deskTop, 0.95))
        rect(x, y + 3, ISLAND_W, 2, C.deskFront)
        rect(x, y + 5, 1, 1, C.deskLeg)
        rect(x + ISLAND_W - 1, y + 5, 1, 1, C.deskLeg)
        for (const { s, i } of seats) {
          const owner = bySeat.get(i)
          const on = screenOn(owner)
          if (s.face === 'down') {
            // Monitor al lado, teclado delante
            const mx = s.x < x + ISLAND_W / 2 ? x + 1 : x + ISLAND_W - 6
            rect(mx, y - 5, 5, 4, C.monitor)
            rect(mx, y - 5, 5, 1, C.monitorTop)
            put(mx + 2, y - 1, C.monitor)
            rect(mx + 1, y - 4, 3, 2, on ? C.screenOn : C.screenOff)
            if (on) screenLines(mx + 1, y - 4, owner)
            keyboard(s.x - 2, y + 1, owner, owner ? sims.get(owner.id) : undefined)
          } else {
            // Portátil, con la pantalla hacia quien está de espaldas
            rect(s.screen.x - 2, y, 4, 2, C.monitor)
            rect(s.screen.x - 1, y, 2, 1, on ? C.screenOn : C.screenOff)
            if (on && tickCount % 4 < 2) put(s.screen.x - 1, y, C.screenLine)
            rect(s.screen.x - 2, y + 2, 4, 1, C.keyboard)
          }
        }
        // Flexo compartido en el centro
        const lamp = isl.lamp
        rect(lamp.x, lamp.y - 2, 3, 1, C.lampShade)
        put(lamp.x + 1, lamp.y - 1, C.lampBase)
        put(lamp.x + 1, lamp.y, C.lampBase)
        if (anyone && phase !== 'dia') put(lamp.x + 1, lamp.y - 1, C.bulbOn)
        put(x + 11, y + 2, C.paper)
        put(x + 12, y + 2, C.paperShade)
      },
    })
  })
  return out
}

function meetingDrawables(L: Layout): Drawable[] {
  const m = L.meeting
  if (!m) return []
  const out: Drawable[] = []
  const t = m.table
  for (const s of m.seats) {
    if (s.face === 'down') out.push({ base: t.y - 0.5, draw: () => chairBack(s.x - 2, t.y - 5, C.meetChair, C.meetChairTop) })
    else out.push(chairFront(s, C.meetChair, C.meetChairTop))
  }
  out.push({
    base: t.y + 5,
    draw: () => {
      rect(t.x, t.y, t.w, 3, C.bossTop)
      rect(t.x, t.y, t.w, 1, darken(C.bossTop, 1.12))
      rect(t.x, t.y + 3, t.w, 2, C.bossFront)
      // Papeles y vasos sobre la mesa
      put(t.x + 2, t.y + 1, C.paper)
      put(t.x + t.w - 3, t.y + 1, C.paper)
      put(t.x + Math.floor(t.w / 2), t.y + 1, C.white)
    },
  })
  // Pizarra con lo que va pensando Plan
  const b = m.board
  const planners = mirror.filter((a) => a.kind === 'Plan' && a.status === 'working')
  const ink = planners.reduce((sum, a) => sum + a.toolCount, 0) + planners.length * 3
  const writing = [...sims.values()].some((s) => s.goalKey === 'board' && !s.path.length)
  out.push({
    base: b.y + 8,
    draw: () => {
      rect(b.x, b.y, 12, 7, C.boardFrame)
      rect(b.x + 1, b.y + 1, 10, 5, C.board)
      rect(b.x + 1, b.y + 8, 1, 1, C.boardFrame)
      rect(b.x + 1, b.y + 7, 1, 1, C.boardFrame)
      rect(b.x + 10, b.y + 7, 1, 2, C.boardFrame)
      rect(b.x + 3, b.y + 6, 6, 1, C.boardTray)
      // Garabatos: más cuanto más trabaja Plan
      const marks = Math.min(30, ink + (writing ? (tickCount >> 3) % 4 : 0))
      for (let k = 0; k < marks; k++) {
        const h = hash(`pizarra${k}`)
        const color = pick([C.inkBlue, C.inkBlue, C.inkRed, C.inkGreen], h >> 5)
        put(b.x + 1 + (h % 10), b.y + 1 + ((h >> 8) % 5), color)
      }
    },
  })
  return out
}
function bossDrawables(L: Layout, main?: OfficeAgent): Drawable[] {
  const d = L.bossDesk
  const sim = main ? sims.get(main.id) : undefined
  return [
    {
      base: d.y - 0.5,
      draw: () => {
        rect(d.x + 7, d.y - 7, 7, 7, C.bossChair)
        rect(d.x + 7, d.y - 7, 7, 1, C.bossChairTop)
        rect(d.x + 8, d.y - 6, 5, 1, darken(C.bossChair, 1.15))
      },
    },
    {
      base: d.y + 5,
      draw: () => {
        rect(d.x, d.y, 18, 2, C.bossTop)
        rect(d.x, d.y, 18, 1, darken(C.bossTop, 1.12))
        rect(d.x, d.y + 2, 18, 2, C.bossFront)
        rect(d.x + 2, d.y + 2, 14, 1, darken(C.bossFront, 1.15))
        rect(d.x, d.y + 4, 1, 2, C.deskLeg)
        rect(d.x + 17, d.y + 4, 1, 2, C.deskLeg)
        keyboard(d.x + 8, d.y + 1, main, sim)
        rect(d.x + 1, d.y - 5, 5, 4, C.monitor)
        rect(d.x + 1, d.y - 5, 5, 1, C.monitorTop)
        put(d.x + 3, d.y - 1, C.monitor)
        const on = !!sim?.sit
        rect(d.x + 2, d.y - 4, 3, 2, on ? C.screenOn : C.screenOff)
        if (on && main?.tool) put(d.x + 2 + (tickCount % 3), d.y - 4, C.screenLine)
        // Lámpara de mesa y papeles
        put(d.x + 16, d.y - 3, C.lampShade)
        put(d.x + 15, d.y - 3, C.lampShade)
        put(d.x + 16, d.y - 2, C.lampBase)
        put(d.x + 16, d.y - 1, C.lampBase)
        put(d.x + 14, d.y, C.paper)
        put(d.x + 15, d.y, C.paper)
        rect(d.x + 13, d.y + 1, 3, 1, C.knob) // placa con el nombre
      },
    },
  ]
}

function stationDrawables(L: Layout): Drawable[] {
  const { wallH } = L
  const busy = (st: StationId) => [...sims.values()].some((s) => s.goalKey === `st:${st}` && !s.path.length)
  const out: Drawable[] = []
  const { archivo: a, servidor: s, cafe: c, estanteria: e, impresora: p } = L.stations
  if (a) {
    out.push({
      base: wallH + 2,
      draw: () => {
        rect(a.x, wallH - 7, 6, 9, C.cabinet)
        rect(a.x, wallH - 7, 6, 1, C.cabinetTop)
        rect(a.x + 5, wallH - 6, 1, 8, darken(C.cabinet, 0.85))
        rect(a.x, wallH - 4, 6, 1, C.cabinetLine)
        rect(a.x, wallH - 1, 6, 1, C.cabinetLine)
        const open = busy('archivo') && tickCount % 8 < 4
        put(a.x + 2, wallH - 6, C.handle)
        put(a.x + 3, wallH - 6, C.handle)
        if (open) {
          rect(a.x - 1, wallH - 3, 7, 2, darken(C.cabinet, 1.1))
          put(a.x + 1, wallH - 4, C.paper)
          put(a.x + 3, wallH - 4, C.paper)
        } else {
          put(a.x + 2, wallH - 3, C.handle)
          put(a.x + 3, wallH - 3, C.handle)
        }
        put(a.x + 2, wallH, C.handle)
        put(a.x + 3, wallH, C.handle)
      },
    })
  }
  if (s) {
    out.push({
      base: wallH + 2,
      draw: () => {
        rect(s.x, wallH - 8, 6, 10, C.rack)
        rect(s.x, wallH - 8, 6, 1, darken(C.rack, 1.6))
        const fast = busy('servidor')
        for (let j = 0; j < 4; j++) {
          rect(s.x + 1, wallH - 6 + j * 2, 4, 1, C.rackSlot)
          for (let i = 0; i < 2; i++) {
            const n = hash(`${i}${j}${fast ? tickCount : tickCount >> 2}`)
            const color = n % 3 === 0 ? C.ledOff : n % 5 === 0 ? C.ledAmber : C.ledGreen
            put(s.x + 3 + i, wallH - 6 + j * 2, color)
          }
        }
      },
    })
  }
  if (e) {
    out.push({
      base: wallH + 2,
      draw: () => {
        rect(e.x, wallH - 9, 8, 11, C.shelf)
        rect(e.x, wallH - 9, 8, 1, darken(C.shelf, 1.2))
        const reading = busy('estanteria')
        for (let row = 0; row < 3; row++) {
          const y = wallH - 8 + row * 3
          rect(e.x + 1, y + 2, 6, 1, darken(C.shelf, 0.75))
          for (let i = 0; i < 6; i++) {
            const h = hash(`libro${row}${i}`)
            // Mientras alguien lee, falta un libro que va cambiando
            if (reading && i === (tickCount >> 3) % 6 && row === 1) continue
            const tall = h % 3 !== 0
            put(e.x + 1 + i, y + 1, pick(C.books, h))
            if (tall) put(e.x + 1 + i, y, pick(C.books, h))
          }
        }
      },
    })
  }
  if (p) {
    out.push({
      base: wallH + 2,
      draw: () => {
        rect(p.x, wallH - 2, 6, 4, C.printerStand)
        rect(p.x, wallH - 2, 6, 1, darken(C.printerStand, 1.15))
        rect(p.x, wallH - 5, 6, 3, C.printer)
        rect(p.x + 1, wallH - 4, 4, 1, C.printerSlot)
        put(p.x + 5, wallH - 5, busy('impresora') && tickCount % 2 ? C.ledGreen : C.ledOff)
        if (busy('impresora')) {
          const sheet = (tickCount >> 1) % 4
          rect(p.x + 1, wallH - 5 - sheet, 4, sheet + 1, C.paper)
        } else {
          rect(p.x + 1, wallH - 6, 4, 1, C.paper)
        }
      },
    })
  }
  if (c) {
    out.push({
      base: wallH + 2,
      draw: () => {
        rect(c.x, wallH - 2, 9, 4, C.counter)
        rect(c.x, wallH - 2, 9, 1, C.counterTop)
        rect(c.x + 1, wallH, 7, 1, darken(C.counter, 0.85))
        rect(c.x + 1, wallH - 7, 4, 5, C.machine)
        rect(c.x + 1, wallH - 7, 4, 1, darken(C.machine, 1.5))
        put(c.x + 4, wallH - 6, C.red)
        put(c.x + 2, wallH - 4, C.steam)
        rect(c.x + 6, wallH - 3, 2, 1, C.white)
        if (busy('cafe')) {
          put(c.x + 6 + (tickCount % 2), wallH - 4, C.steam)
          put(c.x + 7 - (tickCount % 2), wallH - 5, C.steam)
        }
      },
    })
  }
  for (const pl of L.plants) {
    out.push({
      base: pl.y,
      draw: () => {
        rect(pl.x, pl.y - 1, 3, 2, C.pot)
        rect(pl.x, pl.y - 1, 3, 1, darken(C.pot, 1.15))
        rect(pl.x, pl.y - 3, 3, 2, C.leaf)
        put(pl.x + 1, pl.y - 4, C.leafLight)
        put(pl.x - 1, pl.y - 3, C.leafLight)
        put(pl.x + 3, pl.y - 2, C.leafLight)
        put(pl.x + 2, pl.y - 5, C.leaf)
      },
    })
  }
  return out
}

// ─── Personajes ────────────────────────────────────────────────────────────
// Sprites de 5×8. H pelo, S piel, E ojos, T camisa, t sombra de la camisa,
// K corbata, P pantalón, B zapatos.

const mirrorRows = (rows: string[]) => rows.map((r) => [...r].reverse().join(''))

const HEAD: Record<Dir, string[]> = {
  down: ['.HHH.', '.ESE.', '.SSS.'],
  up: ['.HHH.', '.HHH.', '.SSS.'],
  left: ['.HHH.', 'SEHH.', '.SSH.'],
  right: mirrorRows(['.HHH.', 'SEHH.', '.SSH.']),
}

function torso(dir: Dir, isBoss: boolean, frame: number, typing: boolean): string[] {
  if (dir === 'left' || dir === 'right') {
    const rows = ['.TTT.', frame % 2 ? '.TtTS' : 'STtT.', '.PPP.']
    return dir === 'left' ? rows : mirrorRows(rows)
  }
  const chest = dir === 'down' && isBoss ? 'TTKTT' : 'TTTTT'
  const arms = typing ? 'tTTTt' : 'STTTS'
  return [chest, arms, '.PPP.']
}

function legs(dir: Dir, moving: boolean, frame: number): string[] {
  if (dir === 'left' || dir === 'right') {
    const rows = moving ? (frame % 2 ? ['P..P.', 'B...B'] : ['.PP..', '.BB..']) : ['.PP..', '.BB..']
    return dir === 'left' ? rows : mirrorRows(rows)
  }
  if (!moving) return ['.P.P.', '.B.B.']
  return frame % 2 ? ['.P.P.', '.B...'] : ['.P.P.', '...B.']
}

function drawPerson(a: OfficeAgent, sim: Sim) {
  const colors = colorsFor(a)
  const dir: Dir = sim.dir
  const frame = sim.step >> 1
  const rows = [...HEAD[dir], ...torso(dir, a.id === MAIN, frame, isTyping(a, sim)), ...legs(dir, sim.moving, frame)]
  const left = Math.round(sim.x) - 2
  // Sentado queda un píxel más bajo; al andar, un leve balanceo
  const top = Math.round(sim.y) - 7 + (sim.sit ? 1 : 0) - (sim.moving && frame % 2 ? 1 : 0)
  rows.forEach((line, j) => {
    for (let i = 0; i < 5; i++) {
      const ch = line[i]
      if (ch && ch !== '.') put(left + i, top + j, colors[ch] ?? C.white)
    }
  })
}

// ─── Bocadillos ────────────────────────────────────────────────────────────

type Icon = 'lupa' | 'libro' | 'terminal' | 'globo' | 'lapiz' | 'hoja' | 'idea' | 'charla' | 'taza' | 'ok' | 'aviso' | 'engranaje'

const ICONS: Record<Icon, { rows: string[]; color: number; accent?: number }> = {
  lupa: { rows: ['.##..', '#..#.', '.##..', '...##'], color: 0x3a86ff },
  libro: { rows: ['.....', '##.##', '##.##', '#####'], color: 0x8a4fbf },
  hoja: { rows: ['###..', '#..#.', '#..#.', '####.'], color: 0x6b7a89 },
  idea: { rows: ['.###.', '#####', '.###.', '..#..'], color: 0xf2c12e },
  terminal: { rows: ['#....', '.#...', '#.###', '.....'], color: 0x2a9d48 },
  globo: { rows: ['.###.', '#.#.#', '##.##', '.###.'], color: 0x2a9d8f },
  lapiz: { rows: ['...#o', '..#o.', '.#o..', 'x....'], color: 0xf4a261, accent: 0x6d4c33 },
  charla: { rows: ['.....', '#.#.#', '.....', '.....'], color: 0x555b66 },
  taza: { rows: ['.o.o.', '####.', '#####', '.##..'], color: 0x8a5a3c, accent: 0xcfcfcf },
  ok: { rows: ['....#', '...#.', '#.#..', '.#...'], color: 0x2a9d48 },
  aviso: { rows: ['..#..', '..#..', '.....', '..#..'], color: 0xe63946 },
  engranaje: { rows: ['.#.#.', '##.##', '.###.', '#.#.#'], color: 0x6b7a89 },
}

function iconFor(a: OfficeAgent, sim: Sim, now: number): Icon | undefined {
  if (sim.path.length || now < sim.waitUntil) return undefined
  if (sim.goalKey.startsWith('report')) return 'ok'
  if (sim.goalKey.startsWith('brief')) return 'aviso'
  if (sim.goalKey.startsWith('talk') || (a.talkTo && (a.talkUntil ?? 0) > now)) return 'charla'
  const byPlace: Record<string, Icon> = {
    'st:cafe': 'taza',
    'st:archivo': 'lupa',
    'st:estanteria': 'libro',
    'st:servidor': 'terminal',
    'st:ventana': 'globo',
    'st:impresora': 'hoja',
    board: 'idea',
  }
  const place = byPlace[sim.goalKey]
  if (place) return place
  if (!a.tool) return undefined
  if (['Write', 'Edit', 'NotebookEdit', 'TodoWrite'].includes(a.tool)) return 'lapiz'
  if (['Read', 'Grep', 'Glob'].includes(a.tool)) return 'lupa'
  if (a.tool === 'Agent') return 'aviso'
  if (a.tool === 'SendMessage') return 'charla'
  return 'engranaje'
}

function drawBubble(x: number, headTop: number, icon: Icon) {
  const { rows, color, accent } = ICONS[icon]
  const bx = Math.round(x) - 3
  const by = Math.max(0, headTop - 8 - ((tickCount >> 2) % 2))
  rect(bx + 1, by, 5, 1, C.bubbleEdge)
  rect(bx + 1, by + 5, 5, 1, C.bubbleEdge)
  rect(bx, by + 1, 1, 4, C.bubbleEdge)
  rect(bx + 6, by + 1, 1, 4, C.bubbleEdge)
  rect(bx + 1, by + 1, 5, 4, C.bubble)
  put(bx + 3, by + 6, C.bubbleEdge)
  rows.forEach((line, j) => {
    for (let i = 0; i < 5; i++) {
      const ch = line[i]
      if (ch === '#') put(bx + 1 + i, by + 1 + j, color)
      else if (ch === 'o') put(bx + 1 + i, by + 1 + j, accent ?? color)
      else if (ch === 'x') put(bx + 1 + i, by + 1 + j, C.eye)
    }
  })
}

// ─── Luz ───────────────────────────────────────────────────────────────────

type LightSource = { x: number; y: number; r: number; power: number; color: number }

function lightSources(L: Layout, phase: Phase): LightSource[] {
  const out: LightSource[] = []
  const seated = new Map<string, Sim>()
  for (const sim of sims.values()) if (sim.sit) seated.set(sim.id, sim)
  if (phase !== 'dia') {
    for (const x of L.lamps) out.push({ x: x + 1, y: 4, r: 20, power: 0.75, color: C.bulbOn })
    const b = L.bossDesk
    out.push({ x: b.x + 16, y: b.y - 1, r: 11, power: 0.6, color: C.bulbOn })
    L.islands.forEach((isl, n) => {
      const used = mirror.some((a) => L.seats[a.desk]?.island === n && seated.get(a.id)?.goalKey === 'desk')
      if (used) out.push({ x: isl.lamp.x + 1, y: isl.lamp.y, r: 14, power: 0.65, color: C.bulbOn })
    })
    if (L.meeting && [...sims.values()].some((s) => s.goalKey === 'meet' || s.goalKey === 'board')) {
      const t = L.meeting.table
      out.push({ x: t.x + t.w / 2, y: t.y - 4, r: 16, power: 0.6, color: C.bulbOn })
    }
  }
  if (phase === 'tarde') {
    if (L.window !== undefined) out.push({ x: L.window + 6, y: 9, r: 18, power: 0.35, color: 0xffb070 })
    if (L.bossWindow !== undefined) out.push({ x: L.bossWindow + 5, y: 9, r: 14, power: 0.35, color: 0xffb070 })
  }
  for (const a of mirror) {
    const sim = seated.get(a.id)
    if (!sim) continue
    if (a.id === MAIN) {
      const b = L.bossDesk
      out.push({ x: b.x + 4, y: b.y - 3, r: 8, power: 0.55, color: C.screenOn })
      continue
    }
    const seat = sim.goalKey === 'desk' ? L.seats[a.desk] : undefined
    if (seat) out.push({ x: seat.screen.x, y: seat.screen.y, r: 7, power: 0.5, color: C.screenOn })
  }
  const s = L.stations.servidor
  if (s) out.push({ x: s.x + 3, y: L.wallH - 3, r: 5, power: 0.25, color: C.ledGreen })
  return out
}

function applyLight(L: Layout, phase: Phase) {
  if (phase === 'dia') return
  const ambient = phase === 'noche' ? 0.5 : 0.78
  const tint = phase === 'noche' ? 0x1e2a52 : 0xff9a50
  const tintAmount = phase === 'noche' ? 0.3 : 0.2
  const sources = lightSources(L, phase)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let light = ambient
      let lr = 0
      let lg = 0
      let lb = 0
      for (const s of sources) {
        const dx = x - s.x
        const dy = (y - s.y) * 1.1
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d >= s.r) continue
        const k = s.power * (1 - d / s.r) ** 1.6
        light += k
        const [r, g, b] = rgb(s.color)
        lr += r * k * 0.18
        lg += g * k * 0.18
        lb += b * k * 0.18
      }
      light = Math.min(1.08, light)
      const i = y * W + x
      const [r, g, b] = rgb(px[i] ?? 0)
      const lit = pack(r * light + lr, g * light + lg, b * light + lb)
      const t = tintAmount * Math.max(0, 1 - (light - ambient) / (1 - ambient))
      px[i] = mix(lit, tint, t)
    }
  }
}

// ─── Paletas ───────────────────────────────────────────────────────────────

const RETRO = [0x0f380f, 0x306230, 0x8bac0f, 0x9bbc0f]

function recolor(c: number): number {
  if (palette === 'calida') return c
  const [r, g, b] = rgb(c)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (palette === 'retro') {
    // Cuatro verdes, con cortes elegidos para que suelo, muebles y personas se distingan
    const level = lum < 0.2 ? 0 : lum < 0.42 ? 1 : lum < 0.62 ? 2 : 3
    return RETRO[level] as number
  }
  if (palette === 'pastel') return mix(pack(r * 1.05, g * 1.05, b * 1.05), 0xfff1e6, 0.3)
  // neón: lo apagado se hunde en morado oscuro y lo saturado brilla
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const sat = max === 0 ? 0 : (max - min) / max
  if (sat > 0.62 && max > 140) return pack(r * 1.25, g * 1.25, b * 1.35)
  return mix(pack(r * 0.32, g * 0.3, b * 0.42), 0x1a1036, 0.35)
}

function applyPalette() {
  if (palette === 'calida') return
  for (let i = 0; i < px.length; i++) px[i] = recolor(px[i] ?? 0)
}

// ─── Fotograma ─────────────────────────────────────────────────────────────

function renderFrame(L: Layout): string {
  W = L.W
  H = L.H
  if (px.length !== W * H) px = new Uint32Array(W * H)
  labels = []
  const now = Date.now()
  const phase = phaseNow()
  drawBackground(L, phase)
  drawShadows(L)

  const bySeat = new Map<number, OfficeAgent>()
  for (const a of mirror) if (a.status === 'working' && a.desk >= 0) bySeat.set(a.desk, a)

  const items: Drawable[] = [
    ...islandDrawables(L, bySeat, phase),
    ...meetingDrawables(L),
    ...bossDrawables(L, mirror.find((a) => a.id === MAIN)),
    ...stationDrawables(L),
  ]
  const visible: { a: OfficeAgent; sim: Sim }[] = []
  for (const a of mirror) {
    const sim = sims.get(a.id)
    if (sim && !sim.gone && now >= sim.waitUntil) {
      visible.push({ a, sim })
      items.push({ base: sim.y + 0.1, draw: () => drawPerson(a, sim) })
    }
  }
  items.sort((p, q) => p.base - q.base)
  for (const item of items) item.draw()
  applyLight(L, phase)

  // Bocadillos y etiquetas encima de todo
  for (const { a, sim } of visible) {
    const headTop = Math.round(sim.y) - 7 + (sim.sit ? 1 : 0)
    const icon = iconFor(a, sim, now)
    if (icon) {
      drawBubble(sim.x, headTop, icon)
      continue
    }
    const text = clip(a.label, 9)
    labels.push({
      row: Math.max(0, Math.floor((headTop - 2) / 2)),
      col: Math.round(sim.x) - Math.floor(text.length / 2),
      text,
      fg: C.white,
      bg: darken(shirtOf(a), 0.7),
    })
  }
  applyPalette()
  return encode(L)
}

function safeChar(ch: string) {
  const cp = ch.codePointAt(0) ?? 32
  if (cp < 32 || cp > 0xffff || (cp >= 0x1100 && cp !== 0x2026)) return 0x3f // '?'
  return cp
}

function encode(L: Layout): string {
  const { cols, rows } = L
  const words = new Uint32Array(cols * rows * 3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 3
      words[i] = 0x2580 // ▀: arriba el color de delante, abajo el de fondo
      words[i + 1] = px[2 * r * W + c] ?? 0
      words[i + 2] = px[(2 * r + 1) * W + c] ?? 0
    }
  }
  for (const label of labels) {
    if (label.row >= rows) continue
    const chars = [...label.text]
    chars.forEach((ch, k) => {
      const c = label.col + k
      if (c < 0 || c >= cols) return
      const i = (label.row * cols + c) * 3
      words[i] = safeChar(ch)
      words[i + 1] = recolor(label.fg)
      words[i + 2] = recolor(label.bg)
    })
  }
  return toBase64(new Uint8Array(words.buffer))
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: Uint8Array): string {
  const native = (bytes as unknown as { toBase64?: () => string }).toBase64
  if (typeof native === 'function') return native.call(bytes)
  let out = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + B64[n & 63]!
  }
  const rest = bytes.length - i
  if (rest === 1) {
    const n = (bytes[i] ?? 0) << 16
    out += `${B64[(n >> 18) & 63]}${B64[(n >> 12) & 63]}==`
  } else if (rest === 2) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8)
    out += `${B64[(n >> 18) & 63]}${B64[(n >> 12) & 63]}${B64[(n >> 6) & 63]}=`
  }
  return out
}

// ─── Reloj ─────────────────────────────────────────────────────────────────

async function tick($: Dollar) {
  if (ticking) return
  ticking = true
  try {
    tickCount++
    const L = layout
    if (!L) return
    const gone = step(L, Date.now())
    if (gone.length) {
      for (const id of gone) sims.delete(id)
      await apply($, (list) => list.filter((a) => !gone.includes(a.id)))
    }
    if (!canDraw) return
    const frame = renderFrame(L)
    if (frame === lastFrame) return
    lastFrame = frame
    const result = await $.ui.blit({
      requestId: PANE,
      key: RASTER,
      cells: frame,
      columns: L.cols,
      rows: L.rows,
    })
    // Panel cerrado o redimensionado: se deja de pintar hasta el próximo render.
    if (result.deny) canDraw = false
  } catch {
    canDraw = false
  } finally {
    ticking = false
  }
}

function freeDesk() {
  const used = new Set(mirror.filter((a) => a.status === 'working').map((a) => a.desk))
  let i = 0
  while (used.has(i)) i++
  return i
}

function uniqueLabel(text: string) {
  const taken = new Set(mirror.map((a) => a.label))
  if (!taken.has(text)) return text
  for (let n = 2; ; n++) if (!taken.has(`${text} ${n}`)) return `${text} ${n}`
}

const KIND_LABEL: Record<string, string> = {
  'general-purpose': 'General',
  Explore: 'Explore',
  Plan: 'Plan',
  fork: 'Fork',
}

function mainAgent(now: number): OfficeAgent {
  return {
    id: MAIN,
    label: 'Claude',
    kind: 'main',
    task: 'agente principal',
    desk: -1,
    parent: MAIN,
    toolCount: 0,
    lastActive: now,
    startedAt: now,
    status: 'working',
  }
}

function findByName(to: string): string | undefined {
  if (['main', 'team-lead', 'lead', 'parent'].includes(to)) return MAIN
  return mirror.find((a) => a.name === to || a.label === to || a.id === to)?.id
}

/** Abre o cierra el panel; sin `want`, cambia de estado. Devuelve si queda abierto. */
async function toggleOffice($: Dollar, want?: boolean): Promise<boolean> {
  const open = paneOpen || (await read($, isOpen))
  const next = want ?? !open
  if (next) {
    openedOnce = true
    await $.ui.open({ id: PANE, title: TITLE })
  } else {
    await $.ui.close({ id: PANE })
    canDraw = false
  }
  await setOpen($, next)
  return next
}

// ─── Registro ──────────────────────────────────────────────────────────────

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'oficina',
      description: 'Abre o cierra la oficina de agentes; también cambia la paleta y la luz',
      argumentHint: '[cerrar | paleta cálida|pastel|retro|neón | luz auto|día|tarde|noche]',
    })
    const now = Date.now()
    mirror = (await read($, roster)) as OfficeAgent[]
    if (!mirror.some((a) => a.id === MAIN)) await apply($, (list) => [mainAgent(now), ...list])
    const savedPalette = await $.store.get('paleta')
    const savedLight = await $.store.get('luz')
    if (PALETTES.includes(savedPalette as Palette)) palette = savedPalette as Palette
    if (LIGHTS.includes(savedLight as LightMode)) lightMode = savedLight as LightMode
    ticker?.cancel()
    ticker = $.clock.every(TICK_MS, () => void tick($))
    return next(e)
  })

  on('command.run', { command: 'oficina' }, async ($, e) => {
    const words = e.args
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const [sub, value] = words

    if (!sub || sub === 'abrir' || sub === 'cerrar') {
      const opened = await toggleOffice($, sub === 'abrir' ? true : sub === 'cerrar' ? false : undefined)
      return { text: opened ? 'Oficina abierta.' : 'Oficina cerrada.' }
    }

    if (sub === 'paleta') {
      if (!PALETTES.includes(value as Palette)) return { text: 'Paletas: cálida, pastel, retro, neón.' }
      palette = value as Palette
      lastFrame = ''
      await $.store.set('paleta', palette)
      return { text: `Paleta: ${palette}.` }
    }

    if (sub === 'luz') {
      if (!LIGHTS.includes(value as LightMode)) return { text: 'Luz: auto (según la hora), día, tarde o noche.' }
      lightMode = value as LightMode
      lastFrame = ''
      await $.store.set('luz', lightMode)
      return { text: `Luz: ${lightMode}.` }
    }

    return { text: 'Uso: /oficina [cerrar | paleta cálida|pastel|retro|neón | luz auto|día|tarde|noche]' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      await setOpen($, false)
      canDraw = false
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.deny || !result.agentId) return result
    const id = result.agentId
    const now = Date.now()
    try {
      const existing = mirror.find((a) => a.id === id)
      if (existing) {
        await apply($, (list) =>
          list.map((a) => (a.id === id ? { ...a, status: 'working', lastActive: now } : a)),
        )
      } else {
        const agent: OfficeAgent = {
          id,
          label: uniqueLabel(e.name ?? KIND_LABEL[e.subagentType] ?? e.subagentType),
          name: e.name,
          kind: e.subagentType,
          task: e.description,
          desk: freeDesk(),
          parent: e.parentAgentId && mirror.some((a) => a.id === e.parentAgentId) ? e.parentAgentId : MAIN,
          team: e.workflow?.runId || (e.isTeammate ? 'equipo' : undefined),
          toolCount: 0,
          lastActive: now,
          startedAt: now,
          status: 'working',
        }
        await apply($, (list) => [...list.filter((a) => a.id !== id), agent])
      }
      if (!openedOnce) {
        openedOnce = true
        void $.ui.open({ id: PANE, title: TITLE }).then(() => setOpen($, true))
      }
    } catch {
      // La oficina nunca debe impedir que arranque un agente.
    }
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? MAIN
    if (!mirror.some((a) => a.id === id)) return next(e)
    const now = Date.now()
    const detail = describeTool(e)
    const to = e.tool === 'SendMessage' ? arg(e, 'to') : undefined
    const talkTo = to ? findByName(to) : undefined
    await apply($, (list) =>
      list.map((a) =>
        a.id === id
          ? {
              ...a,
              tool: e.tool,
              detail,
              toolCount: a.toolCount + 1,
              lastActive: now,
              ...(talkTo && talkTo !== id ? { talkTo, talkUntil: now + TALK_MS } : {}),
            }
          : a,
      ),
    )
    try {
      return await next(e)
    } finally {
      const end = Date.now()
      await apply($, (list) =>
        list.map((a) =>
          a.id === id && a.tool === e.tool ? { ...a, tool: undefined, detail: undefined, lastActive: end } : a,
        ),
      )
    }
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const id = e.agentId
    if (id && mirror.some((a) => a.id === id && a.status === 'working')) {
      await apply($, (list) =>
        list.map((a) => (a.id === id ? { ...a, status: 'done', tool: undefined, detail: undefined } : a)),
      )
    }
    return result
  })

  // Botón encima del cuadro de texto para abrir y cerrar la oficina
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const open = await read($, isOpen)
    const list = (await read($, roster)) as OfficeAgent[]
    const working = list.filter((a) => a.id !== MAIN && a.status === 'working').length
    const { Box, Button, Text } = $.ui.resolve(e)
    // El botón está siempre, para abrir la oficina cuando se quiera; solo destaca y lleva
    // contador mientras hay agentes trabajando.
    return (
      <Box>
        <Button
          key="oficina"
          label={open ? 'Cerrar oficina' : 'Abrir oficina'}
          variant={!open && working > 0 ? 'primary' : undefined}
          onPress={() => toggleOffice($ as unknown as Dollar)}
        />
        {working > 0 ? (
          <Text dimColor>
            {' '}
            {`${working} ${working === 1 ? 'agente trabajando' : 'agentes trabajando'}`}
          </Text>
        ) : null}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = (await read($, roster)) as OfficeAgent[]
    mirror = list
    const now = Date.now()
    const cols = e.props.bodyColumns
    const legendRows = list.length + 1

    if (e.surface !== 'terminal' || cols < MIN_COLUMNS) {
      const { Box, Text } = $.ui.resolve(e)
      canDraw = false
      return (
        <Box flexDirection="column">
          {e.surface === 'terminal' && <Text dimColor>Ensancha el panel para ver la oficina.</Text>}
          {list.map((a) => (
            <Text>
              <Text color={hex(shirtOf(a))}>■</Text> {a.label}
              <Text dimColor> · {activityOf(a, now)}</Text>
            </Text>
          ))}
        </Box>
      )
    }

    const { Box, Text, Raster } = $.ui.resolve(e)
    const room = e.props.scroll.bodyRows - legendRows - 1
    const maxRows = e.props.placement === 'inline' ? 22 : 64
    const rows = Math.max(16, Math.min(maxRows, room))
    if (!layout || layout.cols !== cols || layout.rows !== rows) {
      layout = makeLayout(cols, rows)
      sims.clear() // cada uno reaparece en su sitio con la nueva distribución
    }
    paneOpen = true // un render de escritura no puede tocar $.state; basta con la variable
    step(layout, now)
    const frame = renderFrame(layout)
    lastFrame = frame
    canDraw = true

    const working = list.filter((a) => a.id !== MAIN && a.status === 'working').length
    return (
      <Box flexDirection="column">
        <Raster key={RASTER} columns={cols} rows={rows} cells={frame} />
        <Text dimColor>
          {working === 0 ? 'Nadie trabajando ahora mismo' : `${working} ${working === 1 ? 'agente' : 'agentes'} trabajando`}
        </Text>
        {list.map((a) => (
          <Text>
            <Text color={hex(shirtOf(a))}>■</Text> {clip(a.label, 14)}
            <Text dimColor>
              {' '}
              · {clip(activityOf(a, now), Math.max(10, cols - 20))}
            </Text>
          </Text>
        ))}
      </Box>
    )
  })
}
