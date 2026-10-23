/* TestRA — Cámara AR GPS (aproximada) para iPhone Safari.
   Sin marcos ni backend. Posicionamiento GPS/brújula aproximado. */
(function () {
  "use strict";

  var CFG = window.CONFIG;

  var els = {
    video: document.getElementById("camera"),
    overlays: { A: document.getElementById("overlayA"), B: document.getElementById("overlayB") },
    ytFrame: document.getElementById("ytFrame"),
    errorBox: document.getElementById("errorBox"),
    statusPill: document.getElementById("statusPill"),
    gpsLat: document.getElementById("gpsLat"),
    gpsLng: document.getElementById("gpsLng"),
    gpsAcc: document.getElementById("gpsAcc"),
    heading: document.getElementById("heading"),
    trueNorth: document.getElementById("trueNorth"),
    permCamera: document.getElementById("permCamera"),
    permGps: document.getElementById("permGps"),
    permCompass: document.getElementById("permCompass"),
    pointList: document.getElementById("pointList"),
    btnActivate: document.getElementById("btnActivate"),
    btnClose: document.getElementById("btnClose"),
    btnRestart: document.getElementById("btnRestart")
  };

  var state = {
    cameraStream: null,
    watchId: null,
    gps: null,            // { lat, lng, accuracy }
    heading: null,        // grados
    absolute: false,      // true si el rumbo es norte verdadero
    active: false,        // cámara + sensores activos
    pointState: {},       // id -> { active:bool, debounceTimer, manual:bool }
    perm: { camera: null, gps: null, compass: null }
  };

  CFG.points.forEach(function (p) {
    state.pointState[p.id] = { active: false, manual: false, debounceTimer: null };
  });

  /* ---------- Utilidades ---------- */
  function toRad(d) { return d * Math.PI / 180; }

  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371000; // radio terrestre (m)
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function fmt(v) { return (v === null || v === undefined || isNaN(v)) ? "—" : String(v); }
  function fmtDist(m) { return m === null ? "—" : m.toFixed(1) + " m"; }
  function fmtNum(v, d) { return (v === null || v === undefined || isNaN(v)) ? "—" : Number(v).toFixed(d === undefined ? 5 : d); }

  function showError(msg) {
    els.errorBox.textContent = msg;
    els.errorBox.classList.remove("hidden");
  }
  function clearError() { els.errorBox.classList.add("hidden"); }

  function setPill(txt, on) {
    els.statusPill.textContent = txt;
    els.statusPill.className = "pill " + (on ? "on" : "off");
  }

  /* ---------- UI: puntos ---------- */
  function buildPointList() {
    els.pointList.innerHTML = "";
    CFG.points.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "point";
      row.innerHTML =
        '<div class="point-head">' +
          '<span class="point-name">' + p.name + '</span>' +
          '<span class="point-status" id="ps-' + p.id + '">Fuera</span>' +
        '</div>' +
        '<div class="point-dist" id="pd-' + p.id + '">Distancia: —</div>' +
        '<button class="mini" id="pb-' + p.id + '">Mostrar contenido</button>';
      els.pointList.appendChild(row);
      document.getElementById("pb-" + p.id).addEventListener("click", function () {
        toggleManual(p.id);
      });
    });
  }

  function toggleManual(id) {
    var ps = state.pointState[id];
    ps.manual = !ps.manual;
    applyPoint(id);
    updatePointUI(id);
  }

  function applyPoint(id) {
    var p = findPoint(id);
    var ps = state.pointState[id];
    var want = ps.manual || ps.active;
    var overlay = els.overlays[id];
    if (want) {
      overlay.classList.remove("hidden");
      if (p.type === "youtube" && els.ytFrame.getAttribute("src").indexOf("autoplay") === -1) {
        els.ytFrame.setAttribute("src", embedUrl(p.youtube));
      }
    } else {
      overlay.classList.add("hidden");
      if (p.type === "youtube") els.ytFrame.setAttribute("src", "");
    }
  }

  function embedUrl(url) {
    var id = url.split("v=")[1];
    if (id && id.indexOf("&") !== -1) id = id.split("&")[0];
    return "https://www.youtube-nocookie.com/embed/" + id + "?playsinline=1";
  }

  function findPoint(id) {
    for (var i = 0; i < CFG.points.length; i++) {
      if (CFG.points[i].id === id) return CFG.points[i];
    }
    return null;
  }

  function updatePointUI(id) {
    var p = findPoint(id);
    var ps = state.pointState[id];
    var dist = state.gps ? haversine(state.gps.lat, state.gps.lng, p.lat, p.lng) : null;
    var distEl = document.getElementById("pd-" + id);
    var stEl = document.getElementById("ps-" + id);
    var btn = document.getElementById("pb-" + id);
    if (distEl) distEl.textContent = "Distancia: " + fmtDist(dist);
    if (stEl) {
      if (ps.manual) { stEl.textContent = "Manual"; stEl.className = "point-status manual"; }
      else if (ps.active) { stEl.textContent = "Activo"; stEl.className = "point-status active"; }
      else { stEl.textContent = "Fuera"; stEl.className = "point-status"; }
    }
    if (btn) btn.textContent = ps.manual ? "Ocultar contenido" : "Mostrar contenido";
  }

  function refreshAllPoints() {
    CFG.points.forEach(function (p) { updatePointUI(p.id); });
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    if (state.gps) {
      els.gpsLat.textContent = fmtNum(state.gps.lat, 6);
      els.gpsLng.textContent = fmtNum(state.gps.lng, 6);
      els.gpsAcc.textContent = state.gps.accuracy ? fmtDist(state.gps.accuracy) : "—";
    } else {
      els.gpsLat.textContent = els.gpsLng.textContent = els.gpsAcc.textContent = "—";
    }
    els.heading.textContent = state.heading === null ? "—" : Math.round(state.heading) + "°";
    els.trueNorth.textContent = state.heading === null ? "—" : (state.absolute ? "Sí (absoluto)" : "Aprox.");
    els.permCamera.textContent = labelPerm(state.perm.camera);
    els.permGps.textContent = labelPerm(state.perm.gps);
    els.permCompass.textContent = labelPerm(state.perm.compass);
  }

  function labelPerm(v) {
    if (v === "granted") return "Concedido";
    if (v === "denied") return "Denegado";
    if (v === "prompt") return "Pendiente";
    return "—";
  }

  /* ---------- Activación por radio con debounce ---------- */
  function evaluatePoints() {
    if (!state.gps) return;
    CFG.points.forEach(function (p) {
      var ps = state.pointState[p.id];
      var dist = haversine(state.gps.lat, state.gps.lng, p.lat, p.lng);
      var inside = dist <= p.radius;
      if (ps.manual) return; // el modo manual tiene prioridad
      if (inside === ps.active) return; // sin cambio
      scheduleTransition(p.id, inside);
    });
  }

  function scheduleTransition(id, inside) {
    var ps = state.pointState[id];
    if (ps.debounceTimer) clearTimeout(ps.debounceTimer);
    ps.debounceTimer = setTimeout(function () {
      ps.debounceTimer = null;
      if (ps.manual) return;
      ps.active = inside;
      applyPoint(id);
      updatePointUI(id);
    }, CFG.debounceMs);
  }

  /* ---------- Cámara ---------- */
  function requestCamera() {
    var constraints = { video: { facingMode: { ideal: "environment" } }, audio: false };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      state.perm.camera = "denied";
      updateHud();
      showError("Cámara no disponible en este navegador.");
      return Promise.reject(new Error("getUserMedia no disponible"));
    }
    return navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        state.cameraStream = stream;
        state.perm.camera = "granted";
        els.video.srcObject = stream;
        els.video.play().catch(function () {});
        updateHud();
      })
      .catch(function (err) {
        state.perm.camera = "denied";
        updateHud();
        showError("Permiso de cámara denegado o no disponible: " + (err && err.name ? err.name : "desconocido"));
      });
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(function (t) { t.stop(); });
      state.cameraStream = null;
    }
    els.video.srcObject = null;
  }

  /* ---------- GPS ---------- */
  function requestGps() {
    if (!navigator.geolocation) {
      state.perm.gps = "denied";
      updateHud();
      showError("Geolocalización no disponible.");
      return;
    }
    state.watchId = navigator.geolocation.watchPosition(
      function (pos) {
        state.perm.gps = "granted";
        state.gps = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        updateHud();
        evaluatePoints();
      },
      function (err) {
        state.perm.gps = "denied";
        updateHud();
        if (err.code === 1) showError("Permiso de ubicación denegado. Actívalo en Ajustes.");
        else showError("Error de GPS: código " + err.code);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }

  function stopGps() {
    if (state.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    state.gps = null;
  }

  /* ---------- Brújula / orientación ---------- */
  function requestCompass() {
    var hasAbsolute = "ondeviceorientationabsolute" in window;
    if (hasAbsolute) {
      window.addEventListener("deviceorientationabsolute", onHeading, true);
    } else {
      window.addEventListener("deviceorientation", onHeading, true);
    }
    // iOS 13+: pedir permiso explícito si existe
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then(function (r) {
          state.perm.compass = r === "granted" ? "granted" : "denied";
          updateHud();
        })
        .catch(function () { state.perm.compass = "denied"; updateHud(); });
    } else {
      state.perm.compass = hasAbsolute ? "prompt" : "granted";
      updateHud();
    }
  }

  function onHeading(e) {
    var h = null;
    var absolute = false;
    if (e.absolute === true && typeof e.alpha === "number") {
      h = e.alpha;
      absolute = true;
    } else if (typeof e.webkitCompassHeading === "number") {
      h = e.webkitCompassHeading;
      absolute = true;
    } else if (typeof e.compassHeading === "number") {
      h = e.compassHeading;
    } else if (typeof e.alpha === "number" && e.alpha !== null) {
      h = 360 - e.alpha; // aproximación a partir del eje Z
    }
    if (h !== null) {
      state.heading = h;
      state.absolute = absolute;
      if (state.perm.compass === null || state.perm.compass === "prompt") {
        state.perm.compass = "granted";
      }
      updateHud();
    }
  }

  /* ---------- Flujo principal ---------- */
  function activate() {
    clearError();
    setPill("Activando…", false);
    var tasks = [requestCamera(), requestGps()];
    requestCompass();
    Promise.allSettled ? Promise.allSettled(tasks).then(finishActivate) : Promise.all(tasks.map(function (p) {
      return p.then(function () { return { status: "fulfilled" }; }, function () { return { status: "rejected" }; });
    })).then(finishActivate);
  }

  function finishActivate() {
    state.active = true;
    els.btnActivate.disabled = true;
    els.btnClose.classList.remove("hidden");
    setPill("Activo", true);
    updateHud();
    refreshAllPoints();
  }

  function closeCamera() {
    stopCamera();
    stopGps();
    CFG.points.forEach(function (p) {
      var ps = state.pointState[p.id];
      if (ps.debounceTimer) clearTimeout(ps.debounceTimer);
      ps.active = false;
      ps.manual = false;
      applyPoint(p.id);
      updatePointUI(p.id);
    });
    state.active = false;
    els.btnActivate.disabled = false;
    els.btnClose.classList.add("hidden");
    setPill("Inactivo", false);
    updateHud();
  }

  function restart() {
    closeCamera();
    clearError();
    setTimeout(activate, 300);
  }

  /* ---------- Service worker ---------- */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    }
  }

  /* ---------- Init ---------- */
  els.btnActivate.addEventListener("click", activate);
  els.btnClose.addEventListener("click", closeCamera);
  els.btnRestart.addEventListener("click", restart);

  buildPointList();
  updateHud();
  registerSW();
})();
