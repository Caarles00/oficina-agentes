# Oficina de agentes

Un mod para Claude Code que dibuja, en un panel del terminal, una oficina en pixel art donde se ve a los agentes trabajar.

- Cada subagente que se lanza entra por la puerta, recibe el encargo en la mesa del jefe (el agente principal) y se sienta en su puesto.
- Según la herramienta que usa, va a un sitio distinto: la estantería para leer archivos, el archivador para buscar, el servidor para ejecutar comandos, la ventana para consultar la web y la impresora para escribir archivos nuevos. Si lleva un rato sin usar herramientas, va a por un café.
- Un bocadillo con un icono muestra qué está haciendo, y debajo del dibujo hay una lista con cada agente y su tarea.
- Los agentes de un workflow o de un equipo se reúnen en la sala de reuniones, y los agentes Plan piensan delante de la pizarra.
- Cuando un agente manda un mensaje a otro, va hasta su mesa. Al terminar, entrega el informe y sale por la puerta.
- La luz cambia según la hora del día, y hay varias paletas de color.

## Instalación

En el prompt de una sesión de Claude Code en el terminal:

```
/plugin install oficina-agentes --marketplace Caarles00/oficina-agentes
```

Responde `y` para añadir el marketplace y elige el ámbito (el de usuario lo activa en todas tus sesiones).

Desde una shell:

```
claude plugin install oficina-agentes --marketplace Caarles00/oficina-agentes
```

En la app de escritorio, donde `/plugin` no funciona: pulsa + junto al cuadro de texto, luego Plugins, Add marketplace con `Caarles00/oficina-agentes` y después Add plugin.

## Uso

| Comando | Qué hace |
| --- | --- |
| `/oficina` | Abre o cierra la oficina (interruptor) |
| `/oficina paleta cálida\|pastel\|retro\|neón` | Cambia la paleta de colores |
| `/oficina luz auto\|día\|tarde\|noche` | Fija la luz o la deja según la hora |

La oficina se abre sola cuando se lanza el primer subagente. Mientras hay agentes trabajando aparece un botón encima del cuadro de texto para abrirla o cerrarla.

Se ve mejor con el terminal en pantalla completa, donde el panel se acopla junto al chat. Necesita al menos 56 columnas; con menos, muestra solo la lista de agentes.
