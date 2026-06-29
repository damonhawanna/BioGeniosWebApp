/**
 * BIOGENIOS - cursos.js (v0.3)
 * -----------------------------------------------------------
 * Maneja el ciclo de vida de los cursos instalables (.biogenios):
 *  - Generar un curso de ejemplo (zip) para el primer uso, sin Studio.
 *  - Leer un .biogenios subido por el usuario (JSZip) y validarlo.
 *  - Instalar/desinstalar cursos en BIOGENIOS_DATA.
 *
 * Formato interno de un curso instalado (dentro de BIOGENIOS_DATA.cursosInstalados):
 * {
 *   id: "curso_demo",
 *   nombre: "Demo · Biología General",
 *   autor: "BIOGENIOS",
 *   descripcion: "Curso de ejemplo para probar instalación de laboratorios.",
 *   version: "1.0",
 *   modulo: "demo",            // identificador interno usado como "módulo" en el menú
 *   preguntas: [ ...mismo formato que las preguntas del motor... ]
 * }
 * -----------------------------------------------------------
 */

const Cursos = {

  // ---------------------------------------------------------
  // Generar curso de ejemplo (.biogenios) on-the-fly con JSZip
  // ---------------------------------------------------------
  async generarCursoEjemplo() {
    const manifest = {
      id: "curso_demo",
      nombre: "Demo · Biología General",
      autor: "BIOGENIOS",
      descripcion: "Curso de ejemplo para probar la instalación de laboratorios.",
      version: "1.0",
      modulo: "demo"
    };

    const preguntasDemo = PREGUNTAS_EJEMPLO; // definidas en data/preguntas-ejemplo.js

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("preguntas.json", JSON.stringify(preguntasDemo, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });

    // Disparar descarga al usuario
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo.biogenios";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Instalarlo de inmediato también, para que no haya que volver a subirlo
    return this._instalarDesdeDatos(manifest, preguntasDemo);
  },

  // ---------------------------------------------------------
  // Leer e instalar un .biogenios subido por el usuario
  // ---------------------------------------------------------
  async instalarDesdeArchivo(file) {
    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (e) {
      throw new Error("El archivo no es un .biogenios válido (no se pudo leer como zip).");
    }

    const archivoManifest = zip.file("manifest.json");
    const archivoPreguntas = zip.file("preguntas.json");

    if (!archivoManifest || !archivoPreguntas) {
      throw new Error("El archivo .biogenios está incompleto: falta manifest.json o preguntas.json.");
    }

    let manifest, preguntas;
    try {
      manifest = JSON.parse(await archivoManifest.async("string"));
      preguntas = JSON.parse(await archivoPreguntas.async("string"));
    } catch (e) {
      throw new Error("No se pudo interpretar el contenido del curso (JSON inválido).");
    }

    this._validarManifest(manifest);
    this._validarPreguntas(preguntas);

    return this._instalarDesdeDatos(manifest, preguntas);
  },

  _validarManifest(manifest) {
    const camposRequeridos = ["id", "nombre", "modulo"];
    for (const campo of camposRequeridos) {
      if (!manifest || !manifest[campo]) {
        throw new Error(`El curso no tiene un campo obligatorio: "${campo}".`);
      }
    }
  },

  _validarPreguntas(preguntas) {
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      throw new Error("El curso no contiene preguntas.");
    }
    preguntas.forEach((p, i) => {
      if (!p.pregunta || !Array.isArray(p.alternativas) || p.alternativas.length < 4) {
        throw new Error(`La pregunta #${i + 1} del curso está incompleta o mal formada.`);
      }
      if (typeof p.correctaIndex !== "number") {
        throw new Error(`La pregunta #${i + 1} no tiene un índice de respuesta correcta válido.`);
      }
    });
  },

  _instalarDesdeDatos(manifest, preguntas) {
    const curso = {
      id: manifest.id,
      nombre: manifest.nombre,
      autor: manifest.autor || "Desconocido",
      descripcion: manifest.descripcion || "",
      version: manifest.version || "1.0",
      modulo: manifest.modulo,
      preguntas: preguntas.map((p, i) => ({
        id: p.id || `${manifest.id}-${i}`,
        modulo: manifest.modulo,
        tema: p.tema || manifest.nombre,
        pregunta: p.pregunta,
        alternativas: p.alternativas,
        correctaIndex: p.correctaIndex,
        explicacion: p.explicacion || ""
      }))
    };

    Storage.instalarCurso(curso);
    return curso;
  },

  desinstalarCurso(idCurso) {
    Storage.desinstalarCurso(idCurso);
  },

  obtenerCursosInstalados() {
    return Storage.obtenerCursosInstalados();
  },

  /**
   * Devuelve TODAS las preguntas disponibles, juntando las de todos
   * los cursos instalados. El motor ya no tiene preguntas propias.
   */
  todasLasPreguntas() {
    const cursos = this.obtenerCursosInstalados();
    return cursos.flatMap(c => c.preguntas);
  },

  /**
   * Lista de módulos disponibles, generada dinámicamente según
   * los cursos instalados (en vez de la lista fija MODULOS de antes).
   */
  modulosDisponibles() {
    const cursos = this.obtenerCursosInstalados();
    return cursos.map(c => ({ id: c.modulo, nombre: c.nombre, cursoId: c.id }));
  }
};
