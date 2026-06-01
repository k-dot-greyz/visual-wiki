# Extract to standalone GitHub repo

The Cloud Agent token cannot create org repos. Run these locally (or in a shell with `repo` scope on `k-dot-greyz`):

```bash
cd projects/visual-wiki   # from dev-master root, or clone after PR merges

git init
git branch -M main
git add -A
git commit -m "feat: initial visual wiki — curated knowledge garden for AI agents"

gh repo create k-dot-greyz/visual-wiki \
  --public \
  --source=. \
  --remote=origin \
  --description "Curated visual knowledge garden for AI agents — Next.js + Tailwind" \
  --push
```

Then optionally wire back as a submodule:

```bash
# from dev-master root
git rm -r projects/visual-wiki
git submodule add https://github.com/k-dot-greyz/visual-wiki.git dex/09-repos/visual-wiki
# update dex/09-repos/switchboard_registry.yaml
```

Already verified: `npm install && npm run build` passes on Next.js 16.2.6.
