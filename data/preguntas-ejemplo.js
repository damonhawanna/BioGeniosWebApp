/**
 * BIOGENIOS - preguntas-ejemplo.js
 * -----------------------------------------------------------
 * Estas preguntas YA NO son el banco fijo del motor.
 * Se usan únicamente para generar el "curso de ejemplo" (demo.biogenios)
 * cuando el usuario no tiene ningún curso instalado todavía.
 *
 * El motor de BIOGENIOS ya no carga preguntas propias: todo el
 * contenido viene de cursos instalados (ver js/cursos.js).
 * -----------------------------------------------------------
 */

const PREGUNTAS_EJEMPLO = [
  {
    id: "cel-001",
    tema: "Citología",
    pregunta: "¿Cuál de las siguientes estructuras está presente en una célula vegetal pero NO en una célula animal?",
    alternativas: ["Mitocondria", "Cloroplasto", "Núcleo", "Ribosoma"],
    correctaIndex: 1,
    explicacion: "Correcto: las células vegetales tienen cloroplastos, organelos donde ocurre la fotosíntesis. Las células animales no los poseen."
  },
  {
    id: "cel-002",
    tema: "Citología",
    pregunta: "¿Qué organelo es conocido como el 'centro de control' de la célula por contener el material genético?",
    alternativas: ["Aparato de Golgi", "Retículo endoplasmático", "Núcleo", "Lisosoma", "Vacuola"],
    correctaIndex: 2,
    explicacion: "El núcleo contiene el ADN y controla la mayoría de las actividades celulares, incluida la síntesis de proteínas."
  },
  {
    id: "gen-001",
    tema: "Genética",
    pregunta: "Si Aa x Aa, ¿qué proporción fenotípica se espera en la descendencia (A dominante)?",
    alternativas: ["100% dominante", "75% dominante, 25% recesivo", "50% y 50%", "25% dominante, 75% recesivo"],
    correctaIndex: 1,
    explicacion: "El cruce Aa x Aa da la proporción clásica 3:1, es decir 75% con fenotipo dominante y 25% con fenotipo recesivo."
  },
  {
    id: "gen-002",
    tema: "Genética",
    pregunta: "¿Cómo se llama el proceso de división celular que produce gametos con la mitad de cromosomas?",
    alternativas: ["Mitosis", "Meiosis", "Citocinesis", "Fecundación"],
    correctaIndex: 1,
    explicacion: "La meiosis reduce el número de cromosomas a la mitad, generando células haploides (gametos)."
  },
  {
    id: "eco-001",
    tema: "Ecología",
    pregunta: "En una cadena alimenticia, ¿qué nombre recibe un organismo que se alimenta directamente de productores?",
    alternativas: ["Productor", "Consumidor primario", "Consumidor secundario", "Descomponedor", "Depredador ápice"],
    correctaIndex: 1,
    explicacion: "Los consumidores primarios (herbívoros) se alimentan directamente de los productores, como las plantas."
  },
  {
    id: "eco-002",
    tema: "Ecología",
    pregunta: "¿Qué término describe el conjunto de todos los organismos de una misma especie que viven en un área determinada?",
    alternativas: ["Comunidad", "Ecosistema", "Población", "Bioma"],
    correctaIndex: 2,
    explicacion: "Una población es el conjunto de individuos de la misma especie que habitan en un área y tiempo determinados."
  },
  {
    id: "fis-001",
    tema: "Fisiología",
    pregunta: "¿Cuál es la principal función de los glóbulos rojos (eritrocitos)?",
    alternativas: ["Defender al organismo de infecciones", "Transportar oxígeno y dióxido de carbono", "Coagular la sangre", "Producir anticuerpos"],
    correctaIndex: 1,
    explicacion: "Los eritrocitos contienen hemoglobina, proteína encargada de transportar oxígeno hacia los tejidos y CO2 de vuelta a los pulmones."
  },
  {
    id: "bot-001",
    tema: "Botánica",
    pregunta: "¿Qué tejido vegetal es responsable del transporte de agua y minerales desde la raíz hacia las hojas?",
    alternativas: ["Floema", "Xilema", "Epidermis", "Meristemo", "Parénquima"],
    correctaIndex: 1,
    explicacion: "El xilema transporta agua y minerales (savia bruta) desde la raíz hasta las hojas."
  },
  {
    id: "evo-001",
    tema: "Evolución",
    pregunta: "¿Quién propuso la teoría de la selección natural como mecanismo de evolución?",
    alternativas: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Robert Hooke"],
    correctaIndex: 1,
    explicacion: "Charles Darwin propuso la selección natural en 'El origen de las especies' (1859) como motor de la evolución."
  },
  {
    id: "bio-001",
    tema: "Bioquímica",
    pregunta: "¿Cuál es la unidad básica estructural de las proteínas?",
    alternativas: ["Ácidos grasos", "Nucleótidos", "Monosacáridos", "Aminoácidos"],
    correctaIndex: 3,
    explicacion: "Las proteínas están formadas por cadenas de aminoácidos unidos mediante enlaces peptídicos."
  }
];
