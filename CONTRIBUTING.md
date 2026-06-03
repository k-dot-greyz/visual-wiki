# Contributing to Visual Wiki 🌿

Welcome! We are excited to collaborate with you to build a better, more robust, and highly pluggable knowledge garden. 

To maintain clean repository boundaries and ensure maximum code modularity, all development within this repository must strictly adhere to the following guidelines.

---

## 🌌 1. The Prime Directive: Pure Code in Submodules, Guides in Superproject

This repository (`visual-wiki`) is tracked as a git submodule within parent environments (such as the `dev-master` monorepo). We enforce a strict operational boundary between parent workspaces and this upstream codebase.

### ⚠️ The Boundary Violation Rule
**NEVER commit internal parent-workspace documentation, fork-specific guides, or monorepo-specific configurations into this repository.**

* **Why?** Doing so pollutes the open-source upstream repository, causes Pull Request rejections, and leaks proprietary or local architectural details.
* **The Standard**: This codebase must strictly consist of **pure code changes** that implement functional features, optimizations, or bug fixes. 
* All local guides, environment setups, and monorepo-specific documentation must remain within the superproject (e.g., under `dev-master/dex/03-docs/guides/`) and never be committed here.

---

## 🏛️ 2. GlitchWorks Agnostic Architecture Protocol

Every feature, integration, or refactoring in `visual-wiki` must be designed as an agnostic data pipeline. The core application logic must never assume a specific deployment context or direct parent coupling.

### 2.1. Zero Hardcoding (Dynamic State Configuration)
* **Rule**: No magic strings, static network ports, or fixed directory paths.
* **Application**: All configuration defaults (such as custom themes, port numbers, metadata title overrides, or local storage prefixes) must be passed dynamically via environment variables (`process.env`), standard configuration parameters, or dependency injection at startup.

### 2.2. Polymorphism by Default (Interface-Driven Contracts)
* **Rule**: Depend on abstractions, not concretions.
* **Application**: Define strict Typescript Interfaces for all data-fetching services, storage adapters, or helper functions. Always code against the interface so that components or adapters can be mocked or swapped out seamlessly (e.g., swapping a standard `localStorage` adapter for an indexedDB or server-backed database adapter without modifying the UI components).

### 2.3. Open Piping (Strict Inter-Process Communication)
* **Rule**: Communicate via strictly typed, isolated message events rather than direct state mutation.
* **Application**: Interaction between visual modules, integrations, or parent window contexts must utilize web-standard communication protocols—such as custom DOM events (e.g., `visual-wiki:resource-added`), standard JSON-RPC over `postMessage` (for iframe environments), or strictly validated REST endpoints—instead of global variable leaking.

### 2.4. Boundary Validation (The "Hostile Edge")
* **Rule**: Never trust incoming payloads. Protect core application state with a rigorous validation layer.
* **Application**: Always parse and validate imported resources, JSON imports, or form inputs at the boundary using schema validation (e.g., validation schemas, JSON try-catch checks, or custom runtime guards) before merging them into active state arrays.

### 2.5. State Hydration & Dehydration
* **Rule**: The application must be capable of pausing, exporting its state, and resuming cleanly from a snapshot.
* **Application**: Ensure state containers support serialize-to-JSON and deserialize-from-JSON operations. This guarantees that user-curated cards, settings, and filter presets can be cleanly exported, transported, and hydrated upon rebuild.

### 2.6. Graceful Degradation (Predictable Failure)
* **Rule**: Fail safely, fail cleanly, and fail transparently.
* **Application**: If an external dependency or standard web API is unavailable (e.g., the browser's Clipboard API, external search APIs, or local storage access in strict private browsing modes), catch the error, log the context, and provide a polite, non-intrusive fallback fallback UI or return a safe fallback state instead of raising unhandled exceptions or freezing the interface.

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
Branch off the latest upstream branch (`upstream/main`):
```bash
git fetch upstream
git checkout -b feat/your-feature-name upstream/main
```

### Step 3: Implement and Audit Your Changes
Write elegant, standard-compliant code. Before committing, run standard linters and tests to verify build integrity:
```bash
npm run lint
# Verify build succeeds
npm run build
```

### Step 4: Run the Pre-Commit Audit Checklist
Before staging or committing, ensure you satisfy this quick compliance checklist:
1. **Check for Misplaced Files**: Run `git status`. Are there any markdown documents describing personal workflows, parent monorepo directories, or local credentials? *If so, move them to the parent repository or delete them before committing.*
2. **Verify Diff Scope**: Run `git diff --name-status upstream/main`. Ensure only relevant source files are modified. Revert unrelated file alterations.
3. **Minimize Diff Noise**: Inspect the exact diff. Purge leftover debugging statements, trailing whitespace, or random file formatting shifts.

### Step 5: Commit and Push
Commit using a descriptive [conventional commit](https://www.conventionalcommits.org/) message and push to your fork:
```bash
git commit -m "feat(cards): implement schema validation for importing resource lists"
git push -u origin HEAD
```

### Step 6: Create Your Pull Request
Submit your PR to `visual-wiki/main` via GitHub or the `gh` command-line utility.

---

🧘 *Happy Gardening! Let's keep the workspace clean, modular, and zen.*
