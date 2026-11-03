(async function () {
const { api, requireAuth, fillNav, initials, escapeHtml } = window.SkillSwap;

const auth = await requireAuth(true);
if (!auth) return;
fillNav();

const { profile } = auth;
document.querySelector(".page-title").textContent = `Welcome, ${profile.name.split(" ")[0]}.`;

document.getElementById("profileCard").innerHTML = `
  <div class="row" style="align-items:center;margin-bottom:14px">
    <div class="avatar">${initials(profile.name)}</div>
    <div>
      <h2 style="margin:0;font-family:var(--font-display);letter-spacing:-0.03em">${escapeHtml(profile.name)}</h2>
      <p class="meta">Semester ${escapeHtml(profile.semester)} · ${escapeHtml(profile.branch)}</p>
    </div>
  </div>
  <p><strong>Wants to learn</strong></p>
  <div class="chips">${profile.learn.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")}</div>
  <p style="margin-top:16px"><strong>Can impart</strong></p>
  <div class="chips">${profile.teach
    .map((s) => `<span class="chip">${escapeHtml(s.name)} <span class="level">${escapeHtml(s.level)}</span></span>`)
    .join("")}</div>
`;

// tell the student if someone is waiting for their reply
const reqRes = await api("/requests/" + auth.user.id);
if (reqRes.ok && reqRes.data.length) {
  document.getElementById("connLink").textContent = `Your connections (${reqRes.data.length} new)`;
}
})();
