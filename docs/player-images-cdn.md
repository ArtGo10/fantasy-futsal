# Player Images CDN

Player photos should not be served directly from futsal.com.ua in production. The app stores only URLs in Convex, while image bytes are served from Cloudflare R2 and cached by the mobile client with `expo-image`.

## Flow

1. Fetch or refresh source data from futsal.com.ua:

   ```sh
   npm run data:futsal
   ```

2. Upload player photos from source URLs to Cloudflare R2 and rewrite the local staging JSON:

   ```sh
   npm run data:futsal:images:r2 -- --apply
   ```

3. Import the rewritten JSON into Convex:

   ```sh
   npm run data:futsal:import
   ```

The import writes only image URLs and metadata to Convex. Binary image data stays in R2.

## Required Cloudflare R2 Settings

Create an R2 bucket and make it publicly readable through either an `r2.dev` public development URL or a custom domain. Then set these values in `.env.local`:

```sh
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=fantasy-futsal
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://<public-bucket-url>
CLOUDFLARE_R2_KEY_PREFIX=players
```

The Access Key ID, Secret Access Key, and S3 API endpoint are the R2/S3 credentials from Cloudflare. `CLOUDFLARE_R2_PUBLIC_BASE_URL` is not the S3 endpoint: it must be the browser-accessible public URL for the bucket.

## Safe Tests

Preview candidates without uploading:

```sh
npm run data:futsal:images:r2
```

Upload only a few photos and update JSON:

```sh
npm run data:futsal:images:r2 -- --apply --limit 3
```

Then open one generated `photoUrl` in the browser. If it loads, run the full upload and import.

Force a re-upload if source photos changed:

```sh
npm run data:futsal:images:r2 -- --apply --force
```
