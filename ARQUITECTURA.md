# 🧬 ARQUITECTURA.md
# BIOGENIOS · Arquitectura del Proyecto

> "No estamos construyendo un banco de preguntas.
> Estamos construyendo un ecosistema donde cualquier persona pueda crear,
> compartir y aprender mediante experiencias interactivas."

---

# Visión

BIOGENIOS es una plataforma gamificada de aprendizaje donde estudiantes,
docentes y academias interactúan mediante contenidos educativos instalables.

La aplicación debe sentirse más cercana a una consola de videojuegos que a
un sistema LMS tradicional.

El objetivo NO es competir con Moodle.

El objetivo es convertirse en el "Steam de la educación".

---

# Filosofía

BIOGENIOS separa completamente dos elementos:

## El motor

Es el software.

Controla:

- navegación
- progreso
- logros
- ranking
- estadísticas
- almacenamiento
- interfaz
- marketplace

El motor nunca contiene contenido educativo.

---

## El contenido

Todo el conocimiento vive fuera del motor.

Los contenidos son creados por:

- profesores
- academias
- instituciones
- comunidad

El motor únicamente los interpreta.

---

# Principios

## 1. El contenido nunca modifica el motor.

Un curso jamás debe requerir cambiar JavaScript.

Debe instalarse y funcionar automáticamente.

---

## 2. El motor nunca depende de un curso.

Eliminar un curso nunca rompe la aplicación.

---

## 3. Todo debe ser modular.

Cada componente debe poder evolucionar independientemente.

---

## 4. Toda la información del jugador pertenece al jugador.

Nunca existen variables globales de progreso.

Todo vive dentro del perfil del jugador.

---

# Arquitectura General

```
Motor BIOGENIOS

│

├── UI

├── Storage

├── Quiz Engine

├── Marketplace

├── Descargas

└── Cursos Instalados
```

---

# Estructura del proyecto

```
css/

assets/

data/

js/

index.html
```

Cuando el proyecto crezca:

```
css/

assets/

data/

js/

    app.js

    storage.js

    quiz.js

    usuarios.js

    marketplace.js

    descargas.js

    logros.js

cursos/

manifest/

index.html
```

---

# El archivo de guardado

Toda la aplicación utiliza una única clave de almacenamiento.

```
BIOGENIOS_DATA
```

Nunca deben existir múltiples claves independientes.

---

## Modelo

```
BIOGENIOS_DATA

↓

version

↓

usuarioActivo

↓

usuarios

↓

configuracionGeneral
```

---

# Jugador

Cada jugador representa una experiencia independiente.

Un jugador posee:

- nombre
- progreso
- sesiones
- estadísticas
- rachas
- logros
- cursos instalados
- configuración
- monedas
- experiencia
- nivel

---

# Curso

Un curso representa una unidad instalable.

No es únicamente un banco de preguntas.

Puede contener:

- portada
- autor
- descripción
- categorías
- módulos
- temas
- preguntas
- imágenes
- audio
- logros
- licencia
- precio
- versión

Los cursos son independientes del motor.

---

# Marketplace

El Marketplace es una evolución futura.

Permitirá:

- publicar cursos
- vender cursos
- descargar cursos
- actualizar cursos

BIOGENIOS obtiene ingresos mediante comisión por venta.

---

# Editor

Todo curso debe poder construirse sin escribir código.

El editor permitirá crear:

- cursos
- módulos
- temas
- preguntas
- imágenes
- recursos

El editor exportará un paquete compatible con BIOGENIOS.

---

# Experiencia de Usuario

BIOGENIOS no busca parecer un aula virtual.

Busca sentirse como una consola.

El usuario no "inicia sesión".

El usuario "elige un jugador".

No existen "cuentas".

Existen "jugadores".

No existen "descargas".

Existen "instalaciones".

No existen "cursos".

Existe una colección.

---

# Roadmap

## v0.1

✔ MVP

- HTML
- CSS
- JS
- preguntas locales

---

## v0.2

Jugadores Locales

- múltiples perfiles
- progreso independiente
- selector estilo Nintendo

---

## v0.3

Cursos Instalables

- importar paquetes
- instalar
- desinstalar
- actualizar

---

## v0.4

Editor Visual

- crear cursos
- exportar paquetes

---

## v0.5

Marketplace

- publicar
- comprar
- vender

---

## v1.0

Plataforma BIOGENIOS

---

# Convenciones

## JavaScript

- Un archivo = una responsabilidad.

- Ningún archivo puede acceder directamente a localStorage excepto storage.js.

- Todo acceso al contenido pasa por el motor.

---

## Storage

Una única fuente de verdad.

```
BIOGENIOS_DATA
```

---

## Versionado

Las migraciones deben respetar las versiones anteriores.

Nunca romper partidas guardadas.

---

# Regla más importante

Antes de agregar una nueva funcionalidad, responder:

> ¿Pertenece al motor o pertenece al contenido?

Si pertenece al contenido,
nunca debe implementarse dentro del motor.

---

# Nuestra misión

Construir la plataforma donde cualquier persona pueda transformar su conocimiento
en una experiencia interactiva de aprendizaje.

BIOGENIOS no vende preguntas.

BIOGENIOS construye el laboratorio donde el conocimiento cobra vida.
