/**
 * BIOGENIOS - storage.js (v0.2)
 * -----------------------------------------------------------
 * Reemplaza el almacenamiento de usuario único por una sola
 * estructura: BIOGENIOS_DATA, que contiene hasta 4 perfiles
 * de jugador (estilo "¿Quién jugará?").
 *
 * Incluye migración automática: si detecta datos del sistema
 * viejo (v0.1, claves sueltas en localStorage), crea un jugador
 * con ese nombre y le asigna ese progreso, una sola vez.
 * -----------------------------------------------------------
 */

const BIOGENIOS_DATA_KEY = "BIOGENIOS_DATA";
const MAX_JUGADORES = 4;
const AVATARES_DISPONIBLES = ["🧬", "🦠", "🌱", "🧪", "🐸", "🌿", "🔬", "🦋"];

// Claves del sistema viejo (v0.1), usadas solo para migrar y luego limpiar.
const CLAVES_LEGADAS = {
  NOMBRE: "biogenios_nombre",
  PROGRESO: "biogenios_progreso",
  DIARIO: "biogenios_diario",
  SESIONES: "biogenios_sesiones"
};

const Storage = {

  // ---------------------------------------------------------
  // Lectura / escritura base de BIOGENIOS_DATA
  // ---------------------------------------------------------
  _leerData() {
    const raw = localStorage.getItem(BIOGENIOS_DATA_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Migración suave v0.2 -> v0.3: si ya existía BIOGENIOS_DATA pero sin cursosInstalados, se agrega.
      if (!Array.isArray(data.cursosInstalados)) {
        data.cursosInstalados = [];
        data.version = "0.3";
        this._guardarData(data);
      }
      return data;
    }

    // No existe aún: intentar migrar desde v0.1, o crear estructura vacía.
    const migrada = this._migrarDesdeV01();
    this._guardarData(migrada);
    return migrada;
  },
  _guardarData(data) {
    localStorage.setItem(BIOGENIOS_DATA_KEY, JSON.stringify(data));
  },
  _hoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  _diasEntre(fechaA, fechaB) {
    const a = new Date(fechaA + "T00:00:00");
    const b = new Date(fechaB + "T00:00:00");
    return Math.round((b - a) / 86400000);
  },

  // ---------------------------------------------------------
  // Migración automática desde el sistema de usuario único (v0.1)
  // ---------------------------------------------------------
  _migrarDesdeV01() {
    const nombreViejo = localStorage.getItem(CLAVES_LEGADAS.NOMBRE);

    const dataNueva = { version: "0.3", jugadorActivoId: null, jugadores: [], cursosInstalados: [] };

    if (!nombreViejo) return dataNueva;

    // Hay progreso de v0.1: crear un jugador migrado con ese nombre.
    const progresoViejo = JSON.parse(localStorage.getItem(CLAVES_LEGADAS.PROGRESO) || "{}");
    const diarioViejo = JSON.parse(localStorage.getItem(CLAVES_LEGADAS.DIARIO) || "null");
    const sesionesViejas = JSON.parse(localStorage.getItem(CLAVES_LEGADAS.SESIONES) || "[]");

    const jugadorMigrado = this._crearObjetoJugador(nombreViejo, "🧬");
    jugadorMigrado.progreso = progresoViejo;
    if (diarioViejo) jugadorMigrado.diario = diarioViejo;
    jugadorMigrado.sesiones = sesionesViejas;

    dataNueva.jugadores.push(jugadorMigrado);
    dataNueva.jugadorActivoId = jugadorMigrado.id;

    // Limpiar claves viejas para no migrar de nuevo en el futuro.
    Object.values(CLAVES_LEGADAS).forEach(clave => localStorage.removeItem(clave));

    return dataNueva;
  },

  // ---------------------------------------------------------
  // Estructura de un jugador nuevo
  // ---------------------------------------------------------
  _crearObjetoJugador(nombre, avatar) {
    return {
      id: "j_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      nombre: nombre.trim(),
      avatar,
      creadoEn: this._hoy(),
      progreso: {},                                  // { [modulo]: {aciertos, intentos} }
      diario: { fecha: null, resuelta: false, preguntaId: null },
      sesiones: [],
      racha: { actual: 0, mejor: 0, ultimaFecha: null }
    };
  },

  // ---------------------------------------------------------
  // Gestión de jugadores
  // ---------------------------------------------------------
  obtenerJugadores() {
    return this._leerData().jugadores;
  },
  obtenerJugadorActivo() {
    const data = this._leerData();
    return data.jugadores.find(j => j.id === data.jugadorActivoId) || null;
  },
  puedeCrearJugador() {
    return this.obtenerJugadores().length < MAX_JUGADORES;
  },
  crearJugador(nombre, avatar) {
    const data = this._leerData();
    if (data.jugadores.length >= MAX_JUGADORES) {
      throw new Error(`Máximo ${MAX_JUGADORES} jugadores por dispositivo.`);
    }
    const nuevo = this._crearObjetoJugador(nombre, avatar);
    data.jugadores.push(nuevo);
    data.jugadorActivoId = nuevo.id;
    this._guardarData(data);
    return nuevo;
  },
  seleccionarJugador(id) {
    const data = this._leerData();
    if (!data.jugadores.some(j => j.id === id)) return null;
    data.jugadorActivoId = id;
    this._guardarData(data);
    return data.jugadores.find(j => j.id === id);
  },
  eliminarJugador(id) {
    const data = this._leerData();
    data.jugadores = data.jugadores.filter(j => j.id !== id);
    if (data.jugadorActivoId === id) data.jugadorActivoId = null;
    this._guardarData(data);
  },
  avataresDisponibles() {
    return AVATARES_DISPONIBLES;
  },

  // ---------------------------------------------------------
  // Progreso por módulo (del jugador activo)
  // ---------------------------------------------------------
  registrarRespuesta(modulo, esCorrecta) {
    const data = this._leerData();
    const jugador = data.jugadores.find(j => j.id === data.jugadorActivoId);
    if (!jugador) return;

    if (!jugador.progreso[modulo]) jugador.progreso[modulo] = { aciertos: 0, intentos: 0 };
    jugador.progreso[modulo].intentos += 1;
    if (esCorrecta) {
      jugador.progreso[modulo].aciertos += 1;
      this._actualizarRacha(jugador);
    }
    this._guardarData(data);
  },
  obtenerProgreso() {
    const jugador = this.obtenerJugadorActivo();
    return jugador ? jugador.progreso : {};
  },

  // ---------------------------------------------------------
  // Racha (días consecutivos con al menos 1 acierto)
  // ---------------------------------------------------------
  _actualizarRacha(jugador) {
    const hoy = this._hoy();
    if (jugador.racha.ultimaFecha === hoy) return; // ya contó hoy

    const diff = jugador.racha.ultimaFecha ? this._diasEntre(jugador.racha.ultimaFecha, hoy) : null;

    if (diff === 1) {
      jugador.racha.actual += 1;            // día consecutivo
    } else {
      jugador.racha.actual = 1;             // se rompió la racha o es la primera vez
    }
    jugador.racha.mejor = Math.max(jugador.racha.mejor, jugador.racha.actual);
    jugador.racha.ultimaFecha = hoy;
  },
  obtenerRacha() {
    const jugador = this.obtenerJugadorActivo();
    return jugador ? jugador.racha : { actual: 0, mejor: 0, ultimaFecha: null };
  },

  // ---------------------------------------------------------
  // Pregunta del día (del jugador activo)
  // ---------------------------------------------------------
  obtenerEstadoDiario() {
    const jugador = this.obtenerJugadorActivo();
    if (!jugador) return { fecha: this._hoy(), resuelta: false, preguntaId: null };

    if (jugador.diario.fecha !== this._hoy()) {
      return { fecha: this._hoy(), resuelta: false, preguntaId: null };
    }
    return jugador.diario;
  },
  asignarPreguntaDiaria(preguntaId) {
    const data = this._leerData();
    const jugador = data.jugadores.find(j => j.id === data.jugadorActivoId);
    if (!jugador) return null;
    jugador.diario = { fecha: this._hoy(), resuelta: false, preguntaId };
    this._guardarData(data);
    return jugador.diario;
  },
  marcarDiariaResuelta() {
    const data = this._leerData();
    const jugador = data.jugadores.find(j => j.id === data.jugadorActivoId);
    if (!jugador) return;
    jugador.diario.resuelta = true;
    this._guardarData(data);
  },

  // ---------------------------------------------------------
  // Sesiones (mejores sesiones, ranking local por jugador)
  // ---------------------------------------------------------
  guardarSesion(aciertos, total) {
    const data = this._leerData();
    const jugador = data.jugadores.find(j => j.id === data.jugadorActivoId);
    if (!jugador) return;

    jugador.sesiones.push({ aciertos, total, fecha: this._hoy() });
    jugador.sesiones.sort((a, b) => (b.aciertos / b.total) - (a.aciertos / a.total));
    jugador.sesiones = jugador.sesiones.slice(0, 10);
    this._guardarData(data);
  },
  obtenerSesiones() {
    const jugador = this.obtenerJugadorActivo();
    return jugador ? jugador.sesiones : [];
  },

  // ---------------------------------------------------------
  // Cursos instalados (.biogenios) — v0.3
  // ---------------------------------------------------------
  obtenerCursosInstalados() {
    return this._leerData().cursosInstalados;
  },
  instalarCurso(curso) {
    const data = this._leerData();
    const yaExiste = data.cursosInstalados.some(c => c.id === curso.id);
    if (yaExiste) {
      data.cursosInstalados = data.cursosInstalados.map(c => c.id === curso.id ? curso : c);
    } else {
      data.cursosInstalados.push(curso);
    }
    this._guardarData(data);
    return curso;
  },
  desinstalarCurso(idCurso) {
    const data = this._leerData();
    data.cursosInstalados = data.cursosInstalados.filter(c => c.id !== idCurso);
    this._guardarData(data);
  }
};
