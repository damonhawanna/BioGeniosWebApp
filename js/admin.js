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
   Carga masiva desde PDF (digital, con PDF.js)
   ---------------------------------------------------------
   Flujo:
   1) Se extrae el texto de todas las páginas con PDF.js.
   2) Se intenta detectar la clave de respuestas (p.ej. "1-B 2-C").
   3) Se segmentan preguntas por patrones (números y alternativas A-E).
   4) Se abre una pantalla de revisión obligatoria antes de agregar.
   ========================================================= */
const RevisionPdf = { candidatas: [] };

function escHTML(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cargarPdf(file) {
  const estado = $id("estado-pdf");
  estado.classList.add("oculto");

  if (typeof pdfjsLib === "undefined") {
    mensajeElemento(estado, "PDF.js no está disponible (¿sin conexión?). Probá con Excel o JSON.", "error");
    return;
  }

  mensajeElemento(estado, "⏳ Extrayendo texto del PDF…", "exito");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const lector = new FileReader();
  lector.onerror = () => mensajeElemento(estado, "No se pudo leer el archivo.", "error");
  lector.onload = async () => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: lector.result }).promise;
      const texto = await pdfATexto(pdf);
      if (!texto.trim()) {
        mensajeElemento(estado, "No se extrajo texto. Es probable que el PDF esté escaneado (imágenes) — eso todavía no está soportado.", "error");
        return;
      }

      const clave = detectarClave(texto);
      const candidatas = segmentarPreguntas(texto, clave);

      if (candidatas.length === 0) {
        mensajeElemento(estado, "No se detectaron preguntas con el patrón esperado (numeradas con alternativas A-D). Revisá el PDF y probá de nuevo.", "error");
        return;
      }

      abrirRevisionPdf(candidatas, clave);
      mensajeElemento(estado, "PDF procesado. Revisá las preguntas detectadas.", "exito");
    } catch (e) {
      mensajeElemento(estado, `Error procesando el PDF: ${e.message}`, "error");
    }
  };
  lector.readAsArrayBuffer(file);
}

async function pdfATexto(pdf) {
  let texto = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const contenido = await pagina.getTextContent();
    let trozo = "";
    let ultimaY = null;
    contenido.items.forEach(item => {
      const y = item.transform[5];
      if (ultimaY !== null && Math.abs(y - ultimaY) > 2) trozo += "\n";
      trozo += " " + item.str;
      ultimaY = y;
    });
    texto += trozo.replace(/ +/g, " ").trim() + "\n\n";
  }
  return texto;
}

function detectarClave(texto) {
  const re = /(?:^|[\s,;])(\d{1,3})\s*[.)\-–—:]\s*([A-Ea-e])(?=[\s,;]|$)/gm;
  const mapa = {};
  let m, coincidencias = 0;
  while ((m = re.exec(texto)) !== null) {
    const num = parseInt(m[1], 10);
    const letra = m[2].toUpperCase();
    if (num >= 1 && num <= 300) {
      mapa[num] = letra;
      coincidencias++;
    }
  }
  return coincidencias >= 5 ? mapa : null;
}

function segmentarPreguntas(texto, clave) {
  const RE_INICIO = /^(\d{1,3})\s*[.)\-–—]\s+(.+)$/;
  const RE_ALTERNATIVA = /^([A-Ea-e])\s*[.)\]:\-–—]\s*(.*)$/;

  const lineas = texto
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.replace(/\u00A0/g, " ").trim())
    .filter(l => l.length > 0);

  const preguntas = [];
  let actual = null;

  const finalizar = () => {
    if (actual && actual.pregunta.trim() && actual.alternativas.length >= 4) {
      preguntas.push(actual);
    }
    actual = null;
  };

  for (const linea of lineas) {
    const mInicio = linea.match(RE_INICIO);
    const mAlt = linea.match(RE_ALTERNATIVA);

    if (mInicio) {
      finalizar();
      actual = {
        num: parseInt(mInicio[1], 10),
        pregunta: mInicio[2],
        alternativas: [],
        correctaIndex: null
      };
    } else if (mAlt && actual) {
      actual.alternativas.push(mAlt[2].trim());
    } else if (actual) {
      if (actual.alternativas.length === 0) {
        actual.pregunta += " " + linea;   // continuación del enunciado
      } else {
        actual.alternativas[actual.alternativas.length - 1] += " " + linea; // continuación de la última alternativa
      }
    }
  }
  finalizar();

  // Aplicar la clave de respuestas cuando existe
  if (clave) {
    preguntas.forEach(p => {
      const letra = clave[p.num];
      if (letra) {
        const idx = letra.charCodeAt(0) - 65;
        if (idx >= 0 && idx < p.alternativas.length) p.correctaIndex = idx;
      }
    });
  }

  return preguntas;
}

/* =========================================================
   Pantalla de revisión del PDF
   ========================================================= */
function abrirRevisionPdf(candidatas, clave) {
  RevisionPdf.candidatas = candidatas.map(c => ({
    num: c.num,
    pregunta: c.pregunta,
    alternativas: [...c.alternativas],
    correctaIndex: c.correctaIndex,
    descartada: false
  }));
  $id("estado-revision-pdf").classList.add("oculto");
  renderRevisionPdf();
  $id("visor-revision-pdf").classList.remove("oculto");
}

function renderRevisionPdf() {
  const lista = $id("revision-lista");
  const titulo = $id("revision-titulo");
  const activas = RevisionPdf.candidatas.filter(c => !c.descartada).length;
  titulo.textContent = `${activas} de ${RevisionPdf.candidatas.length} pregunta(s) pendientes de revisión`;
  lista.innerHTML = "";

  RevisionPdf.candidatas.forEach((c, i) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "revision-tarjeta" + (c.descartada ? " descartada" : "");

    tarjeta.innerHTML = `
      <div class="revision-cab">
        <span class="revision-num">Q${c.num || i + 1}</span>
        <label class="revision-descartar">
          <input type="checkbox" data-rol="descartar" data-i="${i}" ${c.descartada ? "checked" : ""}> Descartar
        </label>
      </div>
      <label class="campo">
        <span class="campo-label">Enunciado</span>
        <textarea data-rol="pregunta" data-i="${i}" rows="2">${escHTML(c.pregunta)}</textarea>
      </label>
      <div class="revision-alt-titulo">Alternativas</div>
      <div class="alternativas-editor">
        ${c.alternativas.map((alt, j) => `
          <div class="alternativa-fila">
            <input type="radio" name="rev-correcta-${i}" data-rol="correcta" data-i="${i}" value="${j}"
              ${c.correctaIndex === j ? "checked" : ""}>
            <input type="text" class="input-alternativa" data-rol="alt" data-i="${i}" data-j="${j}" value="${escHTML(alt)}">
          </div>
        `).join("")}
      </div>
    `;

    lista.appendChild(tarjeta);
  });
}

function agregarRevisionAlCurso() {
  const estado = $id("estado-revision-pdf");
  let agregadas = 0;
  const errores = [];

  RevisionPdf.candidatas.forEach((c, i) => {
    if (c.descartada) return;
    const pregunta = (c.pregunta || "").trim();
    const alts = (c.alternativas || []).map(a => (a || "").trim()).filter(Boolean);

    if (!pregunta) { errores.push(`Q${c.num || i + 1}: sin enunciado`); return; }
    if (alts.length < 4) { errores.push(`Q${c.num || i + 1}: menos de 4 alternativas`); return; }
    if (c.correctaIndex === null || c.correctaIndex < 0 || c.correctaIndex >= alts.length) {
      errores.push(`Q${c.num || i + 1}: sin respuesta correcta marcada`);
      return;
    }

    Estado.contadorId += 1;
    Estado.preguntas.push({
      pregunta,
      alternativas: alts,
      correctaIndex: c.correctaIndex,
      tema: "",
      explicacion: "",
      _id: "pdf_" + Estado.contadorId
    });
    agregadas += 1;
  });

  renderListaPreguntas();

  if (errores.length) {
    mensajeElemento(estado, `${agregadas} agregada(s), ${errores.length} sin agregar. Primer aviso: ${errores[0]}.`, agregadas > 0 ? "exito" : "error");
  } else {
    cerrarRevisionPdf();
    confirmar("¡Listo!", `${agregadas} preguntas agregadas al curso.`, () => {});
  }
}

function quitarDescartadas() {
  RevisionPdf.candidatas = RevisionPdf.candidatas.filter(c => !c.descartada);
  renderRevisionPdf();
}

function cerrarRevisionPdf() {
  $id("visor-revision-pdf").classList.add("oculto");
  RevisionPdf.candidatas = [];
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

  // PDF
  $id("input-pdf").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) cargarPdf(file);
    e.target.value = "";
  });

  // Visor de revisión PDF
  const revisionLista = $id("revision-lista");
  revisionLista.addEventListener("input", (e) => {
    const el = e.target;
    const rol = el.dataset.rol;
    const c = RevisionPdf.candidatas[parseInt(el.dataset.i, 10)];
    if (!c) return;
    if (rol === "pregunta") c.pregunta = el.value;
    if (rol === "alt") c.alternativas[parseInt(el.dataset.j, 10)] = el.value;
  });
  revisionLista.addEventListener("change", (e) => {
    const el = e.target;
    const rol = el.dataset.rol;
    const c = RevisionPdf.candidatas[parseInt(el.dataset.i, 10)];
    if (!c) return;
    if (rol === "correcta") c.correctaIndex = parseInt(el.value, 10);
    if (rol === "descartar") {
      c.descartada = el.checked;
      renderRevisionPdf();
    }
  });
  $id("btn-revision-agregar").addEventListener("click", agregarRevisionAlCurso);
  $id("btn-revision-limpiar").addEventListener("click", quitarDescartadas);
  $id("btn-revision-cancelar").addEventListener("click", cerrarRevisionPdf);
  $id("visor-revision-pdf").addEventListener("click", (e) => {
    if (e.target === $id("visor-revision-pdf")) cerrarRevisionPdf();
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