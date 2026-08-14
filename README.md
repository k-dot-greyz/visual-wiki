# visual wiki 🌿

A personal knowledge garden for curating links, docs, and resources — built to export cleanly for AI agents.

Curate once. Feed your agents forever.

## Features

- Visual card grid with search and category filters
- Add / delete resources (persisted in `localStorage`)
- **Export for AI** — downloads JSON + copies a prompt-ready summary
- **Copy for AI** per card — structured text block for agents
- Random resource picker
- **Playground** (`/play`) — hydrate a public GitHub repo into a playable card (tree + sandboxed iframe). Node in-tab and hosted venv are stubbed.

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
| `npm test` | Vitest unit tests (schema, GitHub hydrate mocks, flex gate) |
| `npm run test:e2e` | Playwright (starts `npm run dev` when no reusable local server is available; default http://localhost:3000) |

## Project structure

```text
app/
  play/page.tsx   # Public GitHub playground
  api/play/       # Hydrate endpoint (mocked in e2e)
lib/
  types.ts        # Resource + optional playable fields
  playable-card.ts
```

## Customize

- Edit `app/layout.tsx` metadata (`title`, `description`) with your name
- Replace seed data in `app/page.tsx` (`initialResources`)
- Categories: `official`, `example`, `tutorial`, `repo`, `pattern`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for submodule boundaries, architecture guidelines, and the fork-and-PR workflow.

## License

MIT — do whatever you want with it.
