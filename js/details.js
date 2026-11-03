(async function () {
const { SKILL_SUGGESTIONS, post, requireAuth, fillNav, escapeHtml } = window.SkillSwap;

const auth = await requireAuth(false);
if (!auth) return;
fillNav();

const learn = [];
const teach = [];
const user = auth.user;
const existing = auth.profile;

document.getElementById("skillList").innerHTML = SKILL_SUGGESTIONS.map(
  (s) => `<option value="${escapeHtml(s)}"></option>`
).join("");

document.getElementById("nameInput").value = existing?.name || user.name || "";
if (existing?.semester) document.getElementById("semesterInput").value = existing.semester;
if (existing?.branch) document.getElementById("branchInput").value = existing.branch;
if (existing?.learn) learn.push(...existing.learn);
if (existing?.teach) teach.push(...existing.teach);

function renderChips() {
  document.getElementById("learnChips").innerHTML = learn
    .map(
      (s, i) =>
        `<span class="chip">${escapeHtml(s)}<button type="button" data-learn="${i}" aria-label="Remove">×</button></span>`
    )
    .join("");
  document.getElementById("teachChips").innerHTML = teach
    .map(
      (s, i) =>
        `<span class="chip">${escapeHtml(s.name)} <span class="level">${escapeHtml(s.level)}</span><button type="button" data-teach="${i}" aria-label="Remove">×</button></span>`
    )
    .join("");
}

renderChips();

document.getElementById("addLearn").addEventListener("click", () => {
  const input = document.getElementById("learnInput");
  const value = input.value.trim();
  if (!value) return;
  if (!learn.some((s) => s.toLowerCase() === value.toLowerCase())) learn.push(value);
  input.value = "";
  renderChips();
});

document.getElementById("addTeach").addEventListener("click", () => {
  const input = document.getElementById("teachInput");
  const value = input.value.trim();
  const level = document.getElementById("levelInput").value;
  if (!value) return;
  if (!teach.some((s) => s.name.toLowerCase() === value.toLowerCase())) {
    teach.push({ name: value, level });
  }
  input.value = "";
  renderChips();
});

["learnInput", "teachInput"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    document.getElementById(id === "learnInput" ? "addLearn" : "addTeach").click();
  });
});

document.getElementById("learnChips").addEventListener("click", (e) => {
  const i = e.target.getAttribute("data-learn");
  if (i == null) return;
  learn.splice(Number(i), 1);
  renderChips();
});

document.getElementById("teachChips").addEventListener("click", (e) => {
  const i = e.target.getAttribute("data-teach");
  if (i == null) return;
  teach.splice(Number(i), 1);
  renderChips();
});

document.getElementById("detailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("detailsNote");
  if (!learn.length || !teach.length) {
    note.textContent = "Add at least one skill to learn and one skill you can teach.";
    return;
  }
  note.textContent = "Saving...";
  const res = await post("/profile", {
    userId: user.id,
    name: document.getElementById("nameInput").value.trim(),
    semester: document.getElementById("semesterInput").value,
    branch: document.getElementById("branchInput").value,
    learn: [...learn],
    teach: [...teach],
  });
  if (!res.ok) {
    note.textContent = (res.data && res.data.error) || "Could not save. Try again.";
    return;
  }
  window.location.href = "home.html";
});
})();
