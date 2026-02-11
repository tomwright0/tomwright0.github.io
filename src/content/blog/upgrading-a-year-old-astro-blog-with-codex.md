---
author: Tom
pubDatetime: 2026-02-11T08:45:00Z
title: Upgrading a Year-Old Astro Blog in Under an Hour with Codex
slug: upgrading-a-year-old-astro-blog-with-codex
featured: false
draft: false
tags:
  - astro
  - react
  - security
  - devops
  - ai
description:
  How I used Codex to upgrade my older Astro blog to Astro 5, move to React 19, fix vulnerabilities, and resolve Cloudflare build issues quickly.
---

Today I used Codex to upgrade this blog from a setup that was more than a year behind to a current, secure stack, and it took far less time than I expected.

I gave it a simple brief:

- upgrade Astro sanely
- fix vulnerable dependencies
- keep the site working

From there, it handled the upgrade in stages instead of brute-forcing everything at once.

## What got upgraded

- Astro 4 -> Astro 5
- `@astrojs/react`, `@astrojs/tailwind`, `@astrojs/sitemap`, `@astrojs/rss`
- React 18 -> React 19
- React type packages to match
- Lockfile refreshed cleanly

## What broke (and got fixed)

As expected with a major version jump, a couple of things needed migration fixes:

- outdated Astro experimental config flags
- content collection behavior differences affecting slug generation
- Cloudflare Pages build failing because its Node runtime was too old

Each one was fixed directly in the repo, then validated with build/lint/audit runs.

## Security result

Before: multiple vulnerabilities across direct and transitive dependencies.  
After: `npm audit` returned **0 vulnerabilities**.

## Small UX polish while we were there

I also asked for quick UI tweaks:

- dark theme blue tones shifted to a cleaner dark gray palette
- footer/social row clipping fixed
- footer nudged slightly for better visual balance

## Why this felt fast

The biggest win was not typing speed, it was workflow:

- inspect
- change
- verify
- repeat

No guessing, no giant risky upgrades, and no long debugging rabbit holes.

The end result: a modernized Astro site, a clean dependency tree, passing builds, and a better-looking theme, all in one focused session.
