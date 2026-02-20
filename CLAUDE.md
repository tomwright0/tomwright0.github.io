# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start development server
bun run build        # Build static site to dist/
bun run preview      # Preview production build locally
bun run sync         # Sync Astro content collections
bun run lint         # Lint with ESLint
bun run format       # Format with Prettier
bun run format:check # Check formatting without writing
```

Requirements: Bun >= 1.0.0

## Architecture

**Stack:** Astro 5 static site generator, Tailwind CSS, TypeScript, deployed to GitHub Pages.

**Routing:** File-based via `src/pages/`. Key routes:
- `/` — homepage
- `/posts/[slug]/` — individual blog posts (generated from content collections)
- `/tags/[tag]/` — tag-filtered post listing
- `/contact/` — contact form backed by a Cloudflare Worker

**Content:** Blog posts live in `src/content/blog/` as Markdown files. The schema is defined in `src/content/config.ts` — required frontmatter fields are `title`, `pubDatetime`, and `description`. Posts with `draft: true` are excluded from listings.

**Serverless:** `functions/api/contact.ts` is a Cloudflare Workers function that validates the contact form (honeypot spam check, 260 char limit) and forwards submissions to a Discord webhook via `DISCORD_WEBHOOK_URL` environment variable.

**Theming:** Uses CSS custom properties for a "skin" color system. Dark mode is toggled via `[data-theme='dark']` selector on the `<html>` element (see `src/utils/toggle-theme.js`). Theme colors are defined in `src/styles/base.css`.

**Path aliases** (configured in `tsconfig.json`):
`@assets/*`, `@components/*`, `@config`, `@content/*`, `@layouts/*`, `@pages/*`, `@styles/*`, `@utils/*`

**Site config** (title, author, socials, pagination, etc.) lives in `src/config.ts`.

## CI/CD

- PRs trigger lint, format check, and build (`.github/workflows/ci.yml`, Bun)
- Pushes to `main` deploy to GitHub Pages (`.github/workflows/deploy.yml`)
