import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const CLERK_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

type ClerkWebhookEvent = {
  data?: {
    id?: string;
  };
  type?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getHeader(request: Request, name: string) {
  return request.headers.get(name) ?? request.headers.get(name.toLowerCase());
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

async function createSvixSignature(secret: string, signedContent: string) {
  const secretValue = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secretValue),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );

  return new Uint8Array(signature);
}

async function verifyClerkWebhook(request: Request, payload: string) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return { ok: false, status: 500, reason: "Missing webhook secret." };
  }

  const svixId = getHeader(request, "svix-id");
  const svixTimestamp = getHeader(request, "svix-timestamp");
  const svixSignature = getHeader(request, "svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, status: 400, reason: "Missing Svix headers." };
  }

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, status: 400, reason: "Invalid Svix timestamp." };
  }
  if (Math.abs(Date.now() - timestamp * 1000) > CLERK_WEBHOOK_MAX_AGE_MS) {
    return { ok: false, status: 400, reason: "Stale Svix timestamp." };
  }

  const expected = await createSvixSignature(
    webhookSecret,
    `${svixId}.${svixTimestamp}.${payload}`,
  );
  const signatures = svixSignature
    .split(" ")
    .map((signature) => signature.trim())
    .filter(Boolean);

  for (const signature of signatures) {
    const [, value] = signature.split(",");
    if (!value) continue;

    try {
      if (timingSafeEqual(expected, base64ToBytes(value))) {
        return { ok: true, status: 200, reason: "Verified." };
      }
    } catch {
      // Keep checking other signatures if Clerk sent more than one.
    }
  }

  return { ok: false, status: 400, reason: "Invalid webhook signature." };
}

const http = httpRouter();

http.route({
  path: "/clerk/webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const signature = await verifyClerkWebhook(request, payload);
    if (!signature.ok) {
      return jsonResponse({ error: signature.reason }, signature.status);
    }

    let event: ClerkWebhookEvent;
    try {
      event = JSON.parse(payload) as ClerkWebhookEvent;
    } catch {
      return jsonResponse({ error: "Invalid JSON payload." }, 400);
    }

    if (event.type !== "user.deleted") {
      return jsonResponse({ ignored: true });
    }

    const clerkId = event.data?.id;
    if (!clerkId) {
      return jsonResponse({ error: "Missing Clerk user id." }, 400);
    }

    const cleanupJob = await ctx.runMutation(
      internal.users.upsertAccountDeletionCleanupJobInternal,
      { clerkId, status: "pending" },
    );

    try {
      await ctx.runMutation(internal.users.deleteCurrentUserDataByClerkIdInternal, {
        clerkId,
      });
      await ctx.runMutation(
        internal.users.markAccountDeletionCleanupJobCompleteInternal,
        { clerkId, jobId: cleanupJob.jobId },
      );

      return jsonResponse({ cleaned: true, queued: false });
    } catch (error) {
      await ctx.runMutation(internal.users.upsertAccountDeletionCleanupJobInternal, {
        clerkId,
        lastError: error instanceof Error ? error.message : "Unknown cleanup error.",
        nextAttemptAt: Date.now() + 60 * 1000,
        status: "pending",
      });

      return jsonResponse({ cleaned: false, queued: true });
    }
  }),
});

export default http;
