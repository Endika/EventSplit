# EventSplit

> Split event expenses fairly with friends — no login, real-time, offline-first.

**[Try it now →](https://endika.github.io/EventSplit/)**

[![Latest release](https://img.shields.io/github/v/release/Endika/EventSplit?style=flat-square&color=0066FF&label=release)](https://github.com/Endika/EventSplit/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Endika/EventSplit/ci.yml?style=flat-square&label=ci&branch=main)](https://github.com/Endika/EventSplit/actions/workflows/ci.yml)
[![Last commit](https://img.shields.io/github/last-commit/Endika/EventSplit?style=flat-square)](https://github.com/Endika/EventSplit/commits/main)
[![Conventional Commits](https://img.shields.io/badge/conventional_commits-1.0.0-FE5196?style=flat-square)](https://www.conventionalcommits.org)
[![License: MIT](https://img.shields.io/github/license/Endika/EventSplit?style=flat-square&color=10B981)](./LICENSE)

## What you can do

- Create an event in seconds — no signup, no email.
- Share the URL with friends. They identify themselves on first visit; one click to "I'm new" or pick from the list.
- Add purchases with per-person consumption multipliers. The app calculates the total to buy.
- Add expenses. The app computes who owes whom and shows the shortest settlement plan.
- Works **offline** for reading. Syncs live across devices when online.
- Install it as a PWA on your phone or laptop.
- Three languages: English, Spanish, Basque.

## How to start

1. Open [EventSplit](https://endika.github.io/EventSplit/) on any device.
2. Tap **Create event**, name it, and add your name.
3. Share the URL.

## Install on your device

Open the URL in Chrome, Edge or Safari and use **"Add to Home Screen"** (mobile) or **"Install"** (desktop). Behaves like a native app and works offline by design.

## Privacy

No login. Your name (and optional nickname) live in your browser's localStorage. Event data syncs through Supabase (Europe-hosted, encrypted in transit). Anyone with the event URL can read and edit it — keep the link private to your group. No analytics, no tracking, no cookies (except your language preference).

---

## For developers

Open-source, MIT licensed. PRs welcome.

**Stack** — TypeScript (strict), React 18, Vite, Tailwind CSS, Supabase (Postgres + Realtime), vite-plugin-pwa, i18next, Vitest.

**Architecture** — Hexagonal (domain → application → infrastructure → presentation). DI via a small hand-rolled container. Tests use in-memory fakes — no DB mocks.

**Local dev**

```sh
git clone git@github.com:Endika/EventSplit.git
cd EventSplit
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

CI runs lint, typecheck, tests and the production build on every PR.
