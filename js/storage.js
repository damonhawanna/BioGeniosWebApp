/**
 * BIOGENIOS - storage.js
 * Maneja todo lo que se guarda en localStorage:
 *  - nombre del usuario
 *  - progreso (aciertos/intentos) por módulo
 *  - estado de la pregunta del día (si ya se resolvió hoy)
 *  - "mejores sesiones" (ranking local)
 */

const STORAGE_KEYS = {
  NOMBRE: "biogenios_nombre",
  PROGRESO: "biogenios_progreso",       // { [modulo]: { aciertos, intentos } }
  DIARIO: "biogenios_diario",           // { fecha: "YYYY-MM-DD", resuelta: bool, preguntaId: string }
  SESIONES: "biogenios_sesiones"        // [{ nombre, aciertos, total, fecha }]
};

const Storage = {
  // ---------- Usuario ----------
  obtenerNombre() {
    return localStorage.getItem(STORAGE_KEYS.NOMBRE) || "";
  },
  guardarNombre(nombre) {
    localStorage.setItem(STORAGE_KEYS.NOMBRE, nombre.trim());
  },

  // ---------- Progreso por módulo ----------
  obtenerProgreso() {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESO);
    return raw ? JSON.parse(raw) : {};
  },
  registrarRespuesta(modulo, esCorrecta) {
    const progreso = this.obtenerProgreso();
    if (!progreso[modulo]) progreso[modulo] = { aciertos: 0, intentos: 0 };
    progreso[modulo].intentos += 1;
    if (esCorrecta) progreso[modulo].aciertos += 1;
    localStorage.setItem(STORAGE_KEYS.PROGRESO, JSON.stringify(progreso));
  },

  // ---------- Pregunta del día ----------
  _hoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  obtenerEstadoDiario() {
    const raw = localStorage.getItem(STORAGE_KEYS.DIARIO);
    const estado = raw ? JSON.parse(raw) : null;
    if (!estado || estado.fecha !== this._hoy()) {
      // Nuevo día: se reinicia el estado (pero no se guarda hasta que haya una pregunta asignada)
      return { fecha: this._hoy(), resuelta: false, preguntaId: null };
    }
    return estado;
  },
  asignarPreguntaDiaria(preguntaId) {
    const estado = { fecha: this._hoy(), resuelta: false, preguntaId };
    localStorage.setItem(STORAGE_KEYS.DIARIO, JSON.stringify(estado));
    return estado;
  },
  marcarDiariaResuelta() {
    const estado = this.obtenerEstadoDiario();
    estado.resuelta = true;
    localStorage.setItem(STORAGE_KEYS.DIARIO, JSON.stringify(estado));
  },

  // ---------- Ranking local (mejores sesiones) ----------
  obtenerSesiones() {
    const raw = localStorage.getItem(STORAGE_KEYS.SESIONES);
    return raw ? JSON.parse(raw) : [];
  },
  guardarSesion(nombre, aciertos, total) {
    const sesiones = this.obtenerSesiones();
    sesiones.push({ nombre, aciertos, total, fecha: this._hoy() });
    // Ordenar por % de aciertos descendente, conservar top 10
    sesiones.sort((a, b) => (b.aciertos / b.total) - (a.aciertos / a.total));
    localStorage.setItem(STORAGE_KEYS.SESIONES, JSON.stringify(sesiones.slice(0, 10)));
  }
};
