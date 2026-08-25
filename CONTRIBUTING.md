# Contributing to Visual Wiki 🌿

Welcome! We are excited to collaborate with you to build a better, more robust, and highly pluggable knowledge garden.

To maintain clean repository boundaries and ensure maximum code modularity, all development within this repository must strictly adhere to the following guidelines.

For a feature overview and quick start, see [README.md](./README.md).

---

## 📦 Repository overview

**Visual Wiki** is a Next.js knowledge-garden UI: curate resource cards, persist them in the browser, and export JSON for AI agents.

| Area | Technology |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) (`@import "tailwindcss"` in `app/globals.css`, PostCSS via `@tailwindcss/postcss`) |
| Components | Radix Dialog, Framer Motion, Lucide icons, Sonner toasts |
| Types | TypeScript (`lib/types.ts` — `Resource` interface) |
| E2E tests | [Playwright](https://playwright.dev/) (`e2e/smoke.spec.ts`, config in `playwright.config.ts`) |

### Layout

```
app/                 # App Router routes (layout, page, globals.css)
components/          # ResourceCard, AddResourceDialog, etc.
lib/                 # Shared types and helpers
e2e/                 # Playwright specs, screenshots, HTML report output
resources.json       # Optional seed/export payload (not required at runtime)
```

**Local dev:** `npm install` → `npm run dev` → [http://localhost:3000](http://localhost:3000). Default port comes from Next.js; override with `PORT` if needed.

---

## 🌌 1. The Prime Directive: Pure Code in Submodules, Guides in Superproject

This repository (`visual-wiki`) is tracked as a git submodule within parent environments (such as the `dev-master` monorepo). We enforce a strict operational boundary between parent workspaces and this upstream codebase.

### ⚠️ The Boundary Violation Rule

**NEVER commit internal parent-workspace documentation, fork-specific guides, or monorepo-specific configurations into this repository.**

* **Why?** Doing so pollutes the open-source upstream repository, causes Pull Request rejections, and leaks proprietary or local architectural details.
* **The Standard**: This codebase must strictly consist of **pure code changes** that implement functional features, optimizations, or bug fixes.
* All local guides, environment setups, and monorepo-specific documentation must remain within the superproject (e.g., under `dev-master/dex/03-docs/guides/`) and never be committed here.

**Allowed in this repo:** `README.md`, `CONTRIBUTING.md`, and `EXTRACT_TO_STANDALONE.md` — they describe *this* project only, not parent monorepo workflows.

---

## 🏛️ 2. GlitchWorks Agnostic Architecture Protocol

Every feature, integration, or refactoring in `visual-wiki` must be designed as an agnostic data pipeline. The core application logic must never assume a specific deployment context or direct parent coupling.

### 2.1. Zero Hardcoding (Dynamic State Configuration)

* **Rule**: No magic strings, static network ports, or fixed directory paths.
* **Application**: All configuration defaults (such as custom themes, port numbers, metadata title overrides, or local storage prefixes) must be passed dynamically via environment variables (`process.env`), standard configuration parameters, or dependency injection at startup. Playwright uses `PLAYWRIGHT_TEST_BASE_URL` when the app is not on the default origin.

### 2.2. Polymorphism by Default (Interface-Driven Contracts)

* **Rule**: Depend on abstractions, not concretions.
* **Application**: Define strict TypeScript interfaces for all data-fetching services, storage adapters, or helper functions. Always code against the interface so that components or adapters can be mocked or swapped out seamlessly (e.g., swapping a standard `localStorage` adapter for an IndexedDB or server-backed database adapter without modifying the UI components). Extend `Resource` in `lib/types.ts` rather than ad-hoc object shapes in components.

### 2.3. Open Piping (Strict Inter-Process Communication)

* **Rule**: Communicate via strictly typed, isolated message events rather than direct state mutation.
* **Application**: Interaction between visual modules, integrations, or parent window contexts must utilize web-standard communication protocols—such as custom DOM events (e.g., `visual-wiki:resource-added`) or strictly validated REST endpoints—instead of global variable leaking.

### 2.3.1. No Third-Party Frames (Hard Rule)

* **Rule**: This app never embeds a document it does not control. No `<iframe>`, `<frame>`, `<object>`, or `<embed>`, sandboxed or otherwise.
* **Why**: Card `entry` URLs are attacker-controlled — any GitHub user can point a repo `homepage` at any https URL, and `/play?repo=` makes that a shareable link that would run unvetted third-party script in a visitor's browser. `sandbox` narrows the blast radius but does not remove it, and Chromium has shipped iframe-sandbox navigation-restriction bypasses (CVE-2026-8563, CVE-2026-5903).
* **Application**: Direct media URLs render through native `<audio>`/`<video>` with `preload="none"`. Everything else becomes an explicit, user-initiated link-out with `rel="noopener noreferrer nofollow external"` and `referrerpolicy="no-referrer"`. See `lib/run-pane.ts`. The rule is enforced two ways: a source scan in `tests/run-pane.test.ts`, and `frame-src 'none'` in the CSP from `next.config.ts`. If you need embedded execution, it belongs on a separate isolated origin, not here.

### 2.4. Boundary Validation (The "Hostile Edge")

* **Rule**: Never trust incoming payloads. Protect core application state with a rigorous validation layer.
* **Application**: Always parse and validate imported resources, JSON imports (including `resources.json` imports from the UI), or form inputs at the boundary using schema validation, JSON try/catch guards, or custom runtime checks before merging them into active state arrays.

### 2.5. State Hydration & Dehydration

* **Rule**: The application must be capable of pausing, exporting its state, and resuming cleanly from a snapshot.
* **Application**: Ensure state containers support serialize-to-JSON and deserialize-from-JSON operations. This guarantees that user-curated cards, settings, and filter presets can be cleanly exported, transported, and hydrated upon rebuild (see **Export for AI** in the README).

### 2.6. Graceful Degradation (Predictable Failure)

* **Rule**: Fail safely, fail cleanly, and fail transparently.
* **Application**: If an external dependency or standard web API is unavailable (e.g., the browser's Clipboard API, external search APIs, or local storage access in strict private browsing modes), catch the error, log the context, and provide a polite, non-intrusive fallback UI or return a safe fallback state instead of raising unhandled exceptions or freezing the interface.

### 2.7. Agnostic Telemetry & Observability

* **Rule**: Domain and UI logic must emit telemetry without knowing the final ingestion endpoint.
* **Application**: Use an abstract logging layer or standard console interface. In production deployments, logging providers can be injected to send data to custom endpoints (Sentry, Datadog, or terminal-based logging runners) without modifying internal code.

---

## 🔄 3. The Fork-and-PR Submodule Workflow

When contributing back to this repository, follow this clean git workflow to prevent branch pollution:

### Step 1: Configure Your Remotes

Ensure you have configured both your personal fork (`origin`) and the official upstream repository (`upstream`):

```bash
# Verify existing remotes
git remote -v

# If upstream is missing, configure it
git remote add upstream https://github.com/k-dot-greyz/visual-wiki.git
```

### Step 2: Checkout a Fresh Branch

Branch off the latest upstream default branch (`upstream/main`):

```bash
git fetch upstream
git checkout -b feat/your-feature-name upstream/main
```

Use a descriptive prefix: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`.

### Step 3: Implement and Verify

Write standard-compliant TypeScript/React code. Before committing, run the project checks:

```bash
npm install

# Lint (ESLint 9 + eslint-config-next)
npm run lint

# Production build (catches Next.js and type errors)
npm run build

# E2E: app must be reachable (default http://localhost:3000)
# Terminal A:
npm run dev
# Terminal B (first-time only: npx playwright install chromium)
npm run test:e2e
# Or point at another origin:
# PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

Optional: `npm run test:e2e:ui` for interactive debugging. HTML reports land under `e2e/report/` (gitignored).

### Step 4: Run the Pre-Commit Audit Checklist

Before staging or committing, ensure you satisfy this quick compliance checklist:

1. **Check for Misplaced Files**: Run `git status`. Are there any markdown documents describing personal workflows, parent monorepo directories, or local credentials? *If so, move them to the parent repository or delete them before committing.*
2. **Verify Diff Scope**: Run `git diff --name-status upstream/main`. Ensure only relevant source files are modified. Revert unrelated file alterations (e.g., `.next/`, `node_modules/`, `test-results/`, local screenshots unless intentionally updated for a test fix).
3. **Minimize Diff Noise**: Inspect the exact diff. Purge leftover debugging statements, trailing whitespace, or random file formatting shifts.
4. **UI changes**: Prefer Tailwind utility classes in components; reserve `app/globals.css` for global tokens and shared motion/hover rules.

### Step 5: Commit and Push

Commit using a descriptive [conventional commit](https://www.conventionalcommits.org/) message and push to your fork:

```bash
git commit -m "feat(cards): implement schema validation for importing resource lists"
git push -u origin HEAD
```

### Step 6: Create Your Pull Request

Submit your PR to `k-dot-greyz/visual-wiki` `main`:

```bash
gh pr create --repo k-dot-greyz/visual-wiki --base main \
  --title "feat(cards): short summary" \
  --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [ ] \`npm run lint\`
- [ ] \`npm run build\`
- [ ] \`npm run test:e2e\` (with dev server running)
EOF
)"
```

---

🧘 *Happy Gardening! Let's keep the workspace clean, modular, and zen.*
