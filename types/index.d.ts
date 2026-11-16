/** Un agente de la oficina: el principal ("main") o un subagente. */
export type OfficeAgent = {
  id: string
  /** Lo que se ve en su etiqueta. */
  label: string
  /** Nombre con el que le escribe SendMessage, si lo tiene. */
  name?: string
  /** Tipo de agente: main, Explore, Plan, general-purpose... */
  kind: string
  /** El encargo, en pocas palabras. */
  task: string
  /** Mesa asignada; -1 para el principal, que tiene despacho. */
  desk: number
  /** Workflow o equipo al que pertenece: se reúnen en la sala de reuniones. */
  team?: string
  /** Quién lo lanzó (id); el principal si no consta. */
  parent: string
  tool?: string
  detail?: string
  /** Id del agente con el que está hablando, mientras dure talkUntil. */
  talkTo?: string
  talkUntil?: number
  toolCount: number
  lastActive: number
  startedAt: number
  status: 'working' | 'done'
}

declare module 'claude-code' {
  interface PluginState {
    'oficina-agentes': { roster: Shaped<OfficeAgent[]>; isOpen: boolean }
  }
}
