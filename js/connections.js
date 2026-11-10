(async function () {
  const { api, post, requireAuth, fillNav, escapeHtml } = window.SkillSwap;

  const auth = await requireAuth(true);
  if (!auth) return;
  fillNav();

  const me = auth.user.id;
  const reqSection = document.getElementById("requestsSection");
  const reqGrid = document.getElementById("reqGrid");
  const grid = document.getElementById("connGrid");

  // "Pending requests": students who asked to connect with me
  async function loadRequests() {
    const res = await api("/requests/" + me);
    const list = res.ok ? res.data.filter((r) => r.from) : [];
    reqSection.classList.toggle("hidden", !list.length);
    reqGrid.innerHTML = list
      .map((r) => {
        const p = r.from;
        return `
        <article class="card conn-card">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="muted">Sem ${escapeHtml(p.semester)} · ${escapeHtml(p.branch)}</p>
          <p class="muted" style="margin-top:10px"><strong>They teach:</strong> ${(p.teach || [])
            .map((s) => `${escapeHtml(s.name)} (${escapeHtml(s.level)})`)
            .join(", ")}</p>
          <p class="muted"><strong>They want:</strong> ${(p.learn || []).map(escapeHtml).join(", ")}</p>
          <div class="row" style="margin-top:14px">
            <button class="btn" data-accept="${escapeHtml(r._id)}">Accept</button>
            <button class="btn-outline" data-decline="${escapeHtml(r._id)}">Decline</button>
          </div>
        </article>
      `;
      })
      .join("");
  }

  // "Connected peers": accepted connections, each with a Chat button
  async function loadConnections() {
    const res = await api("/connections/" + me);
    // each item from the backend looks like { connectedAt, peer: {...profile} }
    const mine = res.ok ? res.data.filter((c) => c.peer) : [];

    if (!mine.length) {
      grid.innerHTML =
        '<div class="empty">No connections yet. Use <a href="find-peer.html"><strong>Find a peer</strong></a> to send a request.</div>';
      return;
    }
    grid.innerHTML = mine
      .map((c) => {
        const peer = c.peer;
        const when = c.connectedAt
          ? new Date(c.connectedAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
          : "";
        return `
        <article class="card conn-card">
          <h3>${escapeHtml(peer.name)}</h3>
          <p class="muted">Sem ${escapeHtml(peer.semester)} · ${escapeHtml(peer.branch)}</p>
          <p class="muted" style="margin-top:10px"><strong>They teach:</strong> ${(peer.teach || [])
            .map((s) => `${escapeHtml(s.name)} (${escapeHtml(s.level)})`)
            .join(", ")}</p>
          <p class="muted"><strong>They want:</strong> ${(peer.learn || []).map(escapeHtml).join(", ")}</p>
          <p class="muted" style="margin-top:12px">Connected ${when}</p>
          <a class="btn" style="display:inline-block;margin-top:12px" href="chat.html?peer=${encodeURIComponent(peer.userId)}">Chat</a>
        </article>
      `;
      })
      .join("");
  }

  // Accept / Decline buttons
  reqGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-accept], button[data-decline]");
    if (!btn) return;
    const acceptId = btn.getAttribute("data-accept");
    const id = acceptId || btn.getAttribute("data-decline");
    btn.disabled = true;
    const res = await post("/requests/" + id + (acceptId ? "/accept" : "/decline"), { userId: me });
    if (!res.ok) {
      btn.disabled = false;
      alert("Failed (" + res.status + "): " + ((res.data && res.data.error) || "Something went wrong. Try again."));
      return;
    }
    await loadRequests();
    await loadConnections();
  });

  loadRequests();
  loadConnections();
})();