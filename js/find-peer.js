(async function () {
const { api, post, requireAuth, fillNav, skillMatchScore, escapeHtml } = window.SkillSwap;

const auth = await requireAuth(true);
if (!auth) return;
fillNav();

const { user, profile } = auth;
const grid = document.getElementById("peerGrid");

// ask the backend: who teaches something I want to learn? + who am I connected to? + who have I sent a request to?
const [peersRes, connRes, sentRes] = await Promise.all([
  api("/find-peers/" + user.id),
  api("/connections/" + user.id),
  api("/sent-requests/" + user.id),
]);

if (!peersRes.ok) {
  grid.innerHTML = `<div class="empty">${escapeHtml((peersRes.data && peersRes.data.error) || "Could not load peers.")}</div>`;
  return;
}

const connectedIds = new Set(
  (connRes.ok ? connRes.data : []).filter((c) => c.peer).map((c) => c.peer.userId)
);

// requests I sent that the other student has not accepted yet
const requestedIds = new Set(
  (sentRes.ok ? sentRes.data : [])
    .filter((r) => r.status === "pending")
    .map((r) => r.peerId)
);

const ranked = peersRes.data
  .map((peer) => ({ ...peer, score: skillMatchScore(profile, peer) }))
  .sort((a, b) => b.score - a.score);

function render() {
  if (!ranked.length) {
    grid.innerHTML =
      '<div class="empty">No close matches yet. Try adding more skills on your profile, or ask a friend to sign up.</div>';
    return;
  }
  grid.innerHTML = ranked
    .map((peer) => {
      const done = connectedIds.has(peer.userId);
      const waiting = requestedIds.has(peer.userId);
      const label = done ? "Connected" : waiting ? "Request sent" : "Connect";
      return `
        <article class="card peer-card">
          <h3>${escapeHtml(peer.name)}</h3>
          <p class="muted">Sem ${escapeHtml(peer.semester)} · ${escapeHtml(peer.branch)}</p>
          <span class="match">Match score ${peer.score}</span>
          <p class="muted"><strong>Teaches:</strong> ${peer.teach.map((s) => `${escapeHtml(s.name)} (${escapeHtml(s.level)})`).join(", ")}</p>
          <p class="muted"><strong>Wants:</strong> ${peer.learn.map(escapeHtml).join(", ")}</p>
          <button class="btn" style="margin-top:12px" data-connect="${escapeHtml(peer.userId)}" ${done || waiting ? "disabled" : ""}>
            ${label}
          </button>
        </article>
      `;
    })
    .join("");
}

render();

grid.addEventListener("click", async (e) => {
  const id = e.target.getAttribute("data-connect");
  if (!id || connectedIds.has(id) || requestedIds.has(id)) return;
  const res = await post("/connect", { userId: user.id, peerId: id });
  if (!res.ok) {
    alert((res.data && res.data.error) || "Could not connect. Try again.");
    return;
  }
  // if they had already asked me, the server connects us straight away
  if (res.data.status === "accepted") connectedIds.add(id);
  else requestedIds.add(id);
  render();
});
})();
