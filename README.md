# Oposición Policía Local Cieza

Gestor de estudio del temario (41 temas) para la oposición de Agente de Policía Local de Cieza: estado y repasos de cada tema, planificador con IA, calendario, estadísticas, simulacros de las pruebas teóricas y tutor IA. Los datos se guardan en Firebase (Firestore) y se sincronizan entre dispositivos.

El botón **Entrenamientos** del menú abre la web aparte: https://josej2013gm-glitch.github.io/entreno/

## Estructura

```
index.html        página principal
styles.css        estilos
manifest.json     instalación como app (PWA)
sw.js             service worker (uso sin conexión)
icons/            iconos de la app
js/data.js        temario (41 temas)
js/core.js        estado, navegación, ajustes, copia de seguridad
js/sync.js        acceso con Google y sincronización con Firestore
js/temas.js       panel de temas
js/dashboard.js   dashboard
js/planner.js     planificador IA y calendario
js/stats.js       estadísticas
js/timer.js       temporizador / pomodoro
js/tutor.js       tutor IA (Google AI Studio)
js/simulacros.js  simulacros de las 3 pruebas teóricas (Test, Callejero, Escrito con evaluación IA)
```

## Publicar en GitHub Pages

Sube todos los archivos a la raíz del repositorio (rama `main`) y activa *Settings → Pages → Deploy from a branch → main / (root)*.
