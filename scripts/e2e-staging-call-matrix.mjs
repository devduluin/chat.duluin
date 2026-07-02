#!/usr/bin/env node
/**
 * E2E staging preflight + optional WS call_initiate smoke test.
 *
 * Usage:
 *   node scripts/e2e-staging-call-matrix.mjs
 *
 * With WS smoke test (app_token from browser cookie after login):
 *   E2E_CALLER_TOKEN=... E2E_CALLER_ID=... E2E_CALLEE_ID=... E2E_CONVERSATION_ID=... \
 *     node scripts/e2e-staging-call-matrix.mjs --ws-smoke
 */

const STAGING_API =
  process.env.E2E_API_BASE ||
  "https://apidev-hrms.duluin.com/api/proxy/v1/chat";
const STAGING_WS_BASE =
  process.env.E2E_WS_BASE ||
  "https://apidev-hrms.duluin.com/api/ws/v1/chat";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function info(msg) {
  console.log(`INFO  ${msg}`);
}

async function checkLiveKitToken(path, callType) {
  const res = await fetch(`${STAGING_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: "e2e-preflight-conversation",
      user_id: "e2e-preflight-user",
      user_name: "E2E Preflight",
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    fail(`${callType} token endpoint`, `HTTP ${res.status}`);
    return;
  }
  const data = body?.data;
  if (!data?.livekit_url?.startsWith("wss://")) {
    fail(`${callType} token response`, "missing livekit_url");
    return;
  }
  if (!data?.token || !data?.room?.startsWith("call-")) {
    fail(`${callType} token response`, `invalid token/room: ${data?.room}`);
    return;
  }
  pass(`${callType} token endpoint`, `room=${data.room}, lk=${data.livekit_url}`);
}

function buildWsUrl(userId, token) {
  const url = new URL(STAGING_WS_BASE);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const basePath = url.pathname.endsWith("/")
    ? url.pathname.slice(0, -1)
    : url.pathname;
  return `${protocol}//${url.host}${basePath}/${userId}?token=${encodeURIComponent(token)}`;
}

async function wsSmokeTest() {
  const token = process.env.E2E_CALLER_TOKEN;
  const callerId = process.env.E2E_CALLER_ID;
  const calleeId = process.env.E2E_CALLEE_ID;
  const conversationId = process.env.E2E_CONVERSATION_ID;

  if (!token || !callerId || !calleeId || !conversationId) {
    info(
      "Skip WS smoke: set E2E_CALLER_TOKEN, E2E_CALLER_ID, E2E_CALLEE_ID, E2E_CONVERSATION_ID",
    );
    return;
  }

  const wsUrl = buildWsUrl(callerId, token);
  info(`WS smoke connect as caller ${callerId}`);

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WS smoke timeout 10s"));
    }, 10000);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "call_initiate",
          receiver_id: calleeId,
          call_type: "voice",
          conversation_id: conversationId,
        }),
      );
      info("Sent call_initiate — check mobile CallKit + chat-be VoIP push log");
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            type: "call_end",
            receiver_id: calleeId,
            call_id: "",
          }),
        );
        info("Sent call_end (cancel ring)");
        clearTimeout(timeout);
        ws.close();
        resolve();
      }, 2000);
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onmessage = (event) => {
      info(`WS recv: ${String(event.data).slice(0, 200)}`);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      resolve();
    };
  });

  pass(
    "WS call_initiate smoke",
    "sent initiate + end (verify callee side manually)",
  );
}

function printManualMatrix() {
  console.log("\n=== Manual E2E matrix (staging) ===\n");
  const rows = [
    [
      "1",
      "Web → Mobile (background) VOICE",
      "Web call, mobile app background/killed",
      "CallKit ring → accept → audio",
    ],
    [
      "2",
      "Web → Mobile (background) VIDEO",
      "Web video call",
      "CallKit → accept → video",
    ],
    [
      "3",
      "Mobile → Web (tab aktif) VOICE",
      "Mobile call, web chat open",
      "IncomingCallOverlay → accept → audio",
    ],
    [
      "4",
      "Mobile → Web VIDEO",
      "Mobile video call",
      "Web overlay → accept → video",
    ],
    [
      "5",
      "Web hangup before answer",
      "Web call then hang up <5s",
      "Mobile call_cancel, no stuck ring",
    ],
    [
      "6",
      "Web → Web",
      "2 browsers, 2 users",
      "Callee overlay → accept",
    ],
    [
      "7",
      "Reject",
      "Callee tap Tolak",
      "Caller toast ditolak, call ends",
    ],
  ];
  for (const [id, scenario, steps, expected] of rows) {
    console.log(`#${id} ${scenario}`);
    console.log(`    Steps: ${steps}`);
    console.log(`    Expected: ${expected}`);
    console.log(`    Result: [ ] PASS  [ ] FAIL  Notes: _______________\n`);
  }
  console.log("Staging URLs:");
  console.log("  Web FE: https://dev-launchpad.duluin.id (or local :8085)");
  console.log(`  API:    ${STAGING_API}`);
  console.log(`  WS:     ${STAGING_WS_BASE}/{user_id}?token=...`);
  console.log("\nVerify in chat-be logs:");
  console.log("  [VOIP PUSH] Sent action 'call_initiate' to <callee_user_id>");
  console.log("  Event call_initiate sent to userID=<callee>");
  console.log("\nTest actors (from prior E2E):");
  console.log("  Caller Ardi:  f2a55848-1e1a-44b5-beaa-bc5dd2395556");
  console.log("  Callee Agus:  1910db6e-39d7-499c-a128-dde4c25b66f7");
  console.log("  Conversation: b99033a5-7f55-49a0-a7e4-4e6d47a66b7b");
  console.log("  Employee ID (Agus): 2d183ad8-3e78-4920-8761-2957abbd35d4");
}

async function main() {
  const wsSmoke = process.argv.includes("--ws-smoke");
  console.log("=== Duluin Chat — Staging Call E2E Preflight ===\n");

  try {
    await checkLiveKitToken("/voice-call/token", "Voice");
    await checkLiveKitToken("/video-call/token", "Video");
  } catch (e) {
    fail("API connectivity", e.message);
  }

  if (wsSmoke) {
    try {
      await wsSmokeTest();
    } catch (e) {
      fail("WS smoke test", e.message);
    }
  }

  printManualMatrix();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n=== Summary: ${results.length - failed.length}/${results.length} automated checks passed ===`,
  );
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
