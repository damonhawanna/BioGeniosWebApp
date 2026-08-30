/**
 * BIOGENIOS - fasttest.js (v0.4)
 * -----------------------------------------------------------
 * Controla una "ronda" de Fast Test: 5 preguntas, auto-avance,
 * eventos sorpresa intermitentes, y pantalla de celebración final.
 *
 * Decisión UX clave: no hay botón "Siguiente" manual aquí.
 * Tras responder, el feedback se muestra ~1.1s y avanza solo.
 * Menos clics = menos fricción = sesión más fluida.
 * -----------------------------------------------------------
 */

const PREGUNTAS_POR_RONDA = 5;
const MS_AUTO_AVANCE = 1100; // tiempo para leer el feedback antes de avanzar
const MS_EVENTO_SORPRESA = 1600; // tiempo que se muestra el evento sorpresa

const FastTest = {
  ronda: {
    preguntas: [],
    indice: 0,
    aciertos: 0,
    rachaAciertosRonda: 0,
    xpGanado: 0,
    insigniasNuevas: []
  },

  iniciarRonda() {
    const pool = Quiz._todasLasPreguntas
      ? Quiz._todasLasPreguntas()
      : Cursos.todasLasPreguntas();

    if (pool.length === 0) return false;

    const cantidad = Math.min(PREGUNTAS_POR_RONDA, pool.length);
    const mezcladas = Quiz._mezclar(pool).slice(0, cantidad);

    this.ronda = {
      preguntas: mezcladas.map(p => Quiz._prepararPregunta(p)),
      indice: 0,
      aciertos: 0,
      rachaAciertosRonda: 0,
      xpGanado: 0,
      insigniasNuevas: []
    };
    return true;
  },

  preguntaActual() {
    return this.ronda.preguntas[this.ronda.indice];
  },

  totalPreguntas() {
    return this.ronda.preguntas.length;
  },

  esUltimaPregunta() {
    return this.ronda.indice === this.ronda.preguntas.length - 1;
  },

  /**
   * Procesa la respuesta del usuario. Devuelve los datos necesarios
   * para que la UI pinte feedback + decida si mostrar evento sorpresa.
   */
  responder(indexAlternativa) {
    const pregunta = this.preguntaActual();
    const esCorrecta = pregunta.alternativas[indexAlternativa].esCorrecta;

    if (esCorrecta) {
      this.ronda.aciertos += 1;
      this.ronda.rachaAciertosRonda += 1;
    } else {
      this.ronda.rachaAciertosRonda = 0;
    }

    const xp = Gamificacion.xpPorRespuesta(esCorrecta, this.ronda.rachaAciertosRonda);
    this.ronda.xpGanado += xp;
    Storage.agregarXP(xp);
    Storage.registrarRespuesta(pregunta.modulo, esCorrecta);

    const frasePorRacha = esCorrecta ? Gamificacion.fraseParaRacha(this.ronda.rachaAciertosRonda) : null;

    // Evento sorpresa: solo se evalúa si NO es la última pregunta
    // (evita saturar justo antes de la celebración final).
    let evento = null;
    if (!this.esUltimaPregunta()) {
      evento = Gamificacion.generarEventoSorpresa();
      if (evento?.tipo === "xp_extra") {
        this.ronda.xpGanado += evento.xp;
        Storage.agregarXP(evento.xp);
      }
      if (evento?.tipo === "coleccionable") {
        Storage.agregarColeccionable(evento.itemId);
      }
    }

    return { esCorrecta, xpGanado: xp, frasePorRacha, evento };
  },

  avanzar() {
    this.ronda.indice += 1;
    return this.ronda.indice < this.ronda.preguntas.length;
  },

  /**
   * Cierra la ronda: marca racha diaria, revisa insignias, devuelve resumen.
   */
  finalizarRonda() {
    const esPrimeraRondaDeSiempre = Storage.contarPreguntasRespondidasTotal() === this.ronda.preguntas.length;

    Storage.guardarSesion(this.ronda.aciertos, this.ronda.preguntas.length);

    const insigniasNuevas = Gamificacion.revisarInsigniasTrasRonda({
      aciertos: this.ronda.aciertos,
      total: this.ronda.preguntas.length,
      esPrimeraRondaDeSiempre
    });

    return {
      aciertos: this.ronda.aciertos,
      total: this.ronda.preguntas.length,
      xpGanado: this.ronda.xpGanado,
      insigniasNuevas,
      frase: Gamificacion.fraseDeCierre(this.ronda.aciertos, this.ronda.preguntas.length),
      racha: Storage.obtenerRacha()
    };
  }
};
