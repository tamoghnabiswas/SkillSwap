// On Live Server / a local file the backend is on localhost:3000.
// When the site is served by the backend itself (or hosted online), "/api" is enough.
const usingLiveServer = ["5500", "5501", "5502"].includes(location.port) || location.protocol === "file:";
const API = usingLiveServer ? "http://localhost:3000/api" : "/api";
const SERVER = usingLiveServer ? "http://localhost:3000" : "";
const SESSION_KEY = "skillswap_session";

const SKILL_SUGGESTIONS = [
  "Python",
  "Java",
  "C++",
  "Web Development",
  "UI/UX",
  "Machine Learning",
  "Data Analysis",
  "Public Speaking",
  "Graphic Design",
  "Guitar",
  "Photography",
  "Video Editing",
  "Excel",
  "DSA",
  "App Development",
  "Content Writing",
  "Chess",
  "French",
  "Spanish",
  "Accounting",
];

// ---------- talking to the backend ----------
async function api(path, options) {
  try {
    const res = await fetch(API + path, options);
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Can't reach the server. Is `node server.js` running?" },
    };
  }
}

function post(path, body) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- who is logged in (only the id/name/email is kept in the browser) ----------
function session() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// Checks login (and optionally that a profile exists). Returns { user, profile } or null.
async function requireAuth(needProfile) {
  const user = session();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  const res = await api("/profile/" + user.id);
  if (res.status === 0) {
    alert(res.data.error);
    return null;
  }
  const profile = res.ok ? res.data : null;
  if (needProfile && !profile) {
    window.location.href = "details.html";
    return null;
  }
  return { user, profile };
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

function fillNav() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
}

function skillMatchScore(me, peer) {
  const want = new Set((me.learn || []).map((s) => s.toLowerCase()));
  const can = new Set((me.teach || []).map((s) => s.name.toLowerCase()));
  let score = 0;
  (peer.teach || []).forEach((s) => {
    if (want.has(s.name.toLowerCase())) score += 3;
  });
  (peer.learn || []).forEach((s) => {
    if (can.has(s.toLowerCase())) score += 2;
  });
  return score;
}

function switchAuth(mode) {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  if (!loginTab || !signupTab || !loginForm || !signupForm) return;
  const signup = mode === "signup";
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  loginForm.classList.toggle("hidden", signup);
  signupForm.classList.toggle("hidden", !signup);
}

async function handleLogin(event) {
  if (event) event.preventDefault();
  const form = document.getElementById("loginForm");
  const data = Object.fromEntries(new FormData(form));
  const note = document.getElementById("loginNote");
  if (note) note.textContent = "";
  const res = await post("/login", { email: data.email.trim(), password: data.password });
  if (!res.ok) {
    if (note) note.textContent = (res.data && res.data.error) || "Login failed.";
    return false;
  }
  saveSession(res.data);
  const profile = await api("/profile/" + res.data.id);
  window.location.href = profile.ok ? "home.html" : "details.html";
  return false;
}

async function handleSignup(event) {
  if (event) event.preventDefault();
  const form = document.getElementById("signupForm");
  const data = Object.fromEntries(new FormData(form));
  const note = document.getElementById("signupNote");
  if (note) note.textContent = "";
  const res = await post("/signup", {
    name: data.name.trim(),
    email: data.email.trim(),
    password: data.password,
  });
  if (!res.ok) {
    if (note) note.textContent = (res.data && res.data.error) || "Signup failed.";
    return false;
  }
  saveSession(res.data);
  window.location.href = "details.html";
  return false;
}

let authPageReady = false;
async function initAuthPage() {
  if (authPageReady) return;
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  if (!loginForm || !signupForm) return;
  authPageReady = true;
  const user = session();
  if (user) {
    const profile = await api("/profile/" + user.id);
    if (profile.status !== 0) window.location.href = profile.ok ? "home.html" : "details.html";
  }
}

window.SkillSwap = {
  SERVER,
  SKILL_SUGGESTIONS,
  api,
  post,
  session,
  initials,
  escapeHtml,
  requireAuth,
  logout,
  fillNav,
  skillMatchScore,
  switchAuth,
  handleLogin,
  handleSignup,
  initAuthPage,
};
window.switchAuth = switchAuth;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;

document.addEventListener("DOMContentLoaded", initAuthPage);
if (document.readyState !== "loading") initAuthPage();