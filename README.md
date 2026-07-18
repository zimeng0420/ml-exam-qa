# ML Exam Q&A

A closed-book revision deck for the **Machine Learning** course (950883155),
built on an Astro + Vue-islands framework. The course tests **concept
understanding** plus hands-on **neural-network model-building code**, so the
deck mixes concept cards with from-scratch / PyTorch code questions.

## Run locally
```
npm install
npm run dev      # http://localhost:4321/ml-exam-qa
npm run build    # static site -> dist/
```

## Where the content lives
All questions are plain JSON in `data/`:
- `data/chapters.json` — course meta + chapter list (set `status: ready|soon`).
- `data/chNN_*.json` — one file per chapter: knowledge points + questions.

Question `type` is `open` | `mc` | `ai`. A calculation question is an `open`
question with a `calc: [{value, tol}]` array (numeric auto-check). Code answers
use fenced ```python blocks. Math uses `$...$` / `$$...$$` (KaTeX at build time).

The Zod schema in `src/content.config.ts` validates every question at build
time — a malformed card fails the build.

## Deploy (GitHub Pages)
1. Set `site` and `base` in `astro.config.mjs` to your GitHub username / repo.
2. Push to `main`; the workflow in `.github/workflows/deploy.yml` builds and
   publishes automatically. In the repo: Settings → Pages → Source = GitHub Actions.

## Notes
- Progress (reviewed / wrong book / notes / spaced repetition) is saved in the
  browser's localStorage. Cloud sync is OFF (empty Firebase config in
  `src/lib/config.ts`) — add your own Firebase project to enable cross-device sync.
- Populated: all 12 chapters (140 questions, 33 knowledge points) generated from
  the course lecture slides and lab solution notebooks. Note the labs are
  Keras/TensorFlow; PyTorch equivalents are given in `extend` notes where relevant.
