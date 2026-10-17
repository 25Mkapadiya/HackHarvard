# Decisions

Choices made where `docs/BUILD_PLAN.md` was silent or reality differed from it.

1. **App name: "Market Day Boston".** Short, describes the use (going to market), and fits the stall-sign design.
2. **Vite base defaults to `/HackHarvard/`** (repo `25Mkapadiya/HackHarvard`); CI sets `VITE_BASE` from the repo name.
3. **Tailwind v4** via `@tailwindcss/vite` — no `tailwind.config.js`; theme tokens live in `src/index.css`.
