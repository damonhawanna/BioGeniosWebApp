/**
 * BIOGENIOS - app.js
 * Orquesta la navegación entre vistas y conecta Storage + Quiz con el DOM.
 */

const Estado = {
  nombre: "",
  moduloActivo: "libre",   // "libre" | "verano" | "semestral1" | "semestral2" | "temas" | "diario"
  temaActivo: null,
  preguntaActual: null,
  respondida: false,
  sesion: { aciertos: 0, total: 0 } // contador de la sesión actual (para "mejores sesiones")
};

const NOMBRES_MODULO = {
  libre: "Práctica libre",
  verano: "Verano",
  semestral1: "Semestral 1",
  semestral2: "Semestral 2 Intensivo",
  temas: "Temas Específicos",
  diario: "Pregunta del Día"
};

// ---------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const nombreGuardado = Storage.obtenerNombre();
  if (nombreGuardado) {
    Estado.nombre = nombreGuardado;
    iniciarApp();
  } else {
    mostrarPantallaNombre();
  }
});

function mostrarPantallaNombre() {
  document.getElementById("pantalla-nombre").classList.remove("oculto");
  document.getElementById("form-nombre").addEventListener("submit", (e) => {
    e.preventDefault();
    const valor = document.getElementById("input-nombre").value.trim();
    if (!valor) return;
    Storage.guardarNombre(valor);
    Estado.nombre = valor;
    document.getElementById("pantalla-nombre").classList.add("oculto");
    iniciarApp();
  });
}

function iniciarApp() {
  document.getElementById("app").classList.remove("oculto");
  document.getElementById("chip-nombre").textContent = `👤 ${Estado.nombre}`;

  construirNavModulos();
  construirGridTemas();
  enlazarEventosGlobales();

  revisarPreguntaDelDia();
  cambiarVista("libre");
}

// ---------------------------------------------------------------
// Navegación de módulos (topbar)
// ---------------------------------------------------------------
function construirNavModulos() {
  const nav = document.getElementById("nav-modulos");
  const botones = [
    { id: "libre", label: "🔀 Práctica libre" },
    { id: "verano", label: "☀️ Verano" },
    { id: "semestral1", label: "📘 Semestral 1" },
    { id: "semestral2", label: "🔥 Semestral 2" },
    { id: "temas", label: "🧬 Temas" }
  ];
  nav.innerHTML = botones.map(b =>
    `<button data-modulo="${b.id}">${b.label}</button>`
  ).join("");

  nav.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => cambiarVista(btn.dataset.modulo));
  });
}

function marcarBotonActivo(moduloId) {
  document.querySelectorAll(".nav-modulos button").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.modulo === moduloId);
  });
}

function enlazarEventosGlobales() {
  document.getElementById("btn-progreso").addEventListener("click", () => mostrarVistaProgreso());
  document.getElementById("btn-siguiente").addEventListener("click", () => siguientePregunta());
}

// ---------------------------------------------------------------
// Cambiar de vista / módulo
// ---------------------------------------------------------------
function cambiarVista(moduloId) {
  Estado.moduloActivo = moduloId;
  marcarBotonActivo(moduloId);

  document.getElementById("vista-temas").classList.add("oculto");
  document.getElementById("vista-progreso").classList.add("oculto");
  document.getElementById("vista-quiz").classList.remove("oculto");

  if (moduloId === "temas") {
    document.getElementById("vista-quiz").classList.add("oculto");
    document.getElementById("vista-temas").classList.remove("oculto");
    return;
  }

  cargarNuevaPregunta();
}

function mostrarVistaProgreso() {
  document.getElementById("vista-quiz").classList.add("oculto");
  document.getElementById("vista-temas").classList.add("oculto");
  document.getElementById("vista-progreso").classList.remove("oculto");
  renderizarProgreso();
}

// ---------------------------------------------------------------
// Temas específicos
// ---------------------------------------------------------------
function construirGridTemas() {
  const grid = document.getElementById("grid-temas");
  const temas = Quiz.temasDisponibles();
  grid.innerHTML = temas.map(t => `
    <button class="tarjeta-tema" data-tema="${t.tema}">
      <span class="nombre-tema">${t.tema}</span>
      <span class="conteo-tema">${t.cantidad} pregunta${t.cantidad !== 1 ? "s" : ""}</span>
    </button>
  `).join("");

  grid.querySelectorAll(".tarjeta-tema").forEach(btn => {
    btn.addEventListener("click", () => {
      Estado.temaActivo = btn.dataset.tema;
      document.getElementById("vista-temas").classList.add("oculto");
      document.getElementById("vista-quiz").classList.remove("oculto");
      cargarNuevaPregunta();
    });
  });
}

// ---------------------------------------------------------------
// Carga y render de preguntas
// ---------------------------------------------------------------
function cargarNuevaPregunta() {
  const excluirId = Estado.preguntaActual ? Estado.preguntaActual.id : null;

  if (Estado.moduloActivo === "libre") {
    Estado.preguntaActual = Quiz.preguntaAleatoriaGlobal(excluirId);
  } else if (Estado.moduloActivo === "temas") {
    Estado.preguntaActual = Quiz.preguntaAleatoriaDeModulo("temas", Estado.temaActivo, excluirId);
  } else if (Estado.moduloActivo === "diario") {
    const estadoDiario = Storage.obtenerEstadoDiario();
    Estado.preguntaActual = Quiz.obtenerPorId(estadoDiario.preguntaId);
  } else {
    Estado.preguntaActual = Quiz.preguntaAleatoriaDeModulo(Estado.moduloActivo, null, excluirId);
  }

  Estado.respondida = false;
  renderizarPregunta();
}

function siguientePregunta() {
  if (Estado.moduloActivo === "diario") {
    // La pregunta del día es única: "siguiente" regresa a práctica libre.
    cambiarVista("libre");
    return;
  }
  cargarNuevaPregunta();
}

function renderizarPregunta() {
  const p = Estado.preguntaActual;
  const eyebrow = document.getElementById("quiz-eyebrow");
  const tituloPregunta = document.getElementById("texto-pregunta");
  const lista = document.getElementById("lista-alternativas");
  const cajaFeedback = document.getElementById("caja-feedback");

  cajaFeedback.classList.add("oculto");

  if (!p) {
    eyebrow.textContent = NOMBRES_MODULO[Estado.moduloActivo] || "";
    tituloPregunta.textContent = "No hay preguntas disponibles en este módulo todavía.";
    lista.innerHTML = "";
    return;
  }

  const etiquetaModulo = Estado.moduloActivo === "diario"
    ? "PREGUNTA DEL DÍA"
    : `${NOMBRES_MODULO[p.modulo] || p.modulo} · ${p.tema}`.toUpperCase();

  eyebrow.textContent = etiquetaModulo;
  tituloPregunta.textContent = p.pregunta;

  const letras = ["A", "B", "C", "D", "E"];
  lista.innerHTML = p.alternativas.map((alt, i) => `
    <li class="alternativa" data-index="${i}" tabindex="0" role="button">
      <span class="marcador">${letras[i]}</span>
      <span class="texto-alt">${alt.texto}</span>
      <span class="emoji-resultado"></span>
    </li>
  `).join("");

  lista.querySelectorAll(".alternativa").forEach(li => {
    li.addEventListener("click", () => seleccionarAlternativa(parseInt(li.dataset.index, 10)));
    li.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") seleccionarAlternativa(parseInt(li.dataset.index, 10));
    });
  });
}

function seleccionarAlternativa(index) {
  if (Estado.respondida) return;
  Estado.respondida = true;

  const p = Estado.preguntaActual;
  const seleccionada = p.alternativas[index];
  const esCorrecta = seleccionada.esCorrecta;

  // Pintar todas las alternativas: marcar la correcta siempre, y la elegida si es incorrecta
  document.querySelectorAll(".alternativa").forEach((li, i) => {
    li.classList.add("bloqueada");
    const emoji = li.querySelector(".emoji-resultado");
    if (p.alternativas[i].esCorrecta) {
      li.classList.add("correcta");
      emoji.textContent = "✅";
    } else if (i === index) {
      li.classList.add("incorrecta");
      emoji.textContent = "❌";
    }
  });

  // Feedback / explicación
  const cajaFeedback = document.getElementById("caja-feedback");
  const titulo = document.getElementById("feedback-titulo");
  const texto = document.getElementById("feedback-texto");
  titulo.textContent = esCorrecta ? "✅ ¡Correcto!" : "❌ No es correcto";
  texto.textContent = p.explicacion;
  cajaFeedback.classList.remove("oculto");

  // Guardar progreso
  const moduloParaProgreso = Estado.moduloActivo === "libre" ? p.modulo : Estado.moduloActivo;
  Storage.registrarRespuesta(moduloParaProgreso === "diario" ? p.modulo : moduloParaProgreso, esCorrecta);

  Estado.sesion.total += 1;
  if (esCorrecta) Estado.sesion.aciertos += 1;
  Storage.guardarSesion(Estado.nombre, Estado.sesion.aciertos, Estado.sesion.total);

  if (Estado.moduloActivo === "diario") {
    Storage.marcarDiariaResuelta();
  }
}

// ---------------------------------------------------------------
// Pregunta del día / modal
// ---------------------------------------------------------------
function revisarPreguntaDelDia() {
  let estadoDiario = Storage.obtenerEstadoDiario();

  if (!estadoDiario.preguntaId) {
    const pregunta = Quiz.preguntaDelDia(Estado.nombre, estadoDiario.fecha);
    estadoDiario = Storage.asignarPreguntaDiaria(pregunta.id);
  }

  if (!estadoDiario.resuelta) {
    abrirModalDiario();
  }
}

function abrirModalDiario() {
  const modal = document.getElementById("modal-diario");
  modal.classList.remove("oculto");

  document.getElementById("btn-modal-mas-tarde").onclick = () => {
    modal.classList.add("oculto");
  };
  document.getElementById("btn-modal-resolver").onclick = () => {
    modal.classList.add("oculto");
    cambiarVista("diario");
  };
}

// ---------------------------------------------------------------
// Vista de progreso
// ---------------------------------------------------------------
function renderizarProgreso() {
  const progreso = Storage.obtenerProgreso();
  const contenedor = document.getElementById("tarjetas-progreso");

  const modulosAMostrar = ["verano", "semestral1", "semestral2", "temas"];
  contenedor.innerHTML = modulosAMostrar.map(m => {
    const datos = progreso[m] || { aciertos: 0, intentos: 0 };
    const pct = datos.intentos > 0 ? Math.round((datos.aciertos / datos.intentos) * 100) : 0;
    return `
      <div class="tarjeta-stat">
        <div class="valor-stat">${pct}%</div>
        <div class="label-stat">${NOMBRES_MODULO[m]}</div>
        <div class="label-stat">${datos.aciertos}/${datos.intentos} aciertos</div>
      </div>
    `;
  }).join("");

  const sesiones = Storage.obtenerSesiones();
  const ranking = document.getElementById("ranking-local");
  if (sesiones.length === 0) {
    ranking.innerHTML = `<li>Todavía no hay sesiones registradas. ¡Responde algunas preguntas!</li>`;
    return;
  }
  ranking.innerHTML = sesiones.map((s, i) => `
    <li>
      <span><span class="puesto">#${i + 1}</span>${s.nombre} — ${s.fecha}</span>
      <span>${s.aciertos}/${s.total} (${Math.round((s.aciertos / s.total) * 100)}%)</span>
    </li>
  `).join("");
}
