(async function () {
const { api, requireAuth, fillNav, escapeHtml, SERVER } = window.SkillSwap;

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
  const mine = m.from === me;
  let file = "";
  if (m.fileUrl) {
    const url = SERVER + m.fileUrl;
    file =
      m.fileType && m.fileType.startsWith("image/")
        ? `<a href="${url}" target="_blank"><img src="${url}" alt="${escapeHtml(m.fileName)}" /></a>`
        : `<a class="file-link" href="${url}" target="_blank">${escapeHtml(m.fileName)}</a>`;
  }
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `
    <div class="msg ${mine ? "mine" : "theirs"}">
      ${file}
      ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ""}
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
  data.append("from", me);
  data.append("to", peerId);
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

loadMessages();
// check for new messages every 3 seconds
timer = setInterval(loadMessages, 3000);
})();
