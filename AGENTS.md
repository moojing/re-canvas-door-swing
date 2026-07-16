# Repository Guidelines

## Project Structure & Module Organization
The Vite + React entry point sits in `src/main.tsx`, bootstrapping routes defined in `src/App.tsx`. Route-level views belong in `src/pages/`, reusable building blocks in `src/components/`, shared stateful logic in `src/hooks/`, and lightweight utilities in `src/lib/`. UI primitives from shadcn live under `src/components/ui/`. Static textures and other assets reside in `public/`, while build and styling configuration is centralized in `vite.config.ts`, `tailwind.config.ts`, and `postcss.config.js`.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Run `npm run dev` for the hot-reloading development server, or `npm run preview` to inspect the production build locally after running `npm run build`. Use `npm run build:dev` when you need a production bundle that still targets development services. Execute `npm run lint` before every push to surface TypeScript and React issues.

## Coding Style & Naming Conventions
TypeScript files use ES modules and two-space indentation. Prefer functional React components and PascalCase filenames for components (`DoorAnimation3D.tsx`) and camelCase for hooks and utilities. Co-locate component styles with Tailwind utility classes; fall back to `App.css` or `index.css` only for global resets. Rely on the existing ESLint configuration and avoid disabling rules unless there is a documented reason in code comments.

## Testing Guidelines
The project currently relies on manual verification. Before opening a pull request, exercise key flows in the local dev server—especially door-swing interactions and texture loading. When introducing regression-prone logic, add focused tests using Vitest + React Testing Library (mirror the directory being tested, e.g., `src/components/__tests__/DoorAnimation3D.test.tsx`) and document any new setup steps in the README.

## Commit & Pull Request Guidelines
Follow conventional commits (`feat:`, `fix:`, `chore:`) as reflected in the git history, keeping scopes short and lowercased. Each commit should address a single concern and leave the build lint-clean. Pull requests must include a summary, screenshots or short clips for UI changes, and references to related issues. Note any configuration updates or required migrations in the PR description so reviewers can verify them promptly.

## Evaluation Gallery
The sibling repository `../re-door-gallery` ([GitHub](https://github.com/moojing/re-door-gallery)) is the single source of truth for door classifications, the evaluation report, and the evaluation CSV. Do not recreate tracked copies of those three files inside this repository. Any evaluation edit must target `../re-door-gallery/docs/` and be followed by `npm run gallery:check`. Gallery source videos and frame extracts are local-only under the sibling repository's ignored `materials/door-transitions/` and `materials/frame-extracts/` directories and must never be committed.
