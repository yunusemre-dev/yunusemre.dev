import { createHash } from "node:crypto";

const [origin, conversationId] = process.argv.slice(2);
if (!origin || !conversationId) {
  console.error("Usage: node scripts/smoke-chat.mjs <origin> <conversation-id>");
  process.exit(1);
}

function hasLeadingZeroBits(bytes, difficulty) {
  const wholeBytes = Math.floor(difficulty / 8);
  const remainingBits = difficulty % 8;
  for (let index = 0; index < wholeBytes; index += 1) {
    if (bytes[index] !== 0) return false;
  }
  return remainingBits === 0 || bytes[wholeBytes] >> (8 - remainingBits) === 0;
}

const challengeResponse = await fetch(
  `${origin}/api/conversations/${conversationId}/bot-challenge`,
);
if (!challengeResponse.ok) {
  throw new Error(`Bot challenge failed: ${challengeResponse.status}`);
}
const challenge = await challengeResponse.json();
let solution = -1;
for (let attempt = 0; attempt <= challenge.max_attempts; attempt += 1) {
  const digest = createHash("sha256")
    .update(`${challenge.token}:${attempt}`)
    .digest();
  if (hasLeadingZeroBits(digest, challenge.difficulty)) {
    solution = attempt;
    break;
  }
}
if (solution < 0) throw new Error("Could not solve the bot challenge");

const response = await fetch(
  `${origin}/api/conversations/${conversationId}/messages`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "What kind of software do you build?",
      after: 0,
      bot_token: challenge.token,
      bot_solution: solution,
      website: "",
    }),
  },
);
if (!response.ok) {
  throw new Error(`Chat request failed: ${response.status} ${await response.text()}`);
}

const events = (await response.text())
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const answer =
  events.findLast((event) => event.type === "done")?.message?.content || "";
if (!answer) throw new Error("The chat stream did not return an AI answer");

console.log(
  JSON.stringify({
    event_types: events.map((event) => event.type),
    answer,
  }),
);
