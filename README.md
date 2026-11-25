# Vida Saludable — Samsara PWA

**Samsara** es una Progressive Web App (PWA) mobile-first, 100 % offline, diseñada para el control preciso de calorías, proteína, macros, hidratación, pasos y tendencia de peso corporal.

## Características principales

- **Motor nutricional Mifflin-St Jeor:** Calcula TMB, TDEE, piso seguro calórico y distribución de macros en tiempo real.
- **Registro ultrarrápido:** Combos de 1 toque, alimentos recientes con última porción, `Quick Add`, conversión Crudo ↔ Cocido, escáner de código de barras (catálogo local + Open Food Facts) y copia del día anterior.
- **Analítica de peso y adherencia:** Promedio móvil real de 7 días, evaluación semanal automática con sugerencias de ajuste de déficit, adherencia semanal de proteína y comparativa Peso vs. Calorías.
- **100 % Offline-First:** Persistencia local en IndexedDB (`Dexie.js`), fuentes locales empaquetadas (`.woff2`), Service Worker con actualización automática y respaldo/restauración JSON.

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilación PWA

```bash
npm run build
npm run preview
```
