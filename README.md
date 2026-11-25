# Lente de parentescos

Herramienta de realidad aumentada para enlazar los objetos de un espacio de trabajo creativo con las agencias más-que-humanas que los hacen posibles.

Dannery Elizondo Donoso · Maestría en Diseño Industrial, UNAM · 2027-1

## Cómo funciona

- **Modo RA anclada (Android con Chrome).** Usa WebXR (`immersive-ar`) con los módulos *hit-test* y *dom-overlay*. ARCore rastrea la posición del teléfono y las superficies del entorno; cada nudo queda fijo en el punto real donde se marcó y los hilos se tienden en el espacio entre ellos. La escena se dibuja con three.js.
- **Modo cámara (iPhone y navegadores sin WebXR).** Usa la cámara en vivo y el modelo COCO-SSD de TensorFlow.js, que reconoce 80 clases de objetos dentro del navegador. Los nudos siguen al objeto reconocido mientras aparece en cuadro; no quedan anclados en el espacio.
- Ninguna imagen sale del teléfono. Al final, quien participa puede descargar o copiar el registro en JSON.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo y público (por ejemplo, `lente-de-parentescos`).
2. Sube todos los archivos de esta carpeta a la raíz del repositorio, incluida la carpeta `lib`.
3. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. En uno o dos minutos la herramienta queda en `https://<usuario>.github.io/lente-de-parentescos/`.

GitHub Pages sirve la página con HTTPS, que es obligatorio para que el navegador permita usar la cámara y WebXR.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Pantallas de inicio, interfaz sobre la RA, cierre e información |
| `estilo.css` | Estilos |
| `app.js` | Lógica: WebXR, modo cámara, nombrar, agencias, hilos y registro |
| `lib/three.module.min.js` | three.js r170 (MIT) |
| `lib/tf.min.js`, `lib/coco-ssd.min.js` | TensorFlow.js 4.22 y COCO-SSD 2.2.3 (Apache 2.0). Los pesos del modelo se descargan de `storage.googleapis.com` al abrir el modo cámara |

## Registro (JSON)

Por cada nudo: clase detectada, categoría, nombre inicial, agencias mostradas (en el orden aleatorio en que aparecieron), agencias sugeridas elegidas, agencias propias, si ninguna convenció, nombre final y si cambió, tiempo y posición en metros (solo en modo RA anclada). Por cada hilo: nudos que une, vínculos sugeridos elegidos y vínculo propio. Además: práctica, modo, duración y si el teléfono se ató a la red.
