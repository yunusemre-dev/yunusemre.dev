const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const operatorSessionId =
  sessionStorage.getItem("yunus-operator-session") || crypto.randomUUID();
sessionStorage.setItem("yunus-operator-session", operatorSessionId);
const galleryVisitorId =
  localStorage.getItem("yunus-gallery-visitor") || crypto.randomUUID();
localStorage.setItem("yunus-gallery-visitor", galleryVisitorId);

const documentRoot = document.documentElement;
const viewportMeta = document.querySelector('meta[name="viewport"]');
const defaultViewportContent = viewportMeta?.getAttribute("content") || "";
const isIOSChrome = /CriOS\//.test(navigator.userAgent);
const isAndroidChrome =
  /Android/.test(navigator.userAgent) &&
  /Chrome\//.test(navigator.userAgent) &&
  !/(?:EdgA|OPR)\//.test(navigator.userAgent);
const hasMobileChromeBottomBar = isIOSChrome || isAndroidChrome;
let viewportSyncFrame = null;
let viewportBaselineHeight = 0;
let viewportBaselineWidth = 0;

documentRoot.classList.toggle("is-ios-chrome", isIOSChrome);
documentRoot.classList.toggle("is-android-chrome", isAndroidChrome);

function lockIOSChromeInputZoom() {
  if (!isIOSChrome || !viewportMeta) return;
  viewportMeta.setAttribute(
    "content",
    `${defaultViewportContent}, maximum-scale=1`,
  );
}

function unlockIOSChromeInputZoom() {
  if (!isIOSChrome || !viewportMeta) return;
  viewportMeta.setAttribute("content", defaultViewportContent);
}

function syncAppViewportHeight() {
  const viewport = window.visualViewport;
  // Some mobile browsers overlay their bottom toolbar without updating vh units.
  const visibleViewportHeight = viewport?.height || window.innerHeight;
  const visibleViewportWidth = viewport?.width || window.innerWidth;
  const visibleViewportOffsetTop = viewport?.offsetTop || 0;
  const scale = viewport?.scale || 1;
  const isUnzoomed = Math.abs(scale - 1) < 0.05;
  const orientationChanged =
    viewportBaselineWidth &&
    Math.abs(visibleViewportWidth - viewportBaselineWidth) > 80;

  if (!viewportBaselineHeight || orientationChanged) {
    viewportBaselineHeight = visibleViewportHeight;
    viewportBaselineWidth = visibleViewportWidth;
  } else if (isUnzoomed && visibleViewportHeight > viewportBaselineHeight) {
    viewportBaselineHeight = visibleViewportHeight;
  }

  const virtualKeyboardOpen =
    hasMobileChromeBottomBar &&
    isUnzoomed &&
    viewportBaselineHeight - visibleViewportHeight > 160;

  documentRoot.classList.toggle(
    "is-virtual-keyboard-open",
    virtualKeyboardOpen,
  );
  documentRoot.style.setProperty(
    "--app-viewport-height",
    `${Math.floor(visibleViewportHeight)}px`,
  );
  documentRoot.style.setProperty(
    "--app-viewport-offset-top",
    `${Math.floor(visibleViewportOffsetTop)}px`,
  );
}

function scheduleAppViewportSync() {
  if (viewportSyncFrame !== null) {
    window.cancelAnimationFrame(viewportSyncFrame);
  }
  viewportSyncFrame = window.requestAnimationFrame(() => {
    viewportSyncFrame = null;
    syncAppViewportHeight();
  });
}

syncAppViewportHeight();
window.addEventListener("resize", scheduleAppViewportSync, { passive: true });
window.addEventListener("orientationchange", scheduleAppViewportSync, {
  passive: true,
});
window.addEventListener("pageshow", scheduleAppViewportSync, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleAppViewportSync, {
  passive: true,
});

const state = {
  cleanup: null,
  conversationId: localStorage.getItem("yunus-conversation"),
  takeover: false,
  lastMessageId: 0,
  chatGeneration: 0,
  operatorSelected: null,
  operatorTab: "chats",
  operatorPresenceConversation: null,
  operatorTypingCleanup: null,
  operatorSessionId,
  botCheck: null,
  botCheckPromise: null,
};

const avatarUrl = "/static/avatar-96.webp?v=1";
const avatarSrcset =
  "/static/avatar-96.webp?v=1 96w, /static/avatar-192.webp?v=1 192w";

const icons = {
  chat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 18.5 3 21v-4.8A8 8 0 0 1 5.8 3h12.4A2.8 2.8 0 0 1 21 5.8v7.4a2.8 2.8 0 0 1-2.8 2.8H8.4l-.9 2.5Z"/></svg>`,
  past: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V4m6 3V4M5.5 10.5h13M6.2 5.5h11.6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"/><path d="m9.5 15 1.6 1.6 3.7-3.7"/></svg>`,
  dump: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 .8 2.7A4.7 4.7 0 0 0 16 8.9l2.7.8-2.7.8a4.7 4.7 0 0 0-3.2 3.2L12 16.5l-.8-2.8A4.7 4.7 0 0 0 8 10.5l-2.7-.8L8 9a4.7 4.7 0 0 0 3.2-3.2L12 3Z"/><path d="m18.5 15 .4 1.4a2.5 2.5 0 0 0 1.7 1.7l1.4.4-1.4.4a2.5 2.5 0 0 0-1.7 1.7l-.4 1.4-.4-1.4a2.5 2.5 0 0 0-1.7-1.7l-1.4-.4 1.4-.4a2.5 2.5 0 0 0 1.7-1.7l.4-1.4Z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 2.5-8L4 4Z"/><path d="M6.5 12H20"/></svg>`,
  typing: `<svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="12" r="3"><animate id="typing-bounce-start" begin="0;typing-bounce-end.end+0.25s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/></circle><circle cx="12" cy="12" r="3"><animate begin="typing-bounce-start.begin+0.1s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/></circle><circle cx="20" cy="12" r="3"><animate id="typing-bounce-end" begin="typing-bounce-start.begin+0.2s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33"/></circle></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 7 7-7 7"/></svg>`,
  returnArrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10-5 5 5 5"/><path d="M21 4v6a5 5 0 0 1-5 5H3"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/></svg>`,
  newChat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`,
};

const experiences = [
  {
    date: "NOV 2025 — PRESENT",
    role: "Full Stack Software Engineer",
    company: "Saga",
    url: "https://sagalegal.io/",
    text: "Building AI-powered products for lawyers across the frontend, backend, and occasionally product design.",
    tags: ["TypeScript", "Next.js", "AI systems", "Product design"],
  },
  {
    date: "SEP 2023 — NOV 2025",
    role: "Full Stack Software Engineer",
    company: "Radity",
    url: "https://radity.com/",
    text: "Built scalable insurance portals for large clients, including THREE Insurance by Berkshire Hathaway, and helped migrate a legacy claims portal.",
    tags: [
      "TypeScript",
      "React",
      "Next.js",
      "NestJS",
      "Material UI",
      "PostgreSQL",
    ],
  },
  {
    date: "JAN 2023 — SEP 2023",
    role: "Full Stack Software Engineer",
    company: "DT Cloud",
    url: "https://dtcloudnow.com/en/",
    text: "Built AWS-like cloud products and owned real features end to end, from backend systems to their interfaces.",
    tags: [
      "JavaScript",
      "TypeScript",
      "React",
      "Express",
      "Chakra UI",
      "Figma",
    ],
  },
  {
    date: "MAR 2022 — JUN 2022",
    role: "Undergraduate Research Assistant",
    company: "Ankara Science University",
    url: "https://ankarabilim.edu.tr/en/",
    text: "Mentored computer engineering students in object-oriented programming and Java through practical, relatable examples.",
    tags: ["Java", "OOP", "Mentorship"],
  },
];

const pageMetadata = {
  "/": {
    title: "Yunus Emre Kepenek — software engineer",
    description:
      "Software engineer Yunus Emre Kepenek. Chat with my AI counterpart, explore my experience, or browse moments from my life.",
  },
  "/past": {
    title: "Past — Yunus Emre Kepenek",
    description:
      "My experience building thoughtful software across product engineering, AI systems, insurance, cloud platforms, and design.",
  },
  "/dump": {
    title: "The dump — Yunus Emre Kepenek",
    description:
      "Life, loosely documented — a casual visual dump from Yunus Emre Kepenek.",
  },
  "/studio": {
    title: "Operator studio — Yunus Emre Kepenek",
    description: "Private operator studio for Yunus Emre Kepenek.",
  },
};

function applyPageMetadata(path) {
  const metadata = pageMetadata[path] || pageMetadata["/"];
  const canonicalPath = pageMetadata[path] ? path : "/";
  const canonicalUrl = `https://www.yunusemre.dev${canonicalPath}`;
  document.title = metadata.title;
  document.querySelector('meta[name="description"]')?.setAttribute(
    "content",
    metadata.description,
  );
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute("href", canonicalUrl);
  document
    .querySelector('meta[property="og:title"]')
    ?.setAttribute("content", metadata.title);
  document
    .querySelector('meta[property="og:description"]')
    ?.setAttribute("content", metadata.description);
  document
    .querySelector('meta[property="og:url"]')
    ?.setAttribute("content", canonicalUrl);
  document
    .querySelector('meta[name="twitter:title"]')
    ?.setAttribute("content", metadata.title);
  document
    .querySelector('meta[name="twitter:description"]')
    ?.setAttribute("content", metadata.description);
  document
    .querySelector('meta[name="robots"]')
    ?.setAttribute(
      "content",
      path === "/studio"
        ? "noindex, nofollow, noarchive"
        : "index, follow, max-image-preview:large",
    );
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(
    () => toast.classList.remove("is-visible"),
    2600,
  );
}

function navItem(path, icon, label, active) {
  return `<a class="nav-item ${active === path ? "is-active" : ""}" href="${path}" data-link aria-label="${label}" title="${label}">
    ${icons[icon]}<span>${label}</span>
  </a>`;
}

function siteHeader(active = location.pathname, heading) {
  return `<header class="site-header shell">
    <a class="identity" href="/" data-link aria-label="Yunus Emre Kepenek, home">
      <img src="${avatarUrl}" srcset="${avatarSrcset}" sizes="52px" width="52" height="52" alt="Yunus Emre Kepenek" fetchpriority="high" decoding="async" />
      <span><strong>Yunus Emre Kepenek</strong><small>software engineer</small></span>
    </a>
    <div class="header-heading">
      <p class="eyebrow">${heading.eyebrow}</p>
      <h1 id="${heading.id}">${heading.title}</h1>
      <p>${heading.description}</p>
    </div>
    <nav class="site-nav" aria-label="Primary navigation">
      ${navItem("/", "chat", "Chat", active)}
      ${navItem("/past", "past", "Past", active)}
      ${navItem("/dump", "dump", "Dump", active)}
    </nav>
  </header>`;
}

function bindLinks() {
  document.querySelectorAll("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      history.pushState({}, "", link.getAttribute("href"));
      renderRoute();
    });
  });
}

function setPage(markup, routeClass = "") {
  if (state.cleanup) state.cleanup();
  state.cleanup = null;
  const isChatRoute = routeClass === "is-chat-route";
  documentRoot.classList.toggle("is-chat-route", isChatRoute);
  document.body.classList.toggle("is-chat-route", isChatRoute);
  app.innerHTML = markup;
  bindLinks();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderRoute() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  applyPageMetadata(path);
  if (path === "/past") return renderPast();
  if (path === "/dump") return renderDump();
  if (path === "/studio") return renderStudio();
  return renderChat();
}

function isMessageContinuation(previousRole, role) {
  return role !== "presence" && previousRole === role;
}

function messageMarkup(message, temporary = false, groupPosition = "solo") {
  if (message.role === "presence") {
    return `<div class="presence-banner" data-role="presence" ${message.id ? `data-message-id="${message.id}"` : "data-temporary=true"}><span>${escapeHtml(message.content)}</span></div>`;
  }
  const continuation = groupPosition === "middle" || groupPosition === "end";
  return `<article class="message ${message.role} is-group-${groupPosition} ${temporary ? "is-streaming" : ""} ${continuation ? "is-continuation" : ""}" data-role="${message.role}" ${message.id ? `data-message-id="${message.id}"` : "data-temporary=true"}>
    <p>${escapeHtml(message.content)}</p>
  </article>`;
}

function messagesMarkup(messages) {
  return messages
    .map((message, index) => {
      const hasPrevious = isMessageContinuation(
        messages[index - 1]?.role,
        message.role,
      );
      const hasNext = isMessageContinuation(
        message.role,
        messages[index + 1]?.role,
      );
      const groupPosition = hasPrevious
        ? hasNext
          ? "middle"
          : "end"
        : hasNext
          ? "start"
          : "solo";
      return messageMarkup(message, false, groupPosition);
    })
    .join("");
}

async function ensureConversation(expectedGeneration = null) {
  const requestedConversation = state.conversationId;
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: requestedConversation }),
  });
  if (!response.ok) throw new Error("Could not start a conversation");
  const data = await response.json();
  if (
    expectedGeneration !== null &&
    expectedGeneration !== state.chatGeneration
  )
    return null;
  state.conversationId = data.id;
  localStorage.setItem("yunus-conversation", data.id);
  return data;
}

function hasLeadingZeroBits(bytes, difficulty) {
  const wholeBytes = Math.floor(difficulty / 8);
  const remainingBits = difficulty % 8;
  for (let index = 0; index < wholeBytes; index += 1) {
    if (bytes[index] !== 0) return false;
  }
  return (
    remainingBits === 0 || bytes[wholeBytes] >> (8 - remainingBits) === 0
  );
}

async function solveBotCheck(conversationId) {
  const response = await fetch(
    `/api/conversations/${conversationId}/bot-challenge`,
  );
  if (!response.ok) throw new Error("Could not run the background bot check");
  const challenge = await response.json();
  const encoder = new TextEncoder();
  for (let solution = 0; solution <= challenge.max_attempts; solution += 1) {
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(`${challenge.token}:${solution}`),
      ),
    );
    if (hasLeadingZeroBits(digest, challenge.difficulty)) {
      return {
        conversationId,
        token: challenge.token,
        solution,
        expiresAt: challenge.expires_at * 1000,
      };
    }
    if (solution > 0 && solution % 128 === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }
  throw new Error("Could not complete the background bot check");
}

function resetBotCheck() {
  state.botCheck = null;
  state.botCheckPromise = null;
}

function prepareBotCheck() {
  const conversationId = state.conversationId;
  if (!conversationId)
    return Promise.reject(new Error("No conversation for the bot check"));
  if (
    state.botCheck?.conversationId === conversationId &&
    state.botCheck.expiresAt > Date.now() + 5000
  ) {
    return Promise.resolve(state.botCheck);
  }
  if (state.botCheck?.conversationId !== conversationId) state.botCheck = null;
  if (state.botCheckPromise) return state.botCheckPromise;
  const pending = solveBotCheck(conversationId).then((botCheck) => {
    if (state.conversationId === conversationId) state.botCheck = botCheck;
    return botCheck;
  });
  const tracked = pending.finally(() => {
    if (state.botCheckPromise === tracked) state.botCheckPromise = null;
  });
  state.botCheckPromise = tracked;
  return tracked;
}

async function takeBotCheck() {
  const botCheck = await prepareBotCheck();
  if (
    botCheck.conversationId !== state.conversationId ||
    botCheck.expiresAt <= Date.now()
  ) {
    resetBotCheck();
    return takeBotCheck();
  }
  state.botCheck = null;
  return botCheck;
}

async function updateVisitorTyping(conversationId, typing) {
  if (!conversationId) return null;
  const response = await fetch(`/api/conversations/${conversationId}/typing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ typing }),
    keepalive: !typing,
  });
  if (!response.ok) throw new Error("Could not update typing status");
  return response.json();
}

function setOperatorTyping(typing) {
  const indicator = document.querySelector("#chat-typing");
  if (!indicator) return;
  indicator.hidden = !typing;
}

function setChatStatus(takeover, { notify = true } = {}) {
  const justConnected = takeover && !state.takeover;
  const justDisconnected = !takeover && state.takeover;
  state.takeover = takeover;
  const status = document.querySelector("#chat-status");
  if (!status) return;
  status.classList.toggle("is-human", takeover);
  status.innerHTML = `<i></i>${takeover ? "Yunus is here" : "You’re talking to Yunus’s AI"}`;
  if (!takeover) setOperatorTyping(false);
  if (notify && justConnected) {
    showToast("Yunus connected to the chat.");
  }
  if (notify && justDisconnected) {
    showToast("Yunus disconnected from the chat.");
  }
}

function syncPromptVisibility() {
  const messages = document.querySelector("#messages");
  const prompts = document.querySelector("#prompt-stack");
  if (!messages || !prompts) return;
  prompts.hidden = Boolean(
    messages.querySelector("[data-message-id], .presence-banner"),
  );
}

let chatScrollFrame = null;

function scrollChatMessagesToBottom(behavior = "auto") {
  if (chatScrollFrame !== null) {
    window.cancelAnimationFrame(chatScrollFrame);
  }
  chatScrollFrame = window.requestAnimationFrame(() => {
    chatScrollFrame = null;
    const messages = document.querySelector("#messages");
    if (!messages) return;
    messages.scrollTo({
      top: messages.scrollHeight,
      behavior,
    });
  });
}

function addMessage(message, temporary = false) {
  const messages = document.querySelector("#messages");
  if (!messages) return null;
  if (message.id && messages.querySelector(`[data-message-id="${message.id}"]`))
    return null;
  const renderedMessages = messages.querySelectorAll("[data-role]");
  const previousMessage = renderedMessages[renderedMessages.length - 1];
  const continuation = isMessageContinuation(
    previousMessage?.dataset.role,
    message.role,
  );
  if (continuation) {
    if (previousMessage.classList.contains("is-group-solo")) {
      previousMessage.classList.replace("is-group-solo", "is-group-start");
    } else if (previousMessage.classList.contains("is-group-end")) {
      previousMessage.classList.replace("is-group-end", "is-group-middle");
    }
  }
  messages.insertAdjacentHTML(
    "beforeend",
    messageMarkup(message, temporary, continuation ? "end" : "solo"),
  );
  if (message.id)
    state.lastMessageId = Math.max(state.lastMessageId, Number(message.id));
  if (message.id && message.role !== "presence") {
    const newChatButton = document.querySelector("#new-chat-button");
    if (newChatButton) newChatButton.hidden = false;
  }
  const element = messages.lastElementChild;
  syncPromptVisibility();
  scrollChatMessagesToBottom(temporary ? "smooth" : "auto");
  return element;
}

async function pollChat() {
  if (!state.conversationId || !document.querySelector("#messages")) return;
  try {
    const response = await fetch(
      `/api/conversations/${state.conversationId}/messages?after=${state.lastMessageId}`,
    );
    if (!response.ok) return;
    const data = await response.json();
    data.messages.forEach((message) => addMessage(message));
    setChatStatus(data.takeover);
    setOperatorTyping(Boolean(data.takeover && data.operator_typing));
  } catch (_) {
    // A transient poll failure should not interrupt typing or navigation.
  }
}

async function renderChat() {
  const chatGeneration = ++state.chatGeneration;
  state.lastMessageId = 0;
  let initialMessages = [];
  let initialTakeover = false;
  let initialOperatorTyping = false;
  let loadError = null;

  try {
    const conversation = await ensureConversation(chatGeneration);
    if (!conversation) return;
    const response = await fetch(
      `/api/conversations/${state.conversationId}/messages?after=0`,
    );
    if (!response.ok) throw new Error("Could not load this conversation");
    const data = await response.json();
    initialMessages = data.messages;
    initialTakeover = data.takeover;
    initialOperatorTyping = Boolean(data.operator_typing);
    state.lastMessageId = initialMessages.reduce(
      (latest, message) => Math.max(latest, Number(message.id)),
      0,
    );
  } catch (error) {
    loadError = error;
  }

  const hasHistory = initialMessages.length > 0;
  const hasConversationMessages = initialMessages.some(
    (message) => message.role !== "presence",
  );
  const welcomeMessage = messageMarkup({
    role: "ai",
    content: "Hey! I'm Yunus, what do you want to chat about?",
  });

  setPage(
    `${siteHeader("/", {
      eyebrow: "A direct line to me",
      title: "Ask me anything.",
      description: "About my work, my past or anything.",
      id: "chat-title",
    })}
    <main class="chat-page shell page-enter" aria-labelledby="chat-title">
      <section class="chat-shell" aria-label="Chat with Yunus">
        <div class="chat-topline">
          <span id="chat-status" class="chat-status"><i></i>You’re talking to Yunus’s AI</span>
          <div class="chat-topline-actions">
            <span class="private-note">private session, only you and me</span>
            <button class="new-chat-button" id="new-chat-button" type="button" title="Clear this chat and start fresh" ${hasConversationMessages ? "" : "hidden"}>${icons.newChat}<span>New chat</span></button>
          </div>
        </div>
        <div class="messages" id="messages" aria-live="polite">
          ${hasHistory ? messagesMarkup(initialMessages) : welcomeMessage}
          <div class="prompt-stack" id="prompt-stack" aria-label="Suggested questions" ${hasHistory ? "hidden" : ""}>
            <button type="button" data-prompt="What are you working on now?" disabled><span>What are you working on now?</span><i>${icons.returnArrow}</i></button>
            <button type="button" data-prompt="What is your preferred tech stack?" disabled><span>What is your preferred tech stack?</span><i>${icons.returnArrow}</i></button>
            <button type="button" data-prompt="What do you do for fun?" disabled><span>What do you do for fun?</span><i>${icons.returnArrow}</i></button>
          </div>
        </div>
        <div class="chat-typing" id="chat-typing" role="status" aria-live="polite" hidden>${icons.typing}<span>Yunus is typing</span></div>
        <form class="chat-composer" id="chat-form">
          <label class="sr-only" for="chat-input">Say something</label>
          <input class="bot-field" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <textarea id="chat-input" rows="1" maxlength="1200" placeholder="Say something…" autocomplete="off"></textarea>
          <button class="send-button" type="submit" aria-label="Preparing secure chat" disabled>${icons.send}</button>
        </form>
      </section>
    </main>`,
    "is-chat-route",
  );

  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#chat-input");
  const send = form.querySelector("button[type=submit]");
  const promptButtons = document.querySelectorAll("[data-prompt]");
  const messages = document.querySelector("#messages");
  const newChatButton = document.querySelector("#new-chat-button");
  let sending = false;
  let botCheckReady = false;
  let botCheckRetry = null;
  let activeRequest = null;
  let touchY = null;
  let visitorTypingActive = false;
  let lastVisitorTypingSignal = 0;
  let visitorTypingIdleTimer = null;
  let visitorTypingRequests = Promise.resolve();
  const chatConversationId = state.conversationId;

  function queueVisitorTypingUpdate(typing) {
    visitorTypingRequests = visitorTypingRequests
      .catch(() => null)
      .then(() => updateVisitorTyping(chatConversationId, typing));
    return visitorTypingRequests;
  }

  function stopVisitorTyping() {
    window.clearTimeout(visitorTypingIdleTimer);
    visitorTypingIdleTimer = null;
    if (!visitorTypingActive) return visitorTypingRequests;
    visitorTypingActive = false;
    return queueVisitorTypingUpdate(false);
  }

  function signalVisitorTyping() {
    if (!input.value.trim()) {
      stopVisitorTyping().catch(() => {});
      return;
    }
    const now = Date.now();
    if (!visitorTypingActive || now - lastVisitorTypingSignal >= 1300) {
      visitorTypingActive = true;
      lastVisitorTypingSignal = now;
      queueVisitorTypingUpdate(true).catch(() => {});
    }
    window.clearTimeout(visitorTypingIdleTimer);
    visitorTypingIdleTimer = window.setTimeout(
      () => stopVisitorTyping().catch(() => {}),
      2200,
    );
  }

  function syncSubmitControls() {
    const disabled = sending || !botCheckReady;
    send.disabled = disabled;
    send.setAttribute(
      "aria-label",
      botCheckReady ? "Send message" : "Preparing secure chat",
    );
    promptButtons.forEach((button) => {
      button.disabled = disabled;
    });
    form.setAttribute("aria-busy", String(!botCheckReady));
  }

  async function prepareSubmissionBotCheck() {
    botCheckReady = false;
    syncSubmitControls();
    try {
      await prepareBotCheck();
      if (chatGeneration !== state.chatGeneration) return;
      botCheckReady = true;
      syncSubmitControls();
    } catch (_) {
      if (chatGeneration !== state.chatGeneration) return;
      window.clearTimeout(botCheckRetry);
      botCheckRetry = window.setTimeout(prepareSubmissionBotCheck, 1500);
    }
  }

  setChatStatus(initialTakeover, { notify: false });
  setOperatorTyping(initialTakeover && initialOperatorTyping);
  messages.scrollTop = messages.scrollHeight;
  prepareSubmissionBotCheck();
  if (loadError) showToast(loadError.message);

  function redirectPageWheel(event) {
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
      return;
    if (event.target instanceof Element && event.target.closest("#messages"))
      return;
    messages.scrollTop += event.deltaY;
    event.preventDefault();
  }

  function startPageTouch(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (
      event.touches.length !== 1 ||
      target?.closest("#messages, textarea, input")
    ) {
      touchY = null;
      return;
    }
    touchY = event.touches[0].clientY;
  }

  function redirectPageTouch(event) {
    if (touchY === null || event.touches.length !== 1) return;
    const nextY = event.touches[0].clientY;
    messages.scrollTop += touchY - nextY;
    touchY = nextY;
    event.preventDefault();
  }

  function endPageTouch() {
    touchY = null;
  }

  window.addEventListener("wheel", redirectPageWheel, { passive: false });
  window.addEventListener("touchstart", startPageTouch, { passive: true });
  window.addEventListener("touchmove", redirectPageTouch, { passive: false });
  window.addEventListener("touchend", endPageTouch, { passive: true });
  window.addEventListener("touchcancel", endPageTouch, { passive: true });

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 116)}px`;
  }

  async function submitMessage(contentOverride) {
    const content = (contentOverride || input.value).trim();
    if (!content || sending || !botCheckReady) return;
    sending = true;
    botCheckReady = false;
    syncSubmitControls();
    document.querySelector("#prompt-stack").hidden = true;
    input.value = "";
    resizeInput();
    input.disabled = true;
    try {
      await stopVisitorTyping();
      const conversation = await ensureConversation(chatGeneration);
      if (!conversation) return;
      const botCheck = await takeBotCheck();
      prepareSubmissionBotCheck();
      activeRequest = new AbortController();
      const response = await fetch(
        `/api/conversations/${state.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            after: state.lastMessageId,
            bot_token: botCheck.token,
            bot_solution: botCheck.solution,
            website: form.elements.website.value,
          }),
          signal: activeRequest.signal,
        },
      );
      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Could not send that message");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamingElement = null;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "message") addMessage(event.message);
          if (event.type === "queued") {
            setChatStatus(true);
          }
          if (event.type === "assistant_start") {
            streamingElement = addMessage({ role: "ai", content: "" }, true);
          }
          if (event.type === "delta" && streamingElement) {
            streamingElement.querySelector("p").textContent += event.delta;
            scrollChatMessagesToBottom();
          }
          if (event.type === "done" && streamingElement) {
            streamingElement.removeAttribute("data-temporary");
            streamingElement.dataset.messageId = event.message.id;
            streamingElement.classList.remove("is-streaming");
            state.lastMessageId = Math.max(
              state.lastMessageId,
              Number(event.message.id),
            );
            scrollChatMessagesToBottom();
          }
        }
        if (done) break;
      }
    } catch (error) {
      syncPromptVisibility();
      if (error.name !== "AbortError")
        showToast(error.message || "Something went quiet. Try once more.");
    } finally {
      activeRequest = null;
      sending = false;
      input.disabled = false;
      syncSubmitControls();
      input.focus();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage();
  });
  input.addEventListener("input", () => {
    resizeInput();
    signalVisitorTyping();
  });
  input.addEventListener("touchstart", lockIOSChromeInputZoom, {
    passive: true,
  });
  input.addEventListener("focus", lockIOSChromeInputZoom);
  input.addEventListener("blur", () => {
    unlockIOSChromeInputZoom();
    stopVisitorTyping().catch(() => {});
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () =>
      submitMessage(button.dataset.prompt),
    );
  });
  newChatButton.addEventListener("click", async () => {
    await stopVisitorTyping().catch(() => {});
    state.chatGeneration += 1;
    activeRequest?.abort();
    state.conversationId = null;
    state.lastMessageId = 0;
    state.takeover = false;
    resetBotCheck();
    localStorage.removeItem("yunus-conversation");
    await renderChat();
    showToast("Fresh chat, ready when you are.");
  });

  syncPromptVisibility();
  const interval = window.setInterval(pollChat, 1200);
  state.cleanup = () => {
    window.clearInterval(interval);
    window.clearTimeout(botCheckRetry);
    unlockIOSChromeInputZoom();
    stopVisitorTyping().catch(() => {});
    window.removeEventListener("wheel", redirectPageWheel);
    window.removeEventListener("touchstart", startPageTouch);
    window.removeEventListener("touchmove", redirectPageTouch);
    window.removeEventListener("touchend", endPageTouch);
    window.removeEventListener("touchcancel", endPageTouch);
  };
}

function renderPast() {
  const timeline = experiences
    .map(
      (item) => `<article class="timeline-item">
        <div class="timeline-date">${item.date}</div>
        <a class="timeline-card" href="${item.url}" target="_blank" rel="noreferrer" aria-label="Visit ${item.company} website">
          <header><div><p>${item.company}</p><h3>${item.role}</h3></div><span>${icons.arrow}</span></header>
          <p class="timeline-description">${item.text}</p>
          <div class="tag-list">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </a>
      </article>`,
    )
    .join("");

  setPage(`${siteHeader("/past", {
    eyebrow: "Past, in reverse",
    title: "I build software.",
    description:
      "A short history of the work, people, and systems that shaped how I build.",
    id: "past-title",
  })}
    <main class="past-page shell page-enter" aria-labelledby="past-title">
      <section class="past-overview">
        <div class="past-about">
          <p>I’m a curious full-stack engineer based in İzmir. Video games pulled me into computers; by middle school I was teaching myself to code, running Minecraft servers people actually played on, and experimenting with Arduino.</p>
          <p>I try to be a jack of all trades, master of some. I work across frontend, backend, AI agents, and sometimes design. Away from work, it’s travel, cycling, tennis, and gaming.</p>
        </div>
        <div class="social-links">
          <a href="/static/yunus-emre-kepenek-resume.pdf" target="_blank" rel="noreferrer">Resume ↗</a>
          <a href="https://github.com/yunusemre-dev" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="https://www.linkedin.com/in/yekepenek/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
          <a href="https://www.instagram.com/yemrekpnk/" target="_blank" rel="noreferrer">Instagram ↗</a>
          <a href="mailto:yunus.emre.kepenek@outlook.com" aria-label="Email Yunus Emre Kepenek">Email ↗</a>
        </div>
      </section>
      <section class="timeline" aria-label="Experience timeline">${timeline}</section>
      <div class="past-ride" aria-hidden="true">
        <img src="/static/man-biking-light-skin-tone-noto.svg" alt="" />
      </div>
      <footer class="page-footer"><span>İzmir, Türkiye</span><span>Built with care, not a template.</span></footer>
    </main>`);
}

function dumpPhotoGridMarkup(photos) {
  if (!photos.length) {
    return `<div class="empty-gallery"><p>Nothing pinned here yet.</p><span>Check back after life happens.</span></div>`;
  }
  return photos
    .map(
      (
        photo,
        index,
      ) => `<article class="photo-item" style="--delay:${index * 35}ms">
        <button class="photo-card" type="button" style="--ratio:${photo.width}/${photo.height}" data-photo="${escapeHtml(photo.url)}" data-photo-thumbnail="${escapeHtml(photo.thumbnail_url || photo.url)}" data-photo-width="${photo.width}" data-photo-height="${photo.height}" data-photo-id="${photo.id}" data-caption="${escapeHtml(photo.caption)}" aria-label="Open ${escapeHtml(photo.caption || "image")}">
          <img class="photo-placeholder" src="${escapeHtml(photo.placeholder_url)}" alt="" aria-hidden="true" />
          <img class="photo-image" src="${escapeHtml(photo.thumbnail_url || photo.url)}" alt="${escapeHtml(photo.caption || "A moment from Yunus's dump")}" loading="${index < 3 ? "eager" : "lazy"}" decoding="async" ${index === 0 ? 'fetchpriority="high"' : ""} />
        </button>
        <div class="photo-details">
          <p class="photo-caption">${escapeHtml(photo.caption)}</p>
          <button class="photo-like ${photo.liked ? "is-liked" : ""}" type="button" data-like-photo="${photo.id}" data-like-label="${escapeHtml(photo.caption || "this image")}" aria-pressed="${photo.liked}" aria-label="${photo.liked ? "Unlike" : "Like"} ${escapeHtml(photo.caption || "this image")}">
            <span>${photo.like_count}</span>${icons.heart}
          </button>
        </div>
      </article>`,
    )
    .join("");
}

function dumpPageMarkup(gridMarkup, photoCount = "") {
  return `${siteHeader("/dump", {
    eyebrow: "Unsorted, mostly",
    title: "The dump.",
    description: "Life, loosely documented.",
    id: "dump-title",
  })}
    <main class="dump-page shell page-enter" aria-labelledby="dump-title">
      <section class="photo-grid" id="photo-grid" aria-live="polite">
        ${gridMarkup}
      </section>
      <dialog class="lightbox" id="lightbox">
        <div class="lightbox-content">
          <button class="lightbox-close" type="button" aria-label="Close image">${icons.close}</button>
          <img class="lightbox-image" alt="" />
          <div class="photo-details lightbox-details">
            <p class="photo-caption"></p>
            <button class="photo-like lightbox-like" type="button" aria-pressed="false" aria-label="Like this image">
              <span>0</span>${icons.heart}
            </button>
          </div>
        </div>
      </dialog>
      <div class="dump-ride" aria-hidden="true">
        <img src="/static/man-biking-light-skin-tone-noto.svg" alt="" />
      </div>
      <footer class="page-footer"><span>Visual notes, added without much ceremony.</span><span id="photo-count">${photoCount}</span></footer>
    </main>`;
}

async function renderDump() {
  try {
    const response = await fetch(
      `/api/photos?visitor_id=${encodeURIComponent(galleryVisitorId)}`,
    );
    if (!response.ok) throw new Error();
    const { photos } = await response.json();
    if ((location.pathname.replace(/\/$/, "") || "/") !== "/dump") return;
    const photoCount = `${photos.length} frame${photos.length === 1 ? "" : "s"}`;
    setPage(dumpPageMarkup(dumpPhotoGridMarkup(photos), photoCount));
    if (!photos.length) return;
    const grid = document.querySelector("#photo-grid");
    grid.querySelectorAll(".photo-image").forEach((image) => {
      const reveal = () => image.classList.add("is-loaded");
      if (image.complete && image.naturalWidth) {
        window.requestAnimationFrame(reveal);
      } else {
        image.addEventListener("load", reveal, { once: true });
      }
    });
    const dialog = document.querySelector("#lightbox");
    const lightboxContent = dialog.querySelector(".lightbox-content");
    const lightboxImage = dialog.querySelector(".lightbox-image");
    const lightboxLike = dialog.querySelector(".lightbox-like");
    let lightboxRequestId = 0;

    function applyLikeState(button, like) {
      button.classList.toggle("is-liked", like.liked);
      button.setAttribute("aria-pressed", String(like.liked));
      button.setAttribute(
        "aria-label",
        `${like.liked ? "Unlike" : "Like"} ${button.dataset.likeLabel || "this image"}`,
      );
      button.querySelector("span").textContent = like.like_count;
    }

    async function toggleLike(button) {
      const nextLiked = button.getAttribute("aria-pressed") !== "true";
      button.disabled = true;
      try {
        const likeResponse = await fetch(
          `/api/photos/${button.dataset.likePhoto}/like`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitor_id: galleryVisitorId,
              liked: nextLiked,
            }),
          },
        );
        if (!likeResponse.ok) throw new Error("Could not update that like");
        const like = await likeResponse.json();
        document.querySelectorAll("[data-like-photo]").forEach((likeButton) => {
          if (likeButton.dataset.likePhoto === button.dataset.likePhoto)
            applyLikeState(likeButton, like);
        });
        if (like.liked) {
          button.classList.remove("is-popping");
          void button.offsetWidth;
          button.classList.add("is-popping");
          window.setTimeout(() => button.classList.remove("is-popping"), 520);
        }
      } catch (error) {
        showToast(error.message);
      } finally {
        button.disabled = false;
      }
    }

    grid.querySelectorAll("[data-photo]").forEach((button) => {
      button.addEventListener("click", async () => {
        const requestId = ++lightboxRequestId;
        const photoWidth = Number(button.dataset.photoWidth) || 1;
        const photoHeight = Number(button.dataset.photoHeight) || 1;
        const availableWidth = Math.min(920, window.innerWidth - 32);
        const availableHeight = Math.max(1, window.innerHeight - 112);
        const displayWidth = Math.min(
          availableWidth,
          availableHeight * (photoWidth / photoHeight),
        );
        lightboxContent.style.width = `${Math.max(1, Math.round(displayWidth))}px`;
        lightboxImage.onload = null;
        lightboxImage.classList.remove("is-loaded");
        lightboxImage.removeAttribute("src");
        lightboxImage.alt = button.dataset.caption || "Expanded image";
        lightboxImage.onload = () => {
          if (requestId === lightboxRequestId)
            lightboxImage.classList.add("is-loaded");
        };
        lightboxImage.src = button.dataset.photoThumbnail;
        if (lightboxImage.complete && lightboxImage.naturalWidth) {
          window.requestAnimationFrame(() => {
            if (requestId === lightboxRequestId)
              lightboxImage.classList.add("is-loaded");
          });
        }
        dialog.querySelector(".photo-caption").textContent =
          button.dataset.caption;
        const gridLike = button.closest(".photo-item").querySelector(".photo-like");
        lightboxLike.dataset.likePhoto = button.dataset.photoId;
        lightboxLike.dataset.likeLabel =
          button.dataset.caption || "this image";
        applyLikeState(lightboxLike, {
          liked: gridLike.getAttribute("aria-pressed") === "true",
          like_count: gridLike.querySelector("span").textContent,
        });
        dialog.showModal();

        const fullImage = new Image();
        fullImage.decoding = "async";
        fullImage.src = button.dataset.photo;
        try {
          await fullImage.decode();
        } catch (_) {
          return;
        }
        if (requestId !== lightboxRequestId || !dialog.open) return;
        lightboxImage.src = button.dataset.photo;
      });
    });
    grid.querySelectorAll("[data-like-photo]").forEach((button) => {
      button.addEventListener("click", () => toggleLike(button));
    });
    lightboxLike.addEventListener("click", () => toggleLike(lightboxLike));
    dialog
      .querySelector(".lightbox-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      lightboxRequestId += 1;
      lightboxImage.onload = null;
      lightboxImage.classList.remove("is-loaded");
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      lightboxContent.style.removeProperty("width");
    });
  } catch (_) {
    if ((location.pathname.replace(/\/$/, "") || "/") !== "/dump") return;
    setPage(
      dumpPageMarkup(
        `<div class="empty-gallery"><p>The images are taking a minute.</p><span>Try refreshing this page.</span></div>`,
      ),
    );
  }
}

async function operatorFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "That did not work");
  }
  return response;
}

function renderStudioLogin(message = "") {
  setPage(`<main class="studio-login page-enter">
    <a href="/" data-link class="studio-back">← Back to site</a>
    <form id="studio-login-form" class="login-card">
      <img src="${avatarUrl}" srcset="${avatarSrcset}" sizes="52px" width="52" height="52" alt="Yunus Emre" decoding="async" />
      <p class="eyebrow">Private room</p>
      <h1>Operator studio</h1>
      <p>Reply to conversations, take over from the AI, and update the dump.</p>
      <label for="operator-password">Password</label>
      <input id="operator-password" type="password" required autofocus autocomplete="current-password" placeholder="••••••••••••" />
      ${message ? `<span class="form-error">${escapeHtml(message)}</span>` : ""}
      <button type="submit">Enter studio ${icons.arrow}</button>
    </form>
  </main>`);
  document
    .querySelector("#studio-login-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      button.disabled = true;
      try {
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: document.querySelector("#operator-password").value,
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return renderStudioLogin(
            body.detail || "That password did not match",
          );
        }
        renderStudio();
      } finally {
        button.disabled = false;
      }
    });
}

async function renderStudio() {
  try {
    await operatorFetch("/api/admin/conversations");
  } catch (error) {
    if (error.message === "UNAUTHORIZED") return renderStudioLogin();
    return renderStudioLogin(error.message);
  }

  const requestedConversation = new URLSearchParams(location.search).get(
    "conversation",
  );
  if (requestedConversation) {
    state.operatorSelected = requestedConversation;
  } else if (window.matchMedia("(max-width: 620px)").matches) {
    state.operatorSelected = null;
  }

  setPage(`<main class="studio page-enter">
    <header class="studio-header">
      <a href="/" data-link class="studio-identity"><img src="${avatarUrl}" srcset="${avatarSrcset}" sizes="40px" width="40" height="40" alt="" decoding="async" /><span><strong>Operator studio</strong><small>yunusemre.dev</small></span></a>
      <nav>
        <button class="${state.operatorTab === "chats" ? "is-active" : ""}" data-studio-tab="chats">Conversations</button>
        <button class="${state.operatorTab === "photos" ? "is-active" : ""}" data-studio-tab="photos">The dump</button>
      </nav>
      <div class="studio-actions">
        <button class="studio-notifications" id="studio-notifications" type="button">Enable alerts</button>
        <button class="studio-logout" id="studio-logout">Log out</button>
      </div>
    </header>
    <div id="studio-body" class="studio-body"></div>
  </main>`);
  document.querySelectorAll("[data-studio-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.operatorTab = button.dataset.studioTab;
      renderStudio();
    });
  });
  document
    .querySelector("#studio-logout")
    .addEventListener("click", async () => {
      await releaseOperatorPresence();
      await fetch("/api/admin/logout", { method: "POST" });
      renderStudioLogin();
    });
  setupPushNotifications().catch(() => {
    const button = document.querySelector("#studio-notifications");
    if (button) {
      button.textContent = "Alerts unavailable";
      button.disabled = true;
    }
  });
  if (state.operatorTab === "photos") {
    await renderStudioPhotos();
    return;
  }
  await renderStudioChats();
}

function shortId(id) {
  return id ? id.slice(0, 6).toUpperCase() : "NEW";
}

function relativeTime(date) {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function setupPushNotifications() {
  const button = document.querySelector("#studio-notifications");
  if (!button) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    button.textContent = "Alerts unavailable";
    button.title = "On iPhone, add the studio to your Home Screen first.";
    button.disabled = true;
    return;
  }

  const configResponse = await operatorFetch("/api/admin/push/config");
  const config = await configResponse.json();
  if (!config.supported || !config.public_key) {
    button.textContent = "Alerts unavailable";
    button.disabled = true;
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  async function setSubscriptionState() {
    button.classList.toggle("is-active", Boolean(subscription));
    button.textContent = subscription ? "Alerts on" : "Enable alerts";
    button.title = subscription
      ? "New-chat notifications are enabled on this device."
      : "Notify this device when a new chat starts.";
  }

  if (subscription) {
    await operatorFetch("/api/admin/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
  }
  await setSubscriptionState();

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (subscription) {
        await operatorFetch("/api/admin/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        subscription = null;
        showToast("Notifications are off on this device.");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("Notifications weren’t allowed in this browser.");
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.public_key),
        });
        await operatorFetch("/api/admin/push/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        showToast("New-chat notifications are on.");
      }
      await setSubscriptionState();
    } catch (error) {
      showToast(error.message || "Could not update notifications.");
    } finally {
      button.disabled = false;
    }
  });
}

async function updateOperatorPresence(conversationId, action, useBeacon = false) {
  if (!conversationId) return null;
  const url = `/api/admin/conversations/${conversationId}/presence`;
  const body = JSON.stringify({
    session_id: state.operatorSessionId,
    action,
  });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return null;
  }
  const response = await operatorFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: action === "leave",
  });
  return response.json();
}

async function updateOperatorTyping(conversationId, typing) {
  if (!conversationId) return null;
  const response = await operatorFetch(
    `/api/admin/conversations/${conversationId}/typing`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: state.operatorSessionId,
        typing,
      }),
      keepalive: !typing,
    },
  );
  return response.json();
}

async function releaseOperatorPresence(useBeacon = false) {
  const conversationId = state.operatorPresenceConversation;
  if (!conversationId) return null;
  state.operatorPresenceConversation = null;
  try {
    return await updateOperatorPresence(conversationId, "leave", useBeacon);
  } catch (_) {
    // The server-side presence timeout is the fallback if a tab disappears.
    return null;
  }
}

async function joinOperatorPresence(conversationId) {
  if (!conversationId) return null;
  if (
    state.operatorPresenceConversation &&
    state.operatorPresenceConversation !== conversationId
  ) {
    await releaseOperatorPresence();
  }
  const data = await updateOperatorPresence(conversationId, "join");
  state.operatorPresenceConversation = conversationId;
  return data;
}

async function heartbeatOperatorPresence() {
  const conversationId = state.operatorPresenceConversation;
  if (!conversationId) return;
  const data = await updateOperatorPresence(conversationId, "heartbeat");
  if (!data?.present) await joinOperatorPresence(conversationId);
}

function conversationListMarkup(conversations) {
  if (!conversations.length) {
    return `<div class="studio-empty"><p>Quiet in here.</p><span>New conversations will appear automatically.</span></div>`;
  }
  return conversations
    .map(
      (conversation) => `<button data-conversation="${conversation.id}" class="conversation-preview ${conversation.id === state.operatorSelected ? "is-active" : ""}">
        <span class="conversation-avatar">${shortId(conversation.id).slice(0, 2)}</span>
        <span class="conversation-copy">
          <strong>Visitor ${shortId(conversation.id)}</strong>
          <small class="conversation-location">${escapeHtml(conversation.location || "Locating…")}</small>
          <small>${escapeHtml(conversation.last_message || "No messages yet")}</small>
        </span>
        <span class="conversation-meta"><time>${relativeTime(conversation.updated_at)}</time>${conversation.takeover ? "<i>YOU</i>" : ""}</span>
      </button>`,
    )
    .join("");
}

function bindConversationButtons(container) {
  container.querySelectorAll("[data-conversation]").forEach((button) => {
    button.addEventListener("click", async () => {
      const conversationId = button.dataset.conversation;
      if (conversationId === state.operatorSelected) return;
      await releaseOperatorPresence();
      state.operatorSelected = conversationId;
      history.replaceState(
        {},
        "",
        `/studio?conversation=${encodeURIComponent(conversationId)}`,
      );
      container
        .querySelectorAll("[data-conversation]")
        .forEach((item) =>
          item.classList.toggle(
            "is-active",
            item.dataset.conversation === conversationId,
          ),
        );
      document.querySelector("#studio-body")?.classList.add("has-selection");
      await renderOperatorConversation(conversationId, null, "", false);
    });
  });
}

async function renderStudioChats() {
  const body = document.querySelector("#studio-body");
  const response = await operatorFetch("/api/admin/conversations");
  const { conversations } = await response.json();
  const compactStudio = window.matchMedia("(max-width: 620px)").matches;
  if (!state.operatorSelected && conversations.length && !compactStudio)
    state.operatorSelected = conversations[0].id;
  if (
    state.operatorSelected &&
    !conversations.some((item) => item.id === state.operatorSelected)
  ) {
    state.operatorSelected = conversations[0]?.id || null;
  }
  body.innerHTML = `<section class="inbox-panel">
      <header><div><p class="eyebrow">Inbox</p><h2>Conversations</h2></div><span>${conversations.length}</span></header>
      <div class="conversation-list">${conversationListMarkup(conversations)}</div>
    </section>
    <section class="operator-chat" id="operator-chat">
      ${state.operatorSelected ? `<div class="operator-loading">Opening conversation…</div>` : `<div class="studio-empty centered"><p>No conversation selected.</p><span>When someone writes, their chat will show up here.</span></div>`}
    </section>`;
  body.classList.toggle("has-selection", Boolean(state.operatorSelected));

  const conversationList = body.querySelector(".conversation-list");
  bindConversationButtons(conversationList);
  if (state.operatorSelected) {
    await renderOperatorConversation(state.operatorSelected);
  }

  let refreshing = false;
  const refreshInterval = window.setInterval(async () => {
    if (location.pathname !== "/studio" || state.operatorTab !== "chats")
      return;
    if (refreshing) return;
    refreshing = true;
    try {
      await refreshOperatorInbox();
      await refreshOperatorConversation();
    } catch (_) {
    } finally {
      refreshing = false;
    }
  }, 1200);
  const heartbeatInterval = window.setInterval(
    () => heartbeatOperatorPresence().catch(() => {}),
    8000,
  );

  async function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      state.operatorTypingCleanup?.();
      return;
    }
    await heartbeatOperatorPresence();
    if (state.operatorSelected) {
      await refreshOperatorConversation();
    }
  }

  function handlePageHide() {
    state.operatorTypingCleanup?.();
    releaseOperatorPresence(true);
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);
  state.cleanup = () => {
    window.clearInterval(refreshInterval);
    window.clearInterval(heartbeatInterval);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    state.operatorTypingCleanup?.();
    state.operatorTypingCleanup = null;
    releaseOperatorPresence(true);
  };
}

async function renderOperatorConversation(
  id,
  providedData = null,
  draftOverride,
  focusComposer = false,
) {
  const panel = document.querySelector("#operator-chat");
  if (!panel) return;
  state.operatorTypingCleanup?.();
  state.operatorTypingCleanup = null;
  const existingInput = panel.querySelector("#operator-composer textarea");
  const draft =
    draftOverride === undefined ? existingInput?.value || "" : draftOverride;
  const restoreFocus =
    focusComposer || (existingInput && document.activeElement === existingInput);
  let data = providedData;
  if (!data) {
    const response = await operatorFetch(
      `/api/admin/conversations/${id}/messages`,
    );
    data = await response.json();
  }
  const visitor = data.visitor || {
    location: "Locating…",
    timezone: "",
  };
  const visibleMessageCount = data.messages.filter(
    (message) => message.role !== "presence",
  ).length;
  const operatorConnected =
    state.operatorPresenceConversation === id && Boolean(data.takeover);
  panel.dataset.messageCount = String(data.messages.length);
  panel.dataset.takeover = String(Boolean(data.takeover));
  panel.dataset.location = visitor.location || "";
  panel.dataset.visitorTyping = String(Boolean(data.visitor_typing));
  panel.innerHTML = `<header class="operator-chat-header">
      <button class="operator-chat-back" type="button" aria-label="Close conversation">${icons.arrow}</button>
      <div class="visitor-summary"><span class="conversation-avatar">${shortId(id).slice(0, 2)}</span><p><strong>Visitor ${shortId(id)}</strong><small>${visibleMessageCount} message${visibleMessageCount === 1 ? "" : "s"} · ${escapeHtml(visitor.location || "Locating…")}</small>${visitor.timezone ? `<small>${escapeHtml(visitor.timezone)}</small>` : ""}</p></div>
      <label class="takeover-toggle"><span><strong>Take over</strong><small>${operatorConnected ? "You’re answering" : data.takeover ? "Yunus is answering" : "AI is answering"}</small></span><input type="checkbox" ${operatorConnected ? "checked" : ""} /><i></i></label>
    </header>
    <div class="operator-messages" id="operator-messages">
      ${messagesMarkup(data.messages)}
    </div>
    <div class="operator-composer-wrap">
      <div class="studio-typing" id="studio-typing" role="status" aria-live="polite" ${data.visitor_typing ? "" : "hidden"}>${icons.typing}<span>Visitor is typing</span></div>
      <form class="operator-composer ${operatorConnected ? "" : "is-disabled"}" id="operator-composer">
        <textarea rows="1" maxlength="1200" placeholder="${operatorConnected ? "Reply as Yunus…" : "Take over to reply…"}" ${operatorConnected ? "" : "disabled"}></textarea>
        <button type="submit" aria-label="Send reply" disabled>${icons.send}</button>
      </form>
      <small>${operatorConnected ? "Enter to send · Shift + Enter for a new line" : "Take over this chat to reply."}</small>
    </div>`;
  const messages = panel.querySelector("#operator-messages");
  messages.scrollTop = messages.scrollHeight;
  panel
    .querySelector(".operator-chat-back")
    .addEventListener("click", async () => {
      const wasConnected = state.operatorPresenceConversation === id;
      await releaseOperatorPresence();
      state.operatorSelected = null;
      history.replaceState({}, "", "/studio");
      await renderStudio();
      if (wasConnected) showToast("Disconnected. AI is answering.");
    });
  const toggle = panel.querySelector(".takeover-toggle input");
  toggle.addEventListener("change", async () => {
    const shouldConnect = toggle.checked;
    toggle.disabled = true;
    try {
      if (shouldConnect) {
        await joinOperatorPresence(id);
      } else {
        await releaseOperatorPresence();
      }
      await renderOperatorConversation(id, null, input.value, shouldConnect);
      showToast(
        shouldConnect ? "You’re connected and answering." : "Disconnected. AI is answering.",
      );
    } catch (error) {
      if (shouldConnect) await releaseOperatorPresence();
      toggle.checked = !shouldConnect;
      toggle.disabled = false;
      showToast(error.message);
    }
  });
  const form = panel.querySelector("#operator-composer");
  const input = form.querySelector("textarea");
  const sendButton = form.querySelector("button");
  input.value = draft;
  let typingActive = false;
  let lastTypingSignal = 0;
  let typingIdleTimer = null;
  let typingRequests = Promise.resolve();

  function queueTypingUpdate(typing) {
    typingRequests = typingRequests
      .catch(() => null)
      .then(() => updateOperatorTyping(id, typing));
    return typingRequests;
  }

  function stopOperatorTyping() {
    window.clearTimeout(typingIdleTimer);
    typingIdleTimer = null;
    if (!typingActive) return typingRequests;
    typingActive = false;
    return queueTypingUpdate(false);
  }

  function signalOperatorTyping() {
    if (!operatorConnected || !input.value.trim()) {
      stopOperatorTyping().catch(() => {});
      return;
    }
    const now = Date.now();
    if (!typingActive || now - lastTypingSignal >= 1300) {
      typingActive = true;
      lastTypingSignal = now;
      queueTypingUpdate(true).catch(() => {});
    }
    window.clearTimeout(typingIdleTimer);
    typingIdleTimer = window.setTimeout(
      () => stopOperatorTyping().catch(() => {}),
      2200,
    );
  }

  state.operatorTypingCleanup = () => {
    stopOperatorTyping().catch(() => {});
  };

  function syncOperatorSendButton() {
    sendButton.disabled = !operatorConnected || !input.value.trim();
  }

  function resizeOperatorInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 116)}px`;
  }

  resizeOperatorInput();
  syncOperatorSendButton();
  input.addEventListener("input", () => {
    resizeOperatorInput();
    syncOperatorSendButton();
    signalOperatorTyping();
  });
  input.addEventListener("blur", () => {
    stopOperatorTyping().catch(() => {});
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!operatorConnected || !content) return;
    sendButton.disabled = true;
    input.disabled = true;
    try {
      await stopOperatorTyping();
      await operatorFetch(`/api/admin/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      await renderOperatorConversation(id, null, "", true);
    } catch (error) {
      input.disabled = false;
      syncOperatorSendButton();
      showToast(error.message);
    }
  });
  if (restoreFocus && operatorConnected) input.focus();
}

async function refreshOperatorConversation() {
  if (!state.operatorSelected || !document.querySelector("#operator-chat"))
    return;
  const response = await operatorFetch(
    `/api/admin/conversations/${state.operatorSelected}/messages`,
  );
  const data = await response.json();
  const panel = document.querySelector("#operator-chat");
  const messageCountChanged =
    Number(panel.dataset.messageCount || 0) !== data.messages.length;
  const takeoverChanged =
    panel.dataset.takeover !== String(Boolean(data.takeover));
  const locationChanged =
    panel.dataset.location !== (data.visitor?.location || "");
  const studioTyping = panel.querySelector("#studio-typing");
  if (studioTyping) studioTyping.hidden = !data.visitor_typing;
  panel.dataset.visitorTyping = String(Boolean(data.visitor_typing));
  if (messageCountChanged || takeoverChanged || locationChanged) {
    await renderOperatorConversation(state.operatorSelected, data);
  }
}

async function refreshOperatorInbox() {
  const list = document.querySelector(".conversation-list");
  const count = document.querySelector(".inbox-panel > header > span");
  if (!list || !count) return;
  const response = await operatorFetch("/api/admin/conversations");
  const { conversations } = await response.json();
  count.textContent = String(conversations.length);
  list.innerHTML = conversationListMarkup(conversations);
  bindConversationButtons(list);
}

async function renderStudioPhotos() {
  const body = document.querySelector("#studio-body");
  const response = await operatorFetch("/api/admin/photos");
  const { photos } = await response.json();
  body.innerHTML = `<section class="photo-studio">
    <header><div><p class="eyebrow">The dump</p><h2>Add a moment</h2><p>JPEG, PNG, or WebP. It’ll be resized and optimized automatically.</p></div></header>
    <form id="photo-upload" class="photo-upload">
      <label class="file-drop" for="photo-file">${icons.upload}<span><strong>Choose an image</strong><small>up to 12 MB</small></span><input id="photo-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
      <label>Caption <input name="caption" maxlength="120" placeholder="Optional, keep it short" /></label>
      <button type="submit">Add to dump</button>
    </form>
    <div class="photo-manager">
      <div class="photo-manager-title"><div><h3>On the wall</h3><p>Drag to reorder, or use the arrow buttons.</p></div><span>${photos.length} image${photos.length === 1 ? "" : "s"}</span></div>
      <div class="photo-manager-grid">
        ${photos.map((photo, index) => `<article data-photo-id="${photo.id}">
          <div class="photo-manager-preview"><img src="${escapeHtml(photo.thumbnail_url || photo.url)}" alt="" /><button class="photo-drag-handle" type="button" draggable="true" data-drag-handle aria-label="Drag to reorder image">Drag</button></div>
          <div class="photo-manager-editor">
            <input value="${escapeHtml(photo.caption)}" maxlength="120" aria-label="Photo caption" />
            <div class="photo-manager-actions">
              <span class="photo-order-label">${String(index + 1).padStart(2, "0")}</span>
              <button type="button" data-move-photo="-1" aria-label="Move image earlier" title="Move earlier">←</button>
              <button type="button" data-move-photo="1" aria-label="Move image later" title="Move later">→</button>
              <span class="photo-manager-likes" title="Likes">${photo.like_count}${icons.heart}</span>
              <button type="button" data-save-caption>Save</button>
              <button type="button" class="danger" data-delete-photo>Remove</button>
            </div>
          </div>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
  const form = body.querySelector("#photo-upload");
  const fileInput = form.querySelector("#photo-file");
  fileInput.addEventListener("change", () => {
    const label = form.querySelector(".file-drop strong");
    label.textContent = fileInput.files[0]?.name || "Choose an image";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Adding…";
    try {
      const formData = new FormData(form);
      await operatorFetch("/api/admin/photos", {
        method: "POST",
        body: formData,
      });
      showToast("Added to the dump.");
      await renderStudioPhotos();
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
      button.textContent = "Add to dump";
    }
  });
  const managerGrid = body.querySelector(".photo-manager-grid");

  function orderedPhotoIds() {
    return [...managerGrid.querySelectorAll("[data-photo-id]")].map(
      (card) => card.dataset.photoId,
    );
  }

  function updatePhotoPositions() {
    const cards = [...managerGrid.querySelectorAll("[data-photo-id]")];
    cards.forEach((card, index) => {
      card.querySelector(".photo-order-label").textContent = String(
        index + 1,
      ).padStart(2, "0");
      card.querySelector('[data-move-photo="-1"]').disabled = index === 0;
      card.querySelector('[data-move-photo="1"]').disabled =
        index === cards.length - 1;
    });
  }

  async function persistPhotoOrder() {
    await operatorFetch("/api/admin/photos/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_ids: orderedPhotoIds() }),
    });
    showToast("Dump order saved.");
  }

  let draggedCard = null;
  let orderBeforeDrag = "";
  managerGrid.addEventListener("dragover", (event) => {
    if (!draggedCard) return;
    event.preventDefault();
    const target = event.target.closest("[data-photo-id]");
    if (!target || target === draggedCard) return;
    const bounds = target.getBoundingClientRect();
    const after =
      event.clientY > bounds.top + bounds.height / 2 ||
      (Math.abs(event.clientY - (bounds.top + bounds.height / 2)) <
        bounds.height / 3 &&
        event.clientX > bounds.left + bounds.width / 2);
    managerGrid.insertBefore(draggedCard, after ? target.nextSibling : target);
    updatePhotoPositions();
  });

  body.querySelectorAll("[data-photo-id]").forEach((card) => {
    const id = card.dataset.photoId;
    const dragHandle = card.querySelector("[data-drag-handle]");
    dragHandle.addEventListener("dragstart", (event) => {
      draggedCard = card;
      orderBeforeDrag = orderedPhotoIds().join(",");
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    });
    dragHandle.addEventListener("dragend", async () => {
      card.classList.remove("is-dragging");
      draggedCard = null;
      if (orderBeforeDrag === orderedPhotoIds().join(",")) return;
      try {
        await persistPhotoOrder();
      } catch (error) {
        showToast(error.message);
        await renderStudioPhotos();
      }
    });
    card.querySelectorAll("[data-move-photo]").forEach((button) => {
      button.addEventListener("click", async () => {
        const cards = [...managerGrid.querySelectorAll("[data-photo-id]")];
        const currentIndex = cards.indexOf(card);
        const nextIndex = currentIndex + Number(button.dataset.movePhoto);
        if (nextIndex < 0 || nextIndex >= cards.length) return;
        if (nextIndex < currentIndex) {
          managerGrid.insertBefore(card, cards[nextIndex]);
        } else {
          managerGrid.insertBefore(card, cards[nextIndex].nextSibling);
        }
        updatePhotoPositions();
        try {
          await persistPhotoOrder();
        } catch (error) {
          showToast(error.message);
          await renderStudioPhotos();
        }
      });
    });
    card
      .querySelector("[data-save-caption]")
      .addEventListener("click", async () => {
        const caption = card.querySelector("input").value;
        await operatorFetch(`/api/admin/photos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption }),
        });
        showToast("Caption saved.");
      });
    card
      .querySelector("[data-delete-photo]")
      .addEventListener("click", async () => {
        if (!confirm("Remove this image from the dump?")) return;
        await operatorFetch(`/api/admin/photos/${id}`, { method: "DELETE" });
        showToast("Image removed.");
        await renderStudioPhotos();
      });
  });
  updatePhotoPositions();
}

window.addEventListener("popstate", renderRoute);
renderRoute();
