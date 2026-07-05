# SportPlan — SPA de Gestión y Planificación de Entrenamientos

## Instalación

```bash
npm install
npm run dev
```

## Estructura del proyecto

```
src/
  types/models.ts              # Modelo de datos completo (jerarquía + RBAC)
  utils/dateUtils.ts           # Cálculo de semanas a partir de fechas del Mesociclo
  hooks/useMesocycleWeeks.ts   # Hook que combina estructura de semanas + bloques persistidos
  components/
    shared/
      WeekAccordion.tsx        # Acordeón semana a semana (reutilizado por Coach y Atleta)
      BlockCard.tsx            # Tarjeta de un bloque de entrenamiento
      RichTextViewer.tsx       # Renderiza el HTML de Quill como HTML estático (solo lectura)
    coach/
      CoachLayout.tsx          # Sidebar fijo con los 2 módulos independientes
      IndividualPlanningView.tsx # Módulo 1: Macro/Meso + drag&drop + editor diario
      MesocycleDragList.tsx    # Ejemplo de drag-and-drop con @dnd-kit
      DayBlockEditor.tsx       # Formulario de bloque diario con React-Quill
    athlete/
      AthleteLayout.tsx        # Topbar limpio, sin sidebar
      AthleteView.tsx          # Vista única de solo lectura
  App.tsx                      # Punto de entrada + lógica de RBAC (coach vs athlete)
tailwind.config.js              # Paleta monocromática de azules
```

## Decisiones clave

### 1. Cálculo de semanas
Las semanas **nunca se persisten** como entidad en base de datos. `getWeeksInRange()`
(en `dateUtils.ts`) genera bloques secuenciales de 7 días a partir de la fecha de
inicio del Mesociclo — no se alinean al calendario (lunes-domingo), sino a la fecha
exacta que el Coach eligió. `hydrateWeeksWithBlocks()` luego inyecta los `DailyBlock`
reales (guardados en un mapa plano `fecha -> bloques[]`) en esa estructura calculada.
Esto evita duplicar datos y permite que cambiar las fechas del mesociclo recalcule
automáticamente el acordeón.

### 2. RBAC
`App.tsx` decide, según `currentUser.role`, qué árbol de componentes montar.
**Esto es solo la capa de presentación**: el filtrado real de seguridad (que un
Atleta no pueda leer datos de otro atleta, que un Coach no pueda editar atletas de
otro Coach) debe reforzarse **siempre en el backend**, validando `coachId`/`athleteId`
contra el usuario autenticado en cada request.

### 3. Reutilización Coach/Atleta
`WeekAccordion` y `BlockCard` son los **mismos componentes** para ambos roles,
controlados por la prop `readOnly`:
- `readOnly=false` (Coach): muestra botón "+" por día, "Editar"/"Eliminar" por bloque.
- `readOnly=true` (Atleta): oculta esos controles y usa `RichTextViewer` para pintar
  el HTML de Quill como texto estático, sin montar el editor ni su toolbar.

Esto evita mantener dos implementaciones del acordeón y garantiza que ambas vistas
se vean consistentes.

### 4. Drag-and-drop de Mesociclos
`MesocycleDragList.tsx` usa `@dnd-kit/core` + `@dnd-kit/sortable`. El handle de
arrastre (ícono `GripVertical`) está separado del click de selección para que
arrastrar no dispare accidentalmente la navegación al mesociclo. Al soltar, se
recalculan los campos `order` y se notifica al padre vía `onReorder`.

### 5. Paleta de color
Configurada exclusivamente en `tailwind.config.js` con los 5 hexes provistos.
`#0960ae` (alias `blue.DEFAULT` / `blue.500`) se usa **estrictamente** para:
CTAs, navegación activa en el Sidebar, foco de inputs, y el resaltado de
"mesociclo/semana/día actual" en la vista del Atleta. Los tonos más claros
(`blue.100`, `blue.200`) se usan solo para fondos sutiles, chips y bordes.

## Pendiente de implementar (fuera del alcance de esta entrega)
- `ClubPlanningView` (Módulo 2 completo): selector de Deporte/Categoría + calendario
  semanal estándar, reutilizando `DayBlockEditor` pero sobre `ClubSession` en vez de
  `DailyBlock`. La estructura de datos (`Team`, `ClubSession`) ya está definida en
  `types/models.ts`.
- Capa de datos real (API/backend) — actualmente `App.tsx` usa mocks en memoria.
