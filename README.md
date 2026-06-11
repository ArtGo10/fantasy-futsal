# World Cup Draw

Expo + React Native Web app for a small authenticated World Cup 2026 team draw.

## Stack

- Expo / React Native Web
- Clerk authentication
- Convex realtime database and functions
- Static web export for Vercel

## Local Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
```

Fill:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
```

Convex also needs the Clerk issuer domain as a server env variable:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>.clerk.accounts.dev
```

In Clerk, configure the Convex JWT integration/template with application ID `convex`.

## Development

Terminal 1:

```bash
npm run convex:dev
```

Terminal 2:

```bash
npm run web
```

## Web Build

```bash
npm run build:web
```

The static site is exported to `dist`.

For Vercel:

- Build command: `npm run build:web`
- Output directory: `dist`
- Environment variables: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`

## Current Product Scope

- Only signed-in users can access the app.
- First 12 registered users become participants.
- Participants can draw one team from each of four pots.
- A drawn team is locked and cannot be drawn by anyone else.
- The player table and team availability are realtime through Convex.

Team seed data is intentionally left empty until the final 48 teams and pots are provided.
