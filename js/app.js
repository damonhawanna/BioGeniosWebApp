/**
 * BIOGENIOS - app.js (v0.3)
 * Navegación con cursos instalables, dropdown dinámico de cursos,
 * pantalla de instalación con drag & drop y botón de curso demo.
 */

const Estado = {
  jugador: null,
  vistaActiva: "libre",      // "libre" | "diario" | "curso:{modulo}" | "instalar" | "progreso"
  moduloCursoActivo: null,   // id del módulo/curso seleccionado en dropdown
  preguntaActual: null,
  respondida: false,
  sesion: { aciertos: 0, total: 0 }
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
  grid.querySelectorAll(".tarjeta-perfil[data-id]").forEach(btn =>
    btn.addEventListener("click", () => seleccionarJugadorYEntrar(btn.dataset.id))
  );
  const btnNuevo = document.getElementById("btn-nuevo-jugador");
  if (btnNuevo) btnNuevo.addEventListener("click", abrirModalCrearJugador);
}

function seleccionarJugadorYEntrar(id) {
  const jugador = Storage.seleccionarJugador(id);
  if (!jugador) return;
  Estado.jugador = jugador;
  Estado.sesion = { aciertos: 0, total: 0 };
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
// App principal
// ---------------------------------------------------------------
function iniciarApp() {
  document.getElementById("app").classList.remove("oculto");
  actualizarChipJugador();
  construirDropdownCursos();
  enlazarEventosGlobales();
  enlazarInstalacion();

  // Si no hay cursos instalados, ir directo a pantalla vacía
  if (Cursos.obtenerCursosInstalados().length === 0) {
    cambiarVista("sin-cursos");
  } else {
    revisarPreguntaDelDia();
    cambiarVista("libre");
  }
}

function actualizarChipJugador() {
  document.getElementById("chip-nombre").textContent = `${Estado.jugador.avatar} ${Estado.jugador.nombre}`;
  const racha = Storage.obtenerRacha();
  const chip = document.getElementById("chip-racha");
  chip.textContent = `🔥 ${racha.actual}`;
  chip.title = `Racha actual: ${racha.actual} día(s) · Mejor: ${racha.mejor}`;
}

// ---------------------------------------------------------------
// Dropdown de cursos (dinámico)
// ---------------------------------------------------------------
function construirDropdownCursos() {
  const menuEl = document.getElementById("menu-cursos");
  const cursos = Cursos.obtenerCursosInstalados();

  if (cursos.length === 0) {
    menuEl.innerHTML = `<div class="dropdown-vacio">Sin cursos instalados — ve a 🔬 Instalar</div>`;
  } else {
    menuEl.innerHTML = cursos.map(c => `
      <button class="dropdown-item" data-modulo="${c.modulo}">
        ${c.nombre}
        <span class="dropdown-item-sub">${c.preguntas.length} preguntas · ${c.autor}</span>
      </button>
    `).join("");
    menuEl.querySelectorAll(".dropdown-item").forEach(btn => {
      btn.addEventListener("click", () => {
        cerrarDropdown();
        cambiarVista("curso", btn.dataset.modulo);
      });
    });
  }

  // Toggle dropdown
  const btnDropdown = document.getElementById("btn-dropdown-cursos");
  const dropdown = document.getElementById("dropdown-cursos");
  btnDropdown.onclick = (e) => {
    e.stopPropagation();
    const abierto = dropdown.classList.toggle("abierto");
    menuEl.classList.toggle("oculto", !abierto);
  };
  document.addEventListener("click", () => cerrarDropdown());
}

function cerrarDropdown() {
  const dropdown = document.getElementById("dropdown-cursos");
  dropdown.classList.remove("abierto");
  document.getElementById("menu-cursos").classList.add("oculto");
}

// ---------------------------------------------------------------
// Navegación de vistas
// ---------------------------------------------------------------
function enlazarEventosGlobales() {
  document.getElementById("btn-progreso").addEventListener("click", () => cambiarVista("progreso"));
  document.getElementById("btn-siguiente").addEventListener("click", () => siguientePregunta());
  document.getElementById("btn-cambiar-jugador").addEventListener("click", () => {
    document.getElementById("app").classList.add("oculto");
    mostrarPantallaJugadores();
  });
  document.querySelectorAll(".btn-nav[data-vista]").forEach(btn => {
    btn.addEventListener("click", () => cambiarVista(btn.dataset.vista));
  });
  document.getElementById("btn-ir-instalar")?.addEventListener("click", () => cambiarVista("instalar"));
}

const TODAS_VISTAS = ["quiz", "sin-cursos", "instalar", "progreso"];

function cambiarVista(tipo, modulo = null) {
  Estado.vistaActiva = tipo;
  Estado.moduloCursoActivo = modulo;

  // Ocultar todas las vistas
  TODAS_VISTAS.forEach(v => document.getElementById(`vista-${v}`)?.classList.add("oculto"));

  // Marcar botones activos
  document.querySelectorAll(".btn-nav[data-vista]").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.vista === tipo);
  });
  document.querySelectorAll(".dropdown-item").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.modulo === modulo);
  });

  switch (tipo) {
    case "libre":
    case "diario":
    case "curso":
      document.getElementById("vista-quiz").classList.remove("oculto");
      cargarNuevaPregunta();
      break;
    case "sin-cursos":
      document.getElementById("vista-sin-cursos").classList.remove("oculto");
      break;
    case "instalar":
      document.getElementById("vista-instalar").classList.remove("oculto");
      renderizarPantallaInstalar();
      break;
    case "progreso":
      document.getElementById("vista-progreso").classList.remove("oculto");
      renderizarProgreso();
      break;
  }
}

// ---------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------
function cargarNuevaPregunta() {
  const excluirId = Estado.preguntaActual?.id || null;

  if (Estado.vistaActiva === "libre") {
    Estado.preguntaActual = Quiz.preguntaAleatoriaGlobal(excluirId);
  } else if (Estado.vistaActiva === "diario") {
    const estadoDiario = Storage.obtenerEstadoDiario();
    Estado.preguntaActual = estadoDiario.preguntaId
      ? Quiz.obtenerPorId(estadoDiario.preguntaId)
      : null;
  } else if (Estado.vistaActiva === "curso" && Estado.moduloCursoActivo) {
    Estado.preguntaActual = Quiz.preguntaAleatoriaDeModulo(Estado.moduloCursoActivo, null, excluirId);
  }

  Estado.respondida = false;
  renderizarPregunta();
}

function siguientePregunta() {
  if (Estado.vistaActiva === "diario") {
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
    eyebrow.textContent = Estado.vistaActiva === "diario" ? "PREGUNTA DEL DÍA" : "PRÁCTICA LIBRE";
    tituloPregunta.textContent = Cursos.obtenerCursosInstalados().length === 0
      ? "No hay cursos instalados. Ve a 🔬 Instalar para agregar uno."
      : "No hay preguntas disponibles en este módulo.";
    lista.innerHTML = "";
    return;
  }

  eyebrow.textContent = Estado.vistaActiva === "diario"
    ? `📌 PREGUNTA DEL DÍA · ${p.tema}`
    : `${p.modulo.toUpperCase()} · ${p.tema}`;

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
  const esCorrecta = p.alternativas[index].esCorrecta;

  document.querySelectorAll(".alternativa").forEach((li, i) => {
    li.classList.add("bloqueada");
    const emoji = li.querySelector(".emoji-resultado");
    if (p.alternativas[i].esCorrecta) {
      li.classList.add("correcta"); emoji.textContent = "✅";
    } else if (i === index) {
      li.classList.add("incorrecta"); emoji.textContent = "❌";
    }
  });

  document.getElementById("feedback-titulo").textContent = esCorrecta ? "✅ ¡Correcto!" : "❌ No es correcto";
  document.getElementById("feedback-texto").textContent = p.explicacion;
  document.getElementById("caja-feedback").classList.remove("oculto");

  Storage.registrarRespuesta(p.modulo, esCorrecta);
  Estado.sesion.total += 1;
  if (esCorrecta) Estado.sesion.aciertos += 1;
  Storage.guardarSesion(Estado.sesion.aciertos, Estado.sesion.total);

  if (Estado.vistaActiva === "diario") Storage.marcarDiariaResuelta();

  actualizarChipJugador();
}

// ---------------------------------------------------------------
// Pregunta del día
// ---------------------------------------------------------------
function revisarPreguntaDelDia() {
  if (Cursos.obtenerCursosInstalados().length === 0) return;
  let estadoDiario = Storage.obtenerEstadoDiario();
  if (!estadoDiario.preguntaId) {
    const p = Quiz.preguntaDelDia(Estado.jugador.nombre, estadoDiario.fecha);
    if (p) estadoDiario = Storage.asignarPreguntaDiaria(p.id);
  }
  if (estadoDiario.preguntaId && !estadoDiario.resuelta) {
    abrirModalDiario();
  }
}

function abrirModalDiario() {
  const modal = document.getElementById("modal-diario");
  modal.classList.remove("oculto");
  document.getElementById("btn-modal-mas-tarde").onclick = () => modal.classList.add("oculto");
  document.getElementById("btn-modal-resolver").onclick = () => {
    modal.classList.add("oculto");
    cambiarVista("diario");
  };
}

// ---------------------------------------------------------------
// Pantalla de instalación
// ---------------------------------------------------------------
function renderizarPantallaInstalar() {
  const cursos = Cursos.obtenerCursosInstalados();
  const listaCursos = document.getElementById("lista-cursos-instalados");
  const zonaDemo = document.getElementById("zona-demo");

  // Lista de cursos instalados
  if (cursos.length === 0) {
    listaCursos.innerHTML = `<p style="color:var(--texto-tenue);font-size:0.9rem;">Ningún curso instalado todavía.</p>`;
    zonaDemo.classList.remove("oculto");
  } else {
    listaCursos.innerHTML = cursos.map(c => `
      <div class="tarjeta-curso-instalado">
        <div class="curso-info">
          <div class="curso-nombre">📚 ${c.nombre}</div>
          <div class="curso-meta">${c.preguntas.length} preguntas · Autor: ${c.autor} · v${c.version}</div>
        </div>
        <button class="btn-desinstalar" data-id="${c.id}">Desinstalar</button>
      </div>
    `).join("");

    listaCursos.querySelectorAll(".btn-desinstalar").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!confirm("¿Seguro que deseas desinstalar este curso? Se perderá el contenido.")) return;
        Cursos.desinstalarCurso(btn.dataset.id);
        construirDropdownCursos(); // actualizar dropdown
        renderizarPantallaInstalar(); // refrescar lista
        // Si no quedan cursos, mostrar pantalla vacía
        if (Cursos.obtenerCursosInstalados().length === 0) cambiarVista("sin-cursos");
      });
    });
    zonaDemo.classList.add("oculto");
  }

  limpiarEstadoInstalacion();
}

function limpiarEstadoInstalacion() {
  const estado = document.getElementById("estado-instalacion");
  estado.className = "estado-instalacion oculto";
  estado.textContent = "";
}

function mostrarEstadoInstalacion(tipo, mensaje) {
  const estado = document.getElementById("estado-instalacion");
  estado.className = `estado-instalacion ${tipo}`;
  estado.textContent = mensaje;
}

// ---------------------------------------------------------------
// Instalación drag & drop y selector de archivo
// ---------------------------------------------------------------
function enlazarInstalacion() {
  const dropZone = document.getElementById("drop-zone");
  const inputArchivo = document.getElementById("input-archivo-curso");

  // Drag & drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("arrastrando");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("arrastrando"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("arrastrando");
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivoCurso(file);
  });

  // Selector de archivo
  inputArchivo.addEventListener("change", () => {
    const file = inputArchivo.files[0];
    if (file) procesarArchivoCurso(file);
    inputArchivo.value = ""; // resetear para poder volver a subir el mismo archivo
  });

  // Botón de demo
  document.getElementById("btn-generar-demo").addEventListener("click", async () => {
    try {
      mostrarEstadoInstalacion("cargando", "⏳ Generando curso de ejemplo…");
      await Cursos.generarCursoEjemplo();
      mostrarEstadoInstalacion("ok", "✅ Curso de ejemplo instalado y descargado como demo.biogenios");
      construirDropdownCursos();
      renderizarPantallaInstalar();
      revisarPreguntaDelDia();
    } catch (e) {
      mostrarEstadoInstalacion("error", `❌ Error: ${e.message}`);
    }
  });
}

async function procesarArchivoCurso(file) {
  if (!file.name.endsWith(".biogenios")) {
    mostrarEstadoInstalacion("error", "❌ El archivo debe tener extensión .biogenios");
    return;
  }
  try {
    mostrarEstadoInstalacion("cargando", `⏳ Instalando "${file.name}"…`);
    const curso = await Cursos.instalarDesdeArchivo(file);
    mostrarEstadoInstalacion("ok", `✅ "${curso.nombre}" instalado con ${curso.preguntas.length} preguntas.`);
    construirDropdownCursos();
    renderizarPantallaInstalar();
    revisarPreguntaDelDia();
  } catch (e) {
    mostrarEstadoInstalacion("error", `❌ ${e.message}`);
  }
}

// ---------------------------------------------------------------
// Vista de progreso
// ---------------------------------------------------------------
function renderizarProgreso() {
  const progreso = Storage.obtenerProgreso();
  const contenedor = document.getElementById("tarjetas-progreso");
  const cursos = Cursos.obtenerCursosInstalados();

  if (cursos.length === 0) {
    contenedor.innerHTML = `<p style="color:var(--texto-tenue);">Instala un curso para ver tu progreso por módulo.</p>`;
  } else {
    contenedor.innerHTML = cursos.map(c => {
      const datos = progreso[c.modulo] || { aciertos: 0, intentos: 0 };
      const pct = datos.intentos > 0 ? Math.round((datos.aciertos / datos.intentos) * 100) : 0;
      return `
        <div class="tarjeta-stat">
          <div class="valor-stat">${pct}%</div>
          <div class="label-stat">${c.nombre}</div>
          <div class="label-stat">${datos.aciertos}/${datos.intentos} aciertos</div>
        </div>
      `;
    }).join("");
  }

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
    ranking.innerHTML = `<li>Todavía no hay sesiones registradas.</li>`;
    return;
  }
  ranking.innerHTML = sesiones.map((s, i) => `
    <li>
      <span><span class="puesto">#${i + 1}</span>${Estado.jugador.avatar} ${Estado.jugador.nombre} — ${s.fecha}</span>
      <span>${s.aciertos}/${s.total} (${Math.round((s.aciertos / s.total) * 100)}%)</span>
    </li>
  `).join("");
}
