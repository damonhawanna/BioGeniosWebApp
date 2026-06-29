/**
 * BIOGENIOS - quiz.js
 * Lógica pura de selección y mezcla de preguntas.
 * No toca el DOM: solo devuelve datos listos para que app.js los renderice.
 */

const Quiz = {
  /**
   * Mezcla un array (Fisher-Yates) sin mutar el original.
   */
  _mezclar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  },

  /**
   * Genera una semilla numérica simple a partir de un string (nombre+fecha).
   */
  _semillaDesdeTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      hash = (hash << 5) - hash + texto.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  },

  /**
   * PRNG simple determinista (mulberry32) para que la pregunta del día
   * sea distinta por usuario pero estable durante todo el día.
   */
  _prngDesdeSemilla(semilla) {
    let a = semilla;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /**
   * Filtra preguntas por módulo (y opcionalmente por tema).
   */
  filtrarPorModulo(modulo, tema = null) {
    return PREGUNTAS.filter(p =>
      p.modulo === modulo && (tema ? p.tema === tema : true)
    );
  },

  /**
   * Devuelve una pregunta aleatoria de TODOS los módulos combinados.
   * Evita repetir la pregunta anterior (excluirId) si hay más de una disponible.
   */
  preguntaAleatoriaGlobal(excluirId = null) {
    let pool = PREGUNTAS;
    if (excluirId && pool.length > 1) {
      pool = pool.filter(p => p.id !== excluirId);
    }
    const idx = Math.floor(Math.random() * pool.length);
    return this._prepararPregunta(pool[idx]);
  },

  /**
   * Devuelve una pregunta aleatoria dentro de un módulo (y tema opcional).
   */
  preguntaAleatoriaDeModulo(modulo, tema = null, excluirId = null) {
    let pool = this.filtrarPorModulo(modulo, tema);
    if (pool.length === 0) return null;
    if (excluirId && pool.length > 1) {
      pool = pool.filter(p => p.id !== excluirId);
    }
    const idx = Math.floor(Math.random() * pool.length);
    return this._prepararPregunta(pool[idx]);
  },

  /**
   * Devuelve la pregunta del día: aleatoria pero determinista para
   * el par (nombreUsuario, fechaHoy), usando todo el banco de preguntas.
   */
  preguntaDelDia(nombreUsuario, fechaTexto) {
    const semilla = this._semillaDesdeTexto(nombreUsuario + fechaTexto);
    const prng = this._prngDesdeSemilla(semilla);
    const idx = Math.floor(prng() * PREGUNTAS.length);
    return this._prepararPregunta(PREGUNTAS[idx]);
  },

  /**
   * Busca una pregunta ya elegida por su id (para reconstruir la pregunta
   * del día guardada en localStorage).
   */
  obtenerPorId(id) {
    const original = PREGUNTAS.find(p => p.id === id);
    return original ? this._prepararPregunta(original) : null;
  },

  /**
   * Toma la pregunta "cruda" del banco y devuelve una versión lista para
   * mostrar: alternativas mezcladas + índice correcto recalculado.
   */
  _prepararPregunta(preguntaOriginal) {
    const alternativasConIndice = preguntaOriginal.alternativas.map((texto, i) => ({
      texto,
      esCorrecta: i === preguntaOriginal.correctaIndex
    }));
    const mezcladas = this._mezclar(alternativasConIndice);

    return {
      id: preguntaOriginal.id,
      modulo: preguntaOriginal.modulo,
      tema: preguntaOriginal.tema,
      pregunta: preguntaOriginal.pregunta,
      explicacion: preguntaOriginal.explicacion,
      alternativas: mezcladas // [{texto, esCorrecta}, ...] ya en orden de presentación
    };
  },

  /**
   * Lista de temas únicos disponibles en el módulo "temas".
   */
  temasDisponibles() {
    const temas = this.filtrarPorModulo("temas").map(p => p.tema);
    const unicos = [...new Set(temas)];
    return unicos.map(tema => ({
      tema,
      cantidad: PREGUNTAS.filter(p => p.modulo === "temas" && p.tema === tema).length
    }));
  }
};
