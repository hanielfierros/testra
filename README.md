# TestRA

PWA de prueba optimizada para **iPhone Safari** que superpone contenido sobre la
cámara en función de la posición **GPS aproximada** y la orientación del
dispositivo. Sin marcos externos ni servidor.

## Características

- Botón **«ACTIVAR CÁMARA»** que solicita cámara trasera, GPS y sensor de
  orientación (brújula).
- **Punto A** (`19.464361, -99.107778`): muestra `assets/19.jpg` con altura
  virtual de 3 m y base a 2 m del suelo (referencia aproximada).
- **Punto B** (`19.464472, -99.107944`): incrusta el vídeo de YouTube
  <https://www.youtube.com/watch?v=3HYOR3SYRpQ> con altura virtual de 3 m y base
  a 3 m (referencia aproximada).
- Radio de activación de **5 m** por punto, con **debounce** configurable
  (`debounceMs` en `js/config.js`).
- HUD con distancia a cada punto, coordenadas, precisión, rumbo, norte de
  referencia, permisos y estado de activación.
- Controles manuales para mostrar/ocultar contenido, cerrar la cámara,
  reiniciar y mensajes de error.

## Estructura

```
index.html          Interfaz principal
css/style.css       Estilos (iPhone Safari, safe-area)
js/config.js        Configuración de puntos y debounce
js/app.js           Lógica de cámara, GPS y brújula
manifest.webmanifest  Manifesto PWA
sw.js               Service Worker (caché de recursos locales)
assets/19.jpg       Imagen del punto A
assets/icons/       Iconos de la PWA
tools/gen_icons.py  Genera los iconos de marcador de posición
tools/validate.py   Valida coordenadas, referencias y sintaxis
```

## Prueba local

Se requiere servir por **HTTPS o localhost** (lo exigen cámara, GPS y PWA).

```bash
python -m http.server 8000
```

Abre `http://localhost:8000/` en Safari.

## Prueba en iPhone Safari

1. Servir la carpeta por HTTPS (p. ej. `python -m http.server` detrás de un
   túnel como `cloudflared` o `ngrok`, o desplegar en GitHub Pages).
2. Abrir la URL en Safari, tocar **Compartir → Añadir a pantalla de inicio**.
3. Abrir la app desde el icono (los permisos de cámara y orientación funcionan
   mejor en modo instalado).
4. Tocar **ACTIVAR CÁMARA** y conceder los permisos de cámara y ubicación.
   - iOS 13+: Safari pedirá permiso de movimiento/orientación al tocar el botón.
5. Acercarse a menos de 5 m de cada punto; el contenido aparecerá tras el
   `debounceMs` configurado y se ocultará al salir del radio.

## Publicación en GitHub Pages

1. Subir el repositorio a `https://github.com/hanielfierros/testra`.
2. En el repositorio: **Settings → Pages → Branch: `main` / `(root)` → Save**.
3. La app quedará en `https://hanielfierros.github.io/testra/`.

Todas las rutas son **relativas** (`./…`), por lo que funciona bajo subruta.

## Permisos

| Recurso   | API                                  | Notas |
|-----------|--------------------------------------|-------|
| Cámara    | `getUserMedia` (facingMode environment) | Requiere HTTPS y gesto de usuario |
| GPS       | `geolocation.watchPosition`          | Requiere HTTPS/permiso de ubicación |
| Brújula   | `deviceorientationabsolute` / `webkitCompassHeading` | iOS 13+ pide permiso explícito |

## Limitaciones conocidas (importante)

- **Posicionamiento aproximado:** el GPS y la brújula no garantizan una
  precisión de 5 m ni una alineación exacta. El radio de 5 m es solo una
  referencia.
- **Sin anclaje espacial real:** este proyecto **no** implementa seguimiento
  espacial (WebXR/ARKit). Usa un **modo de superposición de cámara aproximado**:
  el contenido se muestra como superposición, sin anclarse físicamente en el
  espacio.
- **Altura y norte:** la altura virtual (3 m) y la orientación al norte
  verdadero son referencias visuales aproximadas; no se mide la altura real del
  dispositivo ni se garantiza el norte exacto.
- **YouTube requiere red:** el vídeo necesita conexión y reproducción manual por
  política del navegador (no autoplay con sonido).
- **iOS:** la cámara trasera requiere que la app se sirva por HTTPS y, para
  mejor experiencia, que esté instalada como PWA.

## Recursos

- `assets/19.jpg` debe existir con ese nombre exacto. Si falta, colócalo en
  `assets/19.jpg` (no se incluye un sustituto).

## Verificación

```bash
python tools/gen_icons.py   # regenera iconos
python tools/validate.py    # valida proyecto
```
