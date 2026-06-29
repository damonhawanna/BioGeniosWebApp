/**
 * BIOGENIOS - quiz.js (v0.3)
 * Lógica pura de selección y mezcla de preguntas.
 * Ya no usa un banco fijo: todas las preguntas vienen de
 * Cursos.todasLasPreguntas(), es decir, de los cursos instalados.
 */

const Quiz = {
  _mezclar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  },

  _semillaDesdeTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      hash = (hash << 5) - hash + texto.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  },

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
   * Todas las preguntas disponibles, de todos los cursos instalados.
   */
  _todasLasPreguntas() {
    return Cursos.todasLasPreguntas();
  },

  /**
   * Filtra preguntas por módulo (= curso) y opcionalmente por tema.
   */
  filtrarPorModulo(modulo, tema = null) {
    return this._todasLasPreguntas().filter(p =>
      p.modulo === modulo && (tema ? p.tema === tema : true)
    );
  },

  /**
   * Pregunta aleatoria de TODOS los cursos instalados combinados.
   */
  preguntaAleatoriaGlobal(excluirId = null) {
    let pool = this._todasLasPreguntas();
    if (pool.length === 0) return null;
    if (excluirId && pool.length > 1) {
      pool = pool.filter(p => p.id !== excluirId);
    }
    const idx = Math.floor(Math.random() * pool.length);
    return this._prepararPregunta(pool[idx]);
  },

  /**
   * Pregunta aleatoria dentro de un módulo/curso (y tema opcional).
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
   * Pregunta del día: aleatoria pero determinista para (usuario, fecha),
   * usando todas las preguntas de los cursos instalados.
   */
  preguntaDelDia(nombreUsuario, fechaTexto) {
    const todas = this._todasLasPreguntas();
    if (todas.length === 0) return null;
    const semilla = this._semillaDesdeTexto(nombreUsuario + fechaTexto);
    const prng = this._prngDesdeSemilla(semilla);
    const idx = Math.floor(prng() * todas.length);
    return this._prepararPregunta(todas[idx]);
  },

  obtenerPorId(id) {
    const original = this._todasLasPreguntas().find(p => p.id === id);
    return original ? this._prepararPregunta(original) : null;
  },

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
      alternativas: mezcladas
    };
  },

  /**
   * Temas únicos disponibles dentro de un módulo/curso específico.
   * (En v0.3, "Temas específicos" ya no es un módulo fijo: cada curso
   * puede tener sus propios temas internos).
   */
  temasDeModulo(modulo) {
    const preguntas = this.filtrarPorModulo(modulo);
    const temas = [...new Set(preguntas.map(p => p.tema))];
    return temas.map(tema => ({
      tema,
      cantidad: preguntas.filter(p => p.tema === tema).length
    }));
  }
};
