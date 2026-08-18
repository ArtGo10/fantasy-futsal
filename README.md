# Fantasy Futsal

Expo + React Native Web app for a private futsal fantasy league.

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

For mobile emulator testing:

```bash
npm run ios
npm run android
```

Before native builds, run:

```bash
npm run doctor
npx tsc --noEmit
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

## Mobile Builds

The app has Expo native identifiers and EAS build profiles:

- iOS bundle identifier: `com.artemholoven.fantasy-futsal`
- Android package: `com.artemholoven.fantasy_futsal`
- URL scheme: `fantasy-futsal`

Internal preview builds:

```bash
npm run eas:build:android -- --profile preview
npm run eas:build:ios -- --profile preview
```

Production builds:

```bash
npm run eas:build:all -- --profile production
```

For Google OAuth in native builds, add this redirect URL in Clerk Dashboard:

```text
fantasy-futsal://oauth-native-callback
```

## Current Product Scope

- Public league data is visible without signing in.
- Signed-in users can create and manage their fantasy team.
- The league table, squads, fixtures, and profile data are realtime through Convex.
