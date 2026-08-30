/**
 * BIOGENIOS - admin.js
 * -----------------------------------------------------------
 * Panel del Profe: editor de cursos y preguntas para BIOGENIOS.
 *
 *  - Login con contraseña local (hardcodeada, ver ADMIN_PASSWORD).
 *  - Crea/edita cursos y preguntas de forma visual.
 *  - Carga masiva de preguntas desde un archivo .json.
 *  - Exporta el curso como paquete .biogenios (zip compatible
 *    con el motor, ver js/cursos.js).
 *
 * Formato de pregunta esperado por el motor:
 *   { pregunta, alternativas[], correctaIndex, explicacion, tema }
 * -----------------------------------------------------------
 */

// Cambiá esta contraseña según quieras.
const ADMIN_PASSWORD = "biogenios2026";

// Clave local del borrador (independiente de la app de estudiantes).
const BORRADOR_KEY = "BIOGENIOS_ADMIN_BORRADOR";

/* =========================================================
   Estado de la sesión de edición
   ========================================================= */
const Estado = {
  curso: null,          // { id, nombre, autor, descripcion, version, modulo }
  preguntas: [],        // array de preguntas en edición
  editandoId: null,     // id de la pregunta que se está editando, o null = nueva
  contadorId: 0         // contador para ids locales de preguntas
};

const UI = {};

/* =========================================================
   Helpers
   ========================================================= */
function $id(id) { return document.getElementById(id); }

function textoResumido(texto, max) {
  if (!texto) return "(sin texto)";
  return texto.length > max ? texto.slice(0, max) + "…" : texto;
}

function mensajeElemento(el, texto, tipo) {
  el.textContent = texto;
  el.classList.remove("exito", "error");
  if (tipo) el.classList.add(tipo);
  el.classList.remove("oculto");
  clearTimeout(el._temporizador);
  el._temporizador = setTimeout(() => el.classList.add("oculto"), 6000);
}

function generarIdCurso(nombre) {
  const base = (nombre || "curso")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "curso";
  return base + "_" + Date.now().toString().slice(-6);
}

/* =========================================================
   Modal de confirmación
   ========================================================= */
let confirmarCallback = null;

function confirmar(titulo, texto, cb) {
  $id("modal-confirmar-titulo").textContent = titulo;
  $id("modal-confirmar-texto").textContent = texto;
  confirmarCallback = cb;
  $id("modal-confirmar").classList.remove("oculto");
}

function cerrarConfirmar() {
  $id("modal-confirmar").classList.add("oculto");
  confirmarCallback = null;
}

/* =========================================================
   Vistas
   ========================================================= */
function mostrarEditor() {
  $id("pantalla-login").classList.add("oculto");
  $id("editor").classList.remove("oculto");
}

function mostrarFormPregunta(visto) {
  $id("form-pregunta").classList.toggle("oculto", !visto);
  $id("estado-vacio-editor").classList.toggle("oculto", visto);
}

/* =========================================================
   Curso
   ========================================================= */
function getDatosCursoForm() {
  return {
    id: Estado.curso ? Estado.curso.generarId : null,
    nombre: $id("campo-nombre").value.trim(),
    autor: $id("campo-autor").value.trim() || "Desconocido",
    descripcion: $id("campo-descripcion").value.trim(),
    version: $id("campo-version").value.trim() || "1.0",
    modulo: $id("campo-modulo").value.trim()
  };
}

function nuevoCurso() {
  $id("form-curso").reset();
  $id("campo-autor").value = "Prof. Lex";
  Estado.curso = null;
  Estado.preguntas = [];
  Estado.editandoId = null;
  Estado.contadorId = 0;
  renderListaPreguntas();
  mostrarFormPregunta(false);
}

/* =========================================================
   Lista de preguntas
   ========================================================= */
function renderListaPreguntas() {
  const lista = $id("lista-preguntas");
  lista.innerHTML = "";

  Estado.preguntas.forEach((p, i) => {
    const li = document.createElement("li");
    li.dataset.id = p._id;
    if (p._id === Estado.editandoId) li.classList.add("activo");

    const indice = document.createElement("span");
    indice.className = "pregunta-indice";
    indice.textContent = String(i + 1).padStart(2, "0");

    const preview = document.createElement("span");
    preview.className = "pregunta-preview";
    preview.textContent = textoResumido(p.pregunta, 42);

    const eliminar = document.createElement("button");
    eliminar.className = "pregunta-eliminar";
    eliminar.textContent = "×";
    eliminar.title = "Eliminar pregunta";
    eliminar.addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarPregunta(p._id);
    });

    li.appendChild(indice);
    li.appendChild(preview);
    li.appendChild(eliminar);
    li.addEventListener("click", () => {
      if (p._id === Estado.editandoId) { cancelarEdicion(); return; }
      editarPregunta(p._id);
    });

    lista.appendChild(li);
  });

  $id("contador-preguntas").textContent = Estado.preguntas.length;
}

function eliminarPregunta(id) {
  confirmar("Eliminar pregunta", "¿Seguro que querés eliminar esta pregunta?", () => {
    Estado.preguntas = Estado.preguntas.filter(p => p._id !== id);
    if (Estado.editandoId === id) cancelarEdicion();
    renderListaPreguntas();
  });
}

/* =========================================================
   Formulario de pregunta
   ========================================================= */
function nuevaPregunta() {
  resetearFormPregunta();
  Estado.editandoId = null;
  $id("pregunta-titulo-eyebrow").textContent = "PREGUNTA NUEVA";
  mostrarFormPregunta(true);
  $id("campo-texto-pregunta").focus();
}

function editarPregunta(id) {
  const p = Estado.preguntas.find(q => q._id === id);
  if (!p) return;

  resetearFormPregunta();
  Estado.editandoId = id;
  $id("pregunta-titulo-eyebrow").textContent = "EDITAR PREGUNTA";
  $id("campo-texto-pregunta").value = p.pregunta;
  $id("campo-tema").value = p.tema || "";

  // Cargar alternativas
  const cont = $id("alternativas-editor");
  cont.innerHTML = "";
  p.alternativas.forEach((alt, i) => cont.appendChild(crearFilaAlternativa(i, alt)));
  cont.querySelector(`input[name="correcta"][value="${p.correctaIndex}"]`).checked = true;

  $id("campo-explicacion").value = p.explicacion || "";

  mostrarFormPregunta(true);
  renderListaPreguntas();
  $id("campo-texto-pregunta").focus();
}

function cancelarEdicion() {
  Estado.editandoId = null;
  mostrarFormPregunta(false);
  renderListaPreguntas();
}

function resetearFormPregunta() {
  $id("campo-texto-pregunta").value = "";
  $id("campo-tema").value = "";
  $id("campo-explicacion").value = "";
  const cont = $id("alternativas-editor");
  const n = cont.querySelectorAll(".alternativa-fila").length;
  // Resetear radios e inputs dejando la estructura mínima (4)
  cont.innerHTML = "";
  for (let i = 0; i < Math.max(n, 4); i++) cont.appendChild(crearFilaAlternativa(i, ""));
  cont.querySelector('input[name="correcta"]').checked = true;
}

function crearFilaAlternativa(indice, valor) {
  const fila = document.createElement("div");
  fila.className = "alternativa-fila";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "correcta";
  radio.value = String(indice);
  radio.checked = indice === 0;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "input-alternativa";
  input.placeholder = `Alternativa ${String.fromCharCode(65 + indice)}`;
  input.value = valor;
  input.required = true;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-eliminar-alt";
  btn.textContent = "×";
  btn.title = "Eliminar alternativa";
  btn.addEventListener("click", () => {
    const filas = $id("alternativas-editor").querySelectorAll(".alternativa-fila");
    if (filas.length <= 2) return;
    fila.remove();
    renumerarRadios();
  });

  fila.appendChild(radio);
  fila.appendChild(input);
  fila.appendChild(btn);
  return fila;
}

function renumerarRadios() {
  const cont = $id("alternativas-editor");
  const filas = cont.querySelectorAll(".alternativa-fila");
  const correctaFila = cont.querySelector('input[name="correcta"]:checked');
  filas.forEach((f, i) => {
    f.querySelector('input[name="correcta"]').value = String(i);
  });
  if (correctaFila) {
    const indice = Array.prototype.indexOf.call(filas, correctaFila.closest(".alternativa-fila"));
    if (indice >= 0) filas[indice].querySelector('input[name="correcta"]').checked = true;
  }
  const chequeado = cont.querySelector('input[name="correcta"]:checked');
  if (!chequeado && filas.length) filas[0].querySelector('input[name="correcta"]').checked = true;
}

function actualizarRadiosSiempre() {
  const filas = $id("alternativas-editor").querySelectorAll(".alternativa-fila");
  filas.forEach((f, i) => {
    f.querySelector('input[name="correcta"]').value = String(i);
  });
  if (!filas.length) return;
  const chequeado = $id("alternativas-editor").querySelector('input[name="correcta"]:checked');
  if (!chequeado) filas[0].querySelector('input[name="correcta"]').checked = true;
}

function guardarPregunta(e) {
  e.preventDefault();

  const texto = $id("campo-texto-pregunta").value.trim();
  if (!texto) { alert("Escribí el texto de la pregunta."); return; }

  const filas = $id("alternativas-editor").querySelectorAll(".alternativa-fila");
  const alternativas = [];
  filas.forEach(f => {
    const v = f.querySelector(".input-alternativa").value.trim();
    if (v) alternativas.push(v);
  });

  if (alternativas.length < 2) {
    alert("Necesitas al menos 2 alternativas."); return;
  }

  const radioCorrecta = $id("alternativas-editor").querySelector('input[name="correcta"]:checked');
  const correctaIndex = radioCorrecta ? parseInt(radioCorrecta.value, 10) : 0;
  if (correctaIndex >= alternativas.length) {
    alert("La alternativa correcta no coincide con una alternativa llenada."); return;
  }

  const pregunta = {
    pregunta: texto,
    alternativas,
    correctaIndex,
    tema: $id("campo-tema").value.trim() || "",
    explicacion: $id("campo-explicacion").value.trim() || ""
  };

  if (Estado.editandoId) {
    const idx = Estado.preguntas.findIndex(q => q._id === Estado.editandoId);
    Estado.preguntas[idx] = { ...pregunta, _id: Estado.editandoId };
  } else {
    Estado.contadorId += 1;
    Estado.preguntas.push({ ...pregunta, _id: "padre_" + Estado.contadorId });
  }

  cancelarEdicion();
}

/* =========================================================
   Carga masiva (JSON)
   ========================================================= */
function cargarJson(file) {
  $id("estado-json").classList.add("oculto");
  const estado = $id("estado-json");

  const lector = new FileReader();
  lector.onerror = () => mensajeElemento(estado, "No se pudo leer el archivo.", "error");
  lector.onload = () => {
    let datos;
    try {
      datos = JSON.parse(lector.result);
    } catch {
      mensajeElemento(estado, "JSON inválido: no se pudo interpretar el archivo.", "error");
      return;
    }

    const arr = Array.isArray(datos) ? datos
      : Array.isArray(datos.preguntas) ? datos.preguntas
      : null;

    if (!arr || arr.length === 0) {
      mensajeElemento(estado, "El JSON no contiene un array de preguntas.", "error");
      return;
    }

    let agregadas = 0;
    const errores = [];

    arr.forEach((p, i) => {
      const pregunta = validarPreguntaJSON(p);
      if (typeof pregunta === "string") {
        errores.push(`#${i + 1}: ${pregunta}`);
        return;
      }
      Estado.contadorId += 1;
      Estado.preguntas.push({ ...pregunta, _id: "json_" + Estado.contadorId });
      agregadas += 1;
    });

    renderListaPreguntas();

    if (errores.length) {
      mensajeElemento(estado,
        `${agregadas} agregada(s), ${errores.length} con error. Primer error: ${errores[0]}`,
        agregadas > 0 ? "exito" : "error");
    } else {
      mensajeElemento(estado, `¡${agregadas} preguntas agregadas correctamente!`, "exito");
    }
  };
  lector.readAsText(file);
}

function validarPreguntaJSON(p) {
  if (!p || typeof p !== "object") return "no es un objeto válido";
  if (!p.pregunta || typeof p.pregunta !== "string") return "falta el campo 'pregunta'";
  if (!Array.isArray(p.alternativas) || p.alternativas.length < 2) return "falta 'alternativas' (array de 2+ elementos)";
  if (typeof p.correctaIndex !== "number" || p.correctaIndex < 0 || p.correctaIndex >= p.alternativas.length) {
    return "falta 'correctaIndex' válido";
  }
  return {
    pregunta: p.pregunta,
    alternativas: p.alternativas,
    correctaIndex: p.correctaIndex,
    tema: typeof p.tema === "string" ? p.tema : "",
    explicacion: typeof p.explicacion === "string" ? p.explicacion : ""
  };
}

/* =========================================================
   Carga masiva desde Excel
   ---------------------------------------------------------
   La plantilla descargada tiene estas columnas (en orden):
   0 pregunta · 1 tema · 2 A · 3 B · 4 C · 5 D · 6 E (opcional)
   7 correcta (letra A-E o índice) · 8 explicacion
   ========================================================= */
const PLANTILLA_EXCEL_HEADERS = ["pregunta", "tema", "alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d", "alternativa_e", "correcta", "explicacion"];

function descargarPlantillaExcel() {
  if (typeof XLSX === "undefined") {
    confirmar("Librería no disponible", "Excel no está disponible en esta máquina (¿sin conexión?). Probá con la carga JSON.", () => {});
    return;
  }
  const ejemplo = [
    "¿Qué organelo es el 'centro de control' de la célula?",
    "Citología",
    "Aparato de Golgi", "Núcleo", "Lisosoma", "Vacuola",
    "",
    "B",
    "Porque contiene el material genético (ADN) y controla la actividad celular."
  ];

  const hoja = XLSX.utils.aoa_to_sheet([PLANTILLA_EXCEL_HEADERS, ejemplo]);
  hoja["!cols"] = [
    { wch: 48 }, { wch: 16 },
    { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 18 },
    { wch: 10 }, { wch: 48 }
  ];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Preguntas");
  XLSX.writeFile(libro, "plantilla_preguntas.xlsx");
}

function cargarExcel(file) {
  const estado = $id("estado-excel");
  estado.classList.add("oculto");

  if (typeof XLSX === "undefined") {
    mensajeElemento(estado, "Excel no está disponible en esta máquina (¿sin conexión?). Probá con la carga JSON.", "error");
    return;
  }

  const lector = new FileReader();
  lector.onerror = () => mensajeElemento(estado, "No se pudo leer el archivo.", "error");
  lector.onload = () => {
    let libro;
    try {
      libro = XLSX.read(lector.result, { type: "array" });
    } catch {
      mensajeElemento(estado, "No se pudo interpretar el archivo como Excel.", "error");
      return;
    }

    if (!libro.SheetNames.length) {
      mensajeElemento(estado, "El archivo no tiene hojas.", "error");
      return;
    }
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });

    if (filas.length < 2) {
      mensajeElemento(estado, "El archivo no tiene filas de datos (falta la fila de encabezados).", "error");
      return;
    }

    let agregadas = 0;
    const errores = [];

    filas.slice(1).forEach((fila, i) => {
      // Si la fila está completamente vacía, ignorarla.
      const estaVacia = (fila || []).every(celda => (celda == null || String(celda).trim()) === "");
      if (estaVacia) return;

      const resultado = filaExcelAPregunta(fila, i + 2); // +2: encabezado + base 1
      if (typeof resultado === "string") {
        errores.push(`Fila ${i + 2}: ${resultado}`);
        return;
      }
      Estado.contadorId += 1;
      Estado.preguntas.push({ ...resultado, _id: "xls_" + Estado.contadorId });
      agregadas += 1;
    });

    renderListaPreguntas();

    if (errores.length) {
      mensajeElemento(estado,
        `${agregadas} agregada(s), ${errores.length} con error. Primer error: ${errores[0]}`,
        agregadas > 0 ? "exito" : "error");
    } else {
      mensajeElemento(estado, `¡${agregadas} preguntas agregadas correctamente!`, "exito");
    }
  };
  lector.readAsArrayBuffer(file);
}

function filaExcelAPregunta(fila, numFila) {
  const celda = (i) => String(fila[i] || "").trim();

  const pregunta = celda(0);
  if (!pregunta) return "falta el texto de la pregunta (columna A)";

  const tema = celda(1);

  const alternativas = [];
  for (let c = 2; c <= 6; c++) {
    const texto = celda(c);
    if (texto) alternativas.push(texto);
  }
  if (alternativas.length < 4) {
    return "se necesitan al menos 4 alternativas (columnas C a F)";
  }

  const correctaIndex = letraOIndiceAIndex(celda(7), alternativas.length);
  if (correctaIndex === null) {
    return "la columna 'correcta' no apunta a una alternativa válida (letra A-F o índice)";
  }

  return {
    pregunta,
    alternativas,
    correctaIndex,
    tema,
    explicacion: celda(8)
  };
}

function letraOIndiceAIndex(valor, longitud) {
  const v = String(valor || "").trim().toUpperCase();
  if (!v) return null;
  if (/^[A-F]$/.test(v)) {
    const idx = v.charCodeAt(0) - 65;
    if (idx < longitud) return idx;
    return null;
  }
  const n = parseInt(v, 10);
  if (!isNaN(n) && n >= 0 && n < longitud) return n;
  return null;
}

/* =========================================================
   Borrador (localStorage)
   ========================================================= */
function asegurarIdCurso() {
  if (!Estado.curso) Estado.curso = {};
  if (!Estado.curso.generarId) {
    const nombre = $id("campo-nombre").value.trim();
    Estado.curso.generarId = nombre ? generarIdCurso(nombre) : null;
  }
  return Estado.curso.generarId;
}

function guardarBorrador() {
  asegurarIdCurso();
  const curso = getDatosCursoForm();
  const datos = {
    guardadoEn: new Date().toISOString(),
    curso: {
      generarId: curso.id || null,
      nombre: curso.nombre,
      autor: curso.autor,
      descripcion: curso.descripcion,
      version: curso.version,
      modulo: curso.modulo
    },
    preguntas: Estado.preguntas,
    contadorId: Estado.contadorId
  };
  try {
    localStorage.setItem(BORRADOR_KEY, JSON.stringify(datos));
    confirmar("Borrador guardado", "Tu curso quedó guardado en este dispositivo.", () => {});
  } catch {
    confirmar("Error", "No se pudo guardar el borrador.", () => {});
  }
}

function cargarBorrador() {
  const raw = localStorage.getItem(BORRADOR_KEY);
  if (!raw) {
    confirmar("Sin borrador", "No hay ningún borrador guardado en este dispositivo.", () => {});
    return;
  }
  confirmar("Cargar borrador", "¿Querés reemplazar el curso actual por el borrador guardado?", () => {
    try {
      const datos = JSON.parse(raw);
      const c = datos.curso || {};
      $id("campo-nombre").value = c.nombre || "";
      $id("campo-autor").value = c.autor || "Prof. Lex";
      $id("campo-descripcion").value = c.descripcion || "";
      $id("campo-version").value = c.version || "1.0";
      $id("campo-modulo").value = c.modulo || "";

      Estado.curso = c.generarId ? { generarId: c.generarId } : null;
      Estado.preguntas = Array.isArray(datos.preguntas) ? datos.preguntas : [];
      Estado.contadorId = datos.contadorId || 0;
      Estado.editandoId = null;

      cancelarEdicion();
    } catch {
      confirmar("Error", "El borrador está corrupto y no se pudo cargar.", () => {});
    }
  });
}

function limpiarBorrador() {
  confirmar("Limpiar borrador", "¿Borrar el borrador guardado en este dispositivo?", () => {
    localStorage.removeItem(BORRADOR_KEY);
    confirmar("Borrador limpiado", "El borrador fue eliminado.", () => {});
  });
}

/* =========================================================
   Exportar .biogenios
   ========================================================= */
function exportarCurso() {
  const curso = getDatosCursoForm();
  if (!curso.nombre) {
    confirmar("Nombre requerido", "Poné un nombre antes de exportar el curso.", () => {});
    return;
  }
  if (!curso.modulo) {
    confirmar("Módulo requerido", "Poné un módulo (id interno) antes de exportar el curso.", () => {});
    return;
  }
  if (Estado.preguntas.length === 0) {
    confirmar("Sin preguntas", "Agregá al menos una pregunta antes de exportar.", () => {});
    return;
  }

  const manifest = {
    id: asegurarIdCurso() || generarIdCurso(curso.nombre),
    nombre: curso.nombre,
    autor: curso.autor,
    descripcion: curso.descripcion,
    version: curso.version,
    modulo: curso.modulo
  };

  const preguntas = Estado.preguntas.map((p, i) => ({
    id: `q_${i + 1}`,
    tema: p.tema || curso.nombre,
    pregunta: p.pregunta,
    alternativas: p.alternativas,
    correctaIndex: p.correctaIndex,
    explicacion: p.explicacion || ""
  }));

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("preguntas.json", JSON.stringify(preguntas, null, 2));

  zip.generateAsync({ type: "blob" }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = manifest.modulo + ".biogenios";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    confirmar("¡Exportado!", `${manifest.nombre} · ${preguntas.length} preguntas. Instalalo desde la app de estudiantes (🔬 Instalar).`, () => {});
  });
}

/* =========================================================
   Eventos
   ========================================================= */
function initLogin() {
  $id("form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const valor = $id("input-password").value;
    if (valor === ADMIN_PASSWORD) {
      mostrarEditor();
    } else {
      $id("login-error").classList.remove("oculto");
      $id("input-password").value = "";
      $id("input-password").focus();
    }
  });

  $id("input-password").addEventListener("input", () => {
    $id("login-error").classList.add("oculto");
  });
}

function init() {
  UI.lista = $id("lista-preguntas");
  UI.alternativas = $id("alternativas-editor");

  initLogin();

  // Curso
  $id("btn-nuevo-curso").addEventListener("click", () =>
    confirmar("Nuevo curso", "¿Empezar un curso nuevo? Se perderá lo no exportado.", nuevoCurso));

  // Preguntas
  $id("btn-agregar-pregunta").addEventListener("click", nuevaPregunta);
  $id("form-pregunta").addEventListener("submit", guardarPregunta);
  $id("btn-cancelar-pregunta").addEventListener("click", cancelarEdicion);
  $id("btn-agregar-alternativa").addEventListener("click", () => {
    const cont = UI.alternativas;
    const filas = cont.querySelectorAll(".alternativa-fila");
    const sinTexto = Array.from(filas).filter(f => !f.querySelector(".input-alternativa").value.trim());
    if (sinTexto.length > 0) {
      confirmar("Alternativa vacía", "Completá o eliminá las alternativas vacías antes de agregar otra.", () => {});
      return;
    }
    if (filas.length >= 8) {
      confirmar("Límite", "Máximo 8 alternativas por pregunta.", () => {});
      return;
    }
    cont.appendChild(crearFilaAlternativa(filas.length, ""));
    actualizarRadiosSiempre();
  });

  // JSON
  $id("input-json").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) cargarJson(file);
    e.target.value = "";
  });

  // Excel
  $id("btn-descargar-plantilla").addEventListener("click", descargarPlantillaExcel);
  $id("input-excel").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) cargarExcel(file);
    e.target.value = "";
  });

  // Borrador
  $id("btn-guardar-borrador").addEventListener("click", guardarBorrador);
  $id("btn-cargar-borrador").addEventListener("click", cargarBorrador);
  $id("btn-limpiar-borrador").addEventListener("click", limpiarBorrador);

  // Exportar
  $id("btn-exportar").addEventListener("click", exportarCurso);

  // Modal
  $id("btn-modal-cancelar").addEventListener("click", cerrarConfirmar);
  $id("btn-modal-confirmar").addEventListener("click", () => {
    const cb = confirmarCallback;
    cerrarConfirmar();
    if (cb) cb();
  });
  $id("modal-confirmar").addEventListener("click", (e) => {
    if (e.target === $id("modal-confirmar")) cerrarConfirmar();
  });

  // Estado inicial
  nuevoCurso();
  mostrarFormPregunta(false);
}

document.addEventListener("DOMContentLoaded", init);