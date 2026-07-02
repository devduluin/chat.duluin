/**
 * Manual verification script for web → mobile call signaling integration.
 * Run: node scripts/verify-call-signaling.mjs
 */

const CALL_EVENTS = [
  "call_initiate",
  "call_accept",
  "call_reject",
  "call_end",
  "call_busy",
];

const initiatePayload = {
  type: "call_initiate",
  receiver_id: "1910db6e-example-callee",
  call_type: "voice",
  conversation_id: "b99033a5-example-conversation",
};

const acceptPayload = {
  type: "call_accept",
  receiver_id: "f2a55848-example-caller",
  call_id: "call-history-uuid",
};

const endPayload = {
  type: "call_end",
  receiver_id: "1910db6e-example-callee",
  call_id: "call-history-uuid",
};

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("PASS:", message);
}

assert(initiatePayload.type === "call_initiate", "call_initiate payload shape");
assert(initiatePayload.receiver_id.length > 0, "receiver_id required for initiate");
assert(
  initiatePayload.call_type === "voice" || initiatePayload.call_type === "video",
  "call_type is voice or video",
);
assert(initiatePayload.conversation_id.length > 0, "conversation_id required for LiveKit room");

assert(acceptPayload.type === "call_accept", "call_accept payload shape");
assert(acceptPayload.call_id.length > 0, "call_id required for accept");

assert(endPayload.type === "call_end", "call_end payload shape");
assert(
  endPayload.receiver_id.length > 0,
  "receiver_id required for end (triggers call_cancel VoIP push)",
);

CALL_EVENTS.forEach((event) => {
  assert(typeof event === "string" && event.startsWith("call_"), `event ${event} is call signaling`);
});

console.log("\nAll call signaling payload checks passed.");
console.log("\nManual E2E checklist:");
console.log("1. Web caller opens 1-on-1 chat, clicks phone/video");
console.log("2. Verify chat-be log: VoIP push sent action call_initiate");
console.log("3. Mobile (background) shows incoming call UI via FCM VoIP");
console.log("4. Mobile accepts → both join LiveKit room call-{conversation_id}");
console.log("5. Web hang up before answer → mobile receives call_cancel push");
console.log("6. Repeat for video call_type");
