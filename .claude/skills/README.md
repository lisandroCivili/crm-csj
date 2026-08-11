# Skills del proyecto

Cada skill vive en su propia subcarpeta con un `SKILL.md` adentro:

```
.claude/skills/
  nombre-de-la-skill/
    SKILL.md
```

El `SKILL.md` lleva frontmatter con `name` y `description`. La `description` es lo que se usa
para decidir cuándo invocarla, así que conviene que diga explícitamente en qué situaciones
aplica.

```markdown
---
name: nombre-de-la-skill
description: Qué hace y cuándo usarla.
---

Instrucciones que se cargan al invocar la skill.
```

Candidatas para este proyecto (a definir más adelante):

- Importar y validar un padrón nuevo del club.
- Agregar un módulo completo (ruta + acciones + validación) siguiendo el patrón del proyecto.
- Liquidar comisiones de un período.
