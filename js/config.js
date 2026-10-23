/* Configuración central de puntos y comportamiento.
   Objeto JSON literal válido: también lo parsea tools/validate.py. */
window.CONFIG = {
  "debounceMs": 2000,
  "maxHeightReached": false,
  "points": [
    {
      "id": "A",
      "name": "Punto A",
      "lat": 19.464361,
      "lng": -99.107778,
      "radius": 5,
      "type": "image",
      "src": "assets/19.jpg",
      "youtube": null,
      "heightM": 3,
      "bottomM": 2
    },
    {
      "id": "B",
      "name": "Punto B",
      "lat": 19.464472,
      "lng": -99.107944,
      "radius": 5,
      "type": "youtube",
      "src": null,
      "youtube": "https://www.youtube.com/watch?v=3HYOR3SYRpQ",
      "heightM": 3,
      "bottomM": 3
    }
  ]
};
