# visual wiki 🌿

A personal knowledge garden for curating links, docs, and resources — built to export cleanly for AI agents.

Curate once. Feed your agents forever.

## Features

- Visual card grid with search, category filters, inspect, and edit
- Add / update / delete resources (persisted in `resources.json` on the server; override path with `RESOURCES_PATH`)
- **Export / Import for AI** — JSON download includes `id`; import is idempotent by normalized link
- **Copy for AI** per card — structured text block, with a clipboard-denied fallback
- Random resource picker opens the inspect sheet (live region announcement)
- **Playground** (`/play`) — hydrate a public GitHub repo into a playable card; **Plant in garden** writes it to the store
- **UX Journey Deck** (`decks/ux-journey.json`) — 22 Aether-compatible cards that drive Playwright and can play in glitchworks-tarot
- Accessibility floor: WCAG 2.2 AA (skip link, search landmark, reduced motion, 3-state extra-motion `aria-valuetext`)

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide](https://lucide.dev/) icons
- [Sonner](https://sonner.emilkowal.ski/) toasts

## Quick start

```bash
git clone https://github.com/k-dot-greyz/visual-wiki.git
cd visual-wiki
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Vitest unit tests (Aether deck, resource store, GitHub hydrate, flex gate, SSRF) |
| `npm run test:e2e` | Playwright FIFO UX deck + playground + smoke (starts `npm run dev` with `RESOURCES_PATH=/tmp/vw-e2e-resources.json` and `E2E_GARDEN_RESET=1`) |

## Project structure

```text
app/
  play/page.tsx        # Public GitHub playground
  api/play/            # Hydrate endpoint (mocked in e2e)
  api/pipe/            # Handshake + ingest
  api/deck/ux-journey  # Serves the Aether UX deck JSON
lib/
  types.ts             # Resource + optional playable fields
  playable-card.ts
  resource-store.ts    # Garden persistence controller
  aether-card.ts       # Tarot-compatible card schema
decks/
  ux-journey.json      # 22-card FIFO UX / Playwright / tarot deck
```

## Customize

- Edit `app/layout.tsx` metadata (`title`, `description`) with your name
- Replace seed data in `lib/resource-store.ts` (`initialResources`)
- Categories: `official`, `example`, `tutorial`, `repo`, `pattern`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for submodule boundaries, architecture guidelines, and the fork-and-PR workflow.

## License

MIT — do whatever you want with it.
