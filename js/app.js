/**
 * BIOGENIOS - app.js (v0.2)
 * Orquesta navegación, vistas y conecta Storage + Quiz con el DOM.
 * Ahora trabaja sobre el "jugador activo" en vez de un nombre único.
 */

const Estado = {
  jugador: null,
  moduloActivo: "libre",
  temaActivo: null,
  preguntaActual: null,
  respondida: false,
  sesion: { aciertos: 0, total: 0 }
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
  mostrarPantallaJugadores();
});

// ---------------------------------------------------------------
// Pantalla "¿Quién juega?"
// ---------------------------------------------------------------
function mostrarPantallaJugadores() {
  document.getElementById("app").classList.add("oculto");
  document.getElementById("pantalla-jugadores").classList.remove("oculto");
  renderizarGridPerfiles();
}

function renderizarGridPerfiles() {
  const grid = document.getElementById("grid-perfiles");
  const jugadores = Storage.obtenerJugadores();

  let html = jugadores.map(j => `
    <button class="tarjeta-perfil" data-id="${j.id}">
      <span class="avatar-perfil">${j.avatar}</span>
      <span class="nombre-perfil">${j.nombre}</span>
      <span class="racha-perfil">🔥 ${j.racha.actual} día${j.racha.actual !== 1 ? "s" : ""}</span>
    </button>
  `).join("");

  if (Storage.puedeCrearJugador()) {
    html += `
      <button class="tarjeta-perfil tarjeta-nueva" id="btn-nuevo-jugador">
        <span class="avatar-perfil">➕</span>
        <span class="nombre-perfil">Nuevo jugador</span>
      </button>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll(".tarjeta-perfil[data-id]").forEach(btn => {
    btn.addEventListener("click", () => seleccionarJugadorYEntrar(btn.dataset.id));
  });

  const btnNuevo = document.getElementById("btn-nuevo-jugador");
  if (btnNuevo) btnNuevo.addEventListener("click", abrirModalCrearJugador);
}

function seleccionarJugadorYEntrar(id) {
  const jugador = Storage.seleccionarJugador(id);
  if (!jugador) return;
  Estado.jugador = jugador;
  document.getElementById("pantalla-jugadores").classList.add("oculto");
  iniciarApp();
}

// ---------------------------------------------------------------
// Modal: crear jugador
// ---------------------------------------------------------------
let avatarSeleccionado = null;

function abrirModalCrearJugador() {
  const modal = document.getElementById("modal-crear-jugador");
  const grid = document.getElementById("grid-avatares");
  const avatares = Storage.avataresDisponibles();

  avatarSeleccionado = avatares[0];
  grid.innerHTML = avatares.map((a, i) => `
    <button type="button" class="opcion-avatar ${i === 0 ? "seleccionado" : ""}" data-avatar="${a}">${a}</button>
  `).join("");

  grid.querySelectorAll(".opcion-avatar").forEach(btn => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".opcion-avatar").forEach(b => b.classList.remove("seleccionado"));
      btn.classList.add("seleccionado");
      avatarSeleccionado = btn.dataset.avatar;
    });
  });

  document.getElementById("input-nombre-jugador").value = "";
  modal.classList.remove("oculto");

  document.getElementById("btn-cancelar-jugador").onclick = () => modal.classList.add("oculto");

  document.getElementById("form-crear-jugador").onsubmit = (e) => {
    e.preventDefault();
    const nombre = document.getElementById("input-nombre-jugador").value.trim();
    if (!nombre) return;
    const nuevo = Storage.crearJugador(nombre, avatarSeleccionado);
    modal.classList.add("oculto");
    Estado.jugador = nuevo;
    document.getElementById("pantalla-jugadores").classList.add("oculto");
    iniciarApp();
  };
}

// ---------------------------------------------------------------
// App principal (una vez elegido el jugador)
// ---------------------------------------------------------------
function iniciarApp() {
  document.getElementById("app").classList.remove("oculto");
  actualizarChipJugador();

  construirNavModulos();
  construirGridTemas();
  enlazarEventosGlobales();

  revisarPreguntaDelDia();
  cambiarVista("libre");
}

function actualizarChipJugador() {
  document.getElementById("chip-nombre").textContent = `${Estado.jugador.avatar} ${Estado.jugador.nombre}`;
  const racha = Storage.obtenerRacha();
  document.getElementById("chip-racha").textContent = `🔥 ${racha.actual}`;
  document.getElementById("chip-racha").title = `Racha actual: ${racha.actual} día(s) · Mejor racha: ${racha.mejor}`;
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
  document.getElementById("btn-cambiar-jugador").addEventListener("click", () => {
    document.getElementById("app").classList.add("oculto");
    mostrarPantallaJugadores();
  });
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

  const cajaFeedback = document.getElementById("caja-feedback");
  const titulo = document.getElementById("feedback-titulo");
  const texto = document.getElementById("feedback-texto");
  titulo.textContent = esCorrecta ? "✅ ¡Correcto!" : "❌ No es correcto";
  texto.textContent = p.explicacion;
  cajaFeedback.classList.remove("oculto");

  const moduloParaProgreso = Estado.moduloActivo === "libre" || Estado.moduloActivo === "diario"
    ? p.modulo
    : Estado.moduloActivo;
  Storage.registrarRespuesta(moduloParaProgreso, esCorrecta);

  Estado.sesion.total += 1;
  if (esCorrecta) Estado.sesion.aciertos += 1;
  Storage.guardarSesion(Estado.sesion.aciertos, Estado.sesion.total);

  if (Estado.moduloActivo === "diario") {
    Storage.marcarDiariaResuelta();
  }

  actualizarChipJugador(); // refleja racha actualizada al instante
}

// ---------------------------------------------------------------
// Pregunta del día / modal
// ---------------------------------------------------------------
function revisarPreguntaDelDia() {
  let estadoDiario = Storage.obtenerEstadoDiario();

  if (!estadoDiario.preguntaId) {
    const pregunta = Quiz.preguntaDelDia(Estado.jugador.nombre, estadoDiario.fecha);
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

  const racha = Storage.obtenerRacha();
  contenedor.innerHTML += `
    <div class="tarjeta-stat">
      <div class="valor-stat">🔥 ${racha.actual}</div>
      <div class="label-stat">Racha actual</div>
      <div class="label-stat">Mejor: ${racha.mejor} días</div>
    </div>
  `;

  const sesiones = Storage.obtenerSesiones();
  const ranking = document.getElementById("ranking-local");
  if (sesiones.length === 0) {
    ranking.innerHTML = `<li>Todavía no hay sesiones registradas. ¡Responde algunas preguntas!</li>`;
    return;
  }
  ranking.innerHTML = sesiones.map((s, i) => `
    <li>
      <span><span class="puesto">#${i + 1}</span>${Estado.jugador.avatar} ${Estado.jugador.nombre} — ${s.fecha}</span>
      <span>${s.aciertos}/${s.total} (${Math.round((s.aciertos / s.total) * 100)}%)</span>
    </li>
  `).join("");
}
