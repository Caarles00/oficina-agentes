import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'oficina-agentes',
  component: 'Pane',
  requestId: 'oficina',
  props: {
    title: 'Oficina',
    isFocused: false,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

test('un agente lanzado aparece en la oficina y en la leyenda', async ($, on) => {
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'a1' }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.agent.spawn({ prompt: 'mira', description: 'Buscar cosas', subagentType: 'Explore' } as never)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Raster' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Explore/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 agente trabajando/ })).toBeDefined()
  await ui.unmount()
})

test('en otras superficies se ve solo la lista', async ($, on) => {
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Claude/ })).toBeDefined()
  await ui.unmount()
})

test('un panel estrecho pide más anchura', async ($, on) => {
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({
    ...PANE,
    surface: 'terminal',
    props: { ...PANE.props, bodyColumns: 40 },
  })
  expect(await ui.find({ type: 'Text', text: /Ensancha/ })).toBeDefined()
  await ui.unmount()
})

test('el comando cambia la paleta y la luz, y rechaza valores raros', async ($, on) => {
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const run = async (args: string) =>
    ((await $.command.run({ command: 'oficina', args } as never)) as { text?: string }).text
  expect(await run('paleta Retro')).toBe('Paleta: retro.')
  expect(await run('luz noche')).toBe('Luz: noche.')
  expect(await run('paleta neón')).toBe('Paleta: neon.')
  expect(await run('paleta azul')).toMatch(/Paletas/)
})

test('/oficina funciona como interruptor', async ($, on) => {
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const run = async (args: string) =>
    ((await $.command.run({ command: 'oficina', args } as never)) as { text?: string }).text
  expect(await run('')).toBe('Oficina abierta.')
  expect(await run('')).toBe('Oficina cerrada.')
  expect(await run('')).toBe('Oficina abierta.')
})

test('el botón de encima del cuadro de texto abre y cierra la oficina', async ($, on) => {
  on('command.register', () => ({ value: { command: 'oficina' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  let opened = 0
  let closed = 0
  on('ui.open', () => (opened++, { value: { isPlaced: true } }))
  on('ui.close', () => (closed++, { value: undefined }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'a1' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const BAND = {
    plugin: 'oficina-agentes',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: { hasSurvey: false, bodyColumns: 80 },
  } as never

  // Sin agentes trabajando, no hay botón
  const empty = await $.ui.mount(BAND)
  expect(await empty.find({ type: 'Button', key: 'oficina' })).toBeUndefined()
  await empty.unmount()

  await $.agent.spawn({ prompt: 'mira', description: 'Buscar', subagentType: 'Explore' } as never)
  opened = 0
  const ui = await $.ui.mount({
    plugin: 'oficina-agentes',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: { hasSurvey: false, bodyColumns: 80 },
  } as never)
  expect(await ui.find({ type: 'Button', key: 'oficina' })).toBeDefined()
  // Al llegar el agente la oficina ya se abrió sola, así que el botón la cierra
  await ui.press({ key: 'oficina' })
  expect(closed).toBe(1)
  await ui.press({ key: 'oficina' })
  expect(opened).toBe(1)
  await ui.unmount()
})
