(async function () {
const { api, post, requireAuth, fillNav, escapeHtml, SERVER } = window.SkillSwap;

const auth = await requireAuth(true);
if (!auth) return;
fillNav();

const me = auth.user.id;
// the other student's id comes from the link: chat.html?peer=<id>
const peerId = new URLSearchParams(window.location.search).get("peer");
if (!peerId) {
  window.location.href = "connections.html";
  return;
}

const box = document.getElementById("chatMessages");
const form = document.getElementById("chatForm");
const textInput = document.getElementById("textInput");
const fileInput = document.getElementById("fileInput");
const fileLabel = document.getElementById("fileLabel");
const note = document.getElementById("chatNote");

// show the other student's name at the top
const peerRes = await api("/profile/" + peerId);
if (peerRes.ok) {
  document.getElementById("chatTitle").textContent = "Chat with " + peerRes.data.name;
  document.getElementById("chatSub").textContent =
    "Sem " + peerRes.data.semester + " · " + peerRes.data.branch;
}

// draw one message bubble (mine on the right, theirs on the left)
function bubble(m) {
  const mine = m.senderId === me;
  let file = "";
  if (m.fileUrl) {
    const url = SERVER + m.fileUrl;
    file =
      m.fileType && m.fileType.startsWith("image/")
        ? `<a href="${url}" target="_blank"><img src="${url}" alt="${escapeHtml(m.fileName)}" /></a>`
        : `<a class="file-link" href="${url}" target="_blank">${escapeHtml(m.fileName)}</a>`;
  }
  const call = m.callRoom
    ? `<button class="btn" type="button" data-call="${escapeHtml(m._id)}">📹 Join video call</button>`
    : "";
  const sent = new Date(m.sentAt);
  const time = isNaN(sent) ? "" : sent.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `
    <div class="msg ${mine ? "mine" : "theirs"}">
      ${file}
      ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ""}
      ${call}
      <div class="time">${time}</div>
    </div>`;
}

let lastCount = -1;
let timer = null;

// ask the server for the whole conversation, redraw only if something is new
async function loadMessages() {
  const res = await api("/messages/" + me + "/" + peerId);
  if (!res.ok) {
    // not connected (or server down): stop checking
    box.innerHTML = `<div class="empty">${escapeHtml((res.data && res.data.error) || "Could not load the chat.")}</div>`;
    clearInterval(timer);
    return;
  }
  if (res.data.length === lastCount) return;
  lastCount = res.data.length;
  box.innerHTML = res.data.length
    ? res.data.map(bubble).join("")
    : '<div class="empty">No messages yet. Say hi!</div>';
  box.scrollTop = box.scrollHeight; // jump to the newest message
}

// show the chosen file's name under the box
fileInput.addEventListener("change", () => {
  fileLabel.textContent = fileInput.files[0] ? "Attached: " + fileInput.files[0].name : "";
});

// Send button: text and/or a file go to the server together
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  note.textContent = "";
  const text = textInput.value.trim();
  const file = fileInput.files[0];
  if (!text && !file) return;

  const data = new FormData();
  data.append("senderId", me);
  data.append("receiverId", peerId);
  data.append("text", text);
  if (file) data.append("file", file);

  const res = await api("/messages", { method: "POST", body: data });
  if (!res.ok) {
    note.textContent = (res.data && res.data.error) || "Could not send. Try again.";
    return;
  }
  textInput.value = "";
  fileInput.value = "";
  fileLabel.textContent = "";
  loadMessages();
});

// ---------- video call (Jitsi) ----------
const callBox = document.getElementById("callBox");
let jitsiApi = null;

function openJitsi(domain, room, displayName) {
  if (typeof JitsiMeetExternalAPI === "undefined") {
    note.textContent = "Video call could not load. Check your internet and refresh.";
    return;
  }
  callBox.classList.remove("hidden");
  jitsiApi = new JitsiMeetExternalAPI(domain, {
    roomName: room,
    parentNode: document.getElementById("jitsiContainer"),
    width: "100%",
    height: "100%",
    userInfo: { displayName },
    configOverwrite: { prejoinPageEnabled: false },
  });
  jitsiApi.addListener("readyToClose", endCall); // user hung up inside Jitsi
}

function endCall() {
  if (jitsiApi) {
    jitsiApi.dispose();
    jitsiApi = null;
  }
  callBox.classList.add("hidden");
}
document.getElementById("endCallBtn").addEventListener("click", endCall);

async function startCall() {
  note.textContent = "";
  const res = await post("/calls/start", { userId: me, peerId });
  if (!res.ok) {
    note.textContent = (res.data && res.data.error) || "Could not start the call.";
    return;
  }
  openJitsi(res.data.domain, res.data.room, auth.user.name || "Student");
  loadMessages(); // shows the invite in the chat
}

async function joinCall(messageId) {
  note.textContent = "";
  const res = await api("/calls/" + messageId + "/join?userId=" + encodeURIComponent(me));
  if (!res.ok) {
    note.textContent = (res.data && res.data.error) || "Could not join the call.";
    return;
  }
  openJitsi(res.data.domain, res.data.room, res.data.displayName);
}

document.getElementById("callBtn").addEventListener("click", startCall);

// clicking "Join video call" inside a message bubble
box.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-call]");
  if (btn) joinCall(btn.getAttribute("data-call"));
});

// came from the Connections page's Video call button: start the call right away
if (new URLSearchParams(window.location.search).get("call") === "1") {
  history.replaceState(null, "", "chat.html?peer=" + encodeURIComponent(peerId)); // so a refresh doesn't call again
  startCall();
}

loadMessages();
// check for new messages every 3 seconds
timer = setInterval(loadMessages, 3000);
})();