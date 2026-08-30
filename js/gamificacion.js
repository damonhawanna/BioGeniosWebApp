/**
 * BIOGENIOS - gamificacion.js (v0.4)
 * -----------------------------------------------------------
 * Motor de recompensas variables + XP + insignias + frases.
 * Diseñado bajo el principio de refuerzo de razón variable:
 * las recompensas NUNCA siguen un patrón fijo, para mantener
 * la sorpresa y el deseo de seguir jugando.
 * -----------------------------------------------------------
 */

const XP_BASE_ACIERTO = 10;
const XP_BASE_ERROR = 2;        // pequeño XP de consuelo: el esfuerzo también cuenta
const XP_BONUS_RACHA_RONDA = 5; // por cada acierto consecutivo dentro de la ronda

// ---------------------------------------------------------------
// Catálogo de insignias (logros desbloqueables)
// ---------------------------------------------------------------
const INSIGNIAS = [
  { id: "primer_paso",      nombre: "Primer Paso",        emoji: "🌱", descripcion: "Completaste tu primer Fast Test." },
  { id: "ronda_perfecta",   nombre: "Ronda Perfecta",      emoji: "🏅", descripcion: "5 de 5 en una sola ronda." },
  { id: "racha_3_dias",     nombre: "Constancia",          emoji: "🔥", descripcion: "3 días seguidos jugando." },
  { id: "racha_7_dias",     nombre: "Imparable",           emoji: "⚡", descripcion: "7 días seguidos jugando." },
  { id: "explorador",       nombre: "Explorador",          emoji: "🧭", descripcion: "Respondiste preguntas de 3 cursos distintos." },
  { id: "veterano_50",      nombre: "Veterano",            emoji: "🎖️", descripcion: "50 preguntas respondidas en total." },
  { id: "veterano_100",     nombre: "Maestro Celular",     emoji: "🧬", descripcion: "100 preguntas respondidas en total." }
];

// ---------------------------------------------------------------
// Datos curiosos de biología (para el evento sorpresa)
// ---------------------------------------------------------------
const DATOS_CURIOSOS = [
  "Tus pulmones contienen unos 300 millones de alvéolos: si se desplegaran, cubrirían casi una cancha de tenis.",
  "El ADN humano, estirado por completo, mide cerca de 2 metros por célula, pero cabe en un núcleo microscópico.",
  "Las células rojas de la sangre no tienen núcleo: lo pierden durante su maduración para cargar más oxígeno.",
  "Una sola célula vegetal puede tener cientos de cloroplastos trabajando al mismo tiempo.",
  "El cuerpo humano reemplaza la mayoría de sus células cada 7 a 10 años aproximadamente.",
  "Las bacterias pueden dividirse cada 20 minutos en condiciones óptimas, generando millones en pocas horas.",
  "El cerebro humano tiene más conexiones neuronales que estrellas estimadas en la Vía Láctea.",
  "Algunas arqueas sobreviven en fuentes termales a más de 80°C gracias a proteínas especialmente estables.",
  "La mitocondria tiene su propio ADN, distinto al del núcleo: una pista de su origen bacteriano ancestral.",
  "Una célula eucariota promedio tiene un volumen miles de veces mayor que una célula procariota típica."
];

// ---------------------------------------------------------------
// Frases motivadoras (tono adulto, sin infantilismos)
// ---------------------------------------------------------------
const FRASES_RACHA_ACIERTOS = [
  "Vas encendido.",
  "Ritmo perfecto.",
  "Estás en zona.",
  "Imparable ahora mismo.",
  "Eso es precisión."
];

const FRASES_CIERRE_BUENO = [
  "Sesión sólida. Repetir es la clave.",
  "Así se construye el dominio del tema.",
  "Cada ronda te deja más cerca.",
  "Buen ojo clínico para los detalles."
];

const FRASES_CIERRE_NEUTRO = [
  "Toda ronda suma. Vamos por la siguiente.",
  "El progreso no siempre se ve, pero se acumula.",
  "Esto es entrenamiento, no examen. Sigue."
];

// ---------------------------------------------------------------
// Motor de recompensas variables
// ---------------------------------------------------------------
const Gamificacion = {

  xpPorRespuesta(esCorrecta, rachaAciertosRonda) {
    let xp = esCorrecta ? XP_BASE_ACIERTO : XP_BASE_ERROR;
    if (esCorrecta && rachaAciertosRonda >= 2) {
      xp += XP_BONUS_RACHA_RONDA; // bonus por mantener racha dentro de la ronda
    }
    return xp;
  },

  fraseParaRacha(rachaAciertosRonda) {
    if (rachaAciertosRonda < 2) return null;
    return FRASES_RACHA_ACIERTOS[Math.floor(Math.random() * FRASES_RACHA_ACIERTOS.length)];
  },

  /**
   * Genera (o no) un evento sorpresa tras responder una pregunta.
   * Probabilidad ~38%, y el TIPO de evento también es aleatorio.
   * Esto es intencional: la variabilidad es lo que mantiene el enganche
   * (refuerzo de razón variable), nunca debe sentirse predecible.
   *
   * Devuelve null si no hay evento esta vez (es lo más común, ~62%).
   */
  generarEventoSorpresa() {
    const PROBABILIDAD_EVENTO = 0.38;
    if (Math.random() > PROBABILIDAD_EVENTO) return null;

    const tipos = ["xp_extra", "dato_curioso", "estadistica_social", "coleccionable"];
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];

    switch (tipo) {
      case "xp_extra": {
        const cantidad = [5, 10, 15][Math.floor(Math.random() * 3)];
        return { tipo, emoji: "✨", titulo: `+${cantidad} XP extra`, detalle: "Bonificación sorpresa.", xp: cantidad };
      }
      case "dato_curioso": {
        const dato = DATOS_CURIOSOS[Math.floor(Math.random() * DATOS_CURIOSOS.length)];
        return { tipo, emoji: "🔎", titulo: "Dato curioso", detalle: dato };
      }
      case "estadistica_social": {
        const porcentaje = 10 + Math.floor(Math.random() * 40); // 10%-49%, sensación de exclusividad
        return { tipo, emoji: "📊", titulo: `Solo el ${porcentaje}% acertó esta pregunta`, detalle: "Vas por encima del promedio." };
      }
      case "coleccionable": {
        const item = this._coleccionableAleatorio();
        return { tipo, emoji: item.emoji, titulo: `Nuevo elemento: ${item.nombre}`, detalle: item.descripcion, itemId: item.id };
      }
    }
  },

  _coleccionableAleatorio() {
    const COLECCIONABLES = [
      { id: "espora", emoji: "🦠", nombre: "Espora resistente", descripcion: "Sobrevive incluso en condiciones extremas." },
      { id: "hoja", emoji: "🍃", nombre: "Hoja fotosintética", descripcion: "Captura luz para transformarla en energía." },
      { id: "adn", emoji: "🧬", nombre: "Fragmento de ADN", descripcion: "Una pieza del código de la vida." },
      { id: "celula", emoji: "🔬", nombre: "Célula muestra", descripcion: "Lista para ser observada al microscopio." },
      { id: "mitocondria", emoji: "🔋", nombre: "Mitocondria", descripcion: "La central energética en miniatura." }
    ];
    return COLECCIONABLES[Math.floor(Math.random() * COLECCIONABLES.length)];
  },

  /**
   * Revisa qué insignias nuevas corresponden desbloquear tras una ronda.
   * Devuelve un array de insignias recién desbloqueadas (puede estar vacío).
   */
  revisarInsigniasTrasRonda({ aciertos, total, esPrimeraRondaDeSiempre }) {
    const nuevas = [];

    const intentar = (id) => {
      const yaExistia = !Storage.desbloquearInsignia(id);
      if (!yaExistia) nuevas.push(INSIGNIAS.find(i => i.id === id));
    };

    if (esPrimeraRondaDeSiempre) intentar("primer_paso");
    if (aciertos === total) intentar("ronda_perfecta");

    const racha = Storage.obtenerRacha();
    if (racha.actual >= 3) intentar("racha_3_dias");
    if (racha.actual >= 7) intentar("racha_7_dias");

    const totalPreguntas = Storage.contarPreguntasRespondidasTotal();
    if (totalPreguntas >= 50) intentar("veterano_50");
    if (totalPreguntas >= 100) intentar("veterano_100");

    const progreso = Storage.obtenerProgreso();
    if (Object.keys(progreso).length >= 3) intentar("explorador");

    return nuevas;
  },

  fraseDeCierre(aciertos, total) {
    const lista = (aciertos / total) >= 0.6 ? FRASES_CIERRE_BUENO : FRASES_CIERRE_NEUTRO;
    return lista[Math.floor(Math.random() * lista.length)];
  },

  obtenerInsignia(id) {
    return INSIGNIAS.find(i => i.id === id);
  },
  todasLasInsignias() {
    return INSIGNIAS;
  }
};
