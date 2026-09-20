// ═══════════════════════════════════════
// Globals
// ═══════════════════════════════════════
let TOKEN = localStorage.getItem("token");
let isRegister = false;
let currentUser = null;
let userSettings = null;
let currentConvId = null;
let currentConvMeta = null;
let attachedFiles = [];
let recognition = null;
let currentFilter = "all";
let currentSearch = "";
let abortController = null;

const $ = (id) => document.getElementById(id);

// ═══════════════════════════════════════
// Toast
// ═══════════════════════════════════════
function toast(msg, type = "") {
  let cont = document.querySelector(".toast-container");
  if (!cont) {
    cont = document.createElement("div");
    cont.className = "toast-container";
    document.body.appendChild(cont);
  }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  cont.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ═══════════════════════════════════════
// Auth Screen Toggle (فیکس اصلی)
// ═══════════════════════════════════════
function showAuth() {
  const auth = $("authScreen");
  const main = $("mainApp");
  if (auth) auth.classList.remove("hidden");
  if (main) main.style.display = "none";
}

function hideAuth() {
  const auth = $("authScreen");
  const main = $("mainApp");
  if (auth) auth.classList.add("hidden");
  if (main) main.style.display = "flex";
}

const origFetch = window.fetch;
window.fetch = function(url, opts = {}) {
  if (typeof url === "string" && url.startsWith("/api/") && TOKEN) {
    opts.headers = opts.headers || {};
    if (opts.headers instanceof Headers) opts.headers.set("Authorization", "Bearer " + TOKEN);
    else opts.headers["Authorization"] = "Bearer " + TOKEN;
  }
  return origFetch(url, opts);
};

// ═══════════════════════════════════════
// Themes
// ═══════════════════════════════════════
const THEMES = [
  { id: "dark", name: "شبانه", bg: "#0f1117", accent: "#6c8eff" },
  { id: "light", name: "روزانه", bg: "#f6f7fb", accent: "#4f6cff" },
  { id: "ocean", name: "اقیانوس", bg: "#0a1929", accent: "#06b6d4" },
  { id: "sunset", name: "غروب", bg: "#1a0f0a", accent: "#f97316" },
  { id: "forest", name: "جنگل", bg: "#0a1410", accent: "#22c55e" },
  { id: "purple", name: "بنفش", bg: "#1a0f2e", accent: "#a855f7" },
  { id: "rose", name: "رز", bg: "#1f0f18", accent: "#f43f5e" },
  { id: "cyberpunk", name: "سایبر", bg: "#0a0a14", accent: "#ec4899" },
  { id: "coffee", name: "قهوه", bg: "#1a120b", accent: "#c084fc" },
  { id: "mono", name: "تک‌رنگ", bg: "#000000", accent: "#ffffff" },
];

function applyTheme(id) {
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem("theme", id);
}
function renderThemeGrid() {
  const grid = $("themeGrid"); if (!grid) return;
  grid.innerHTML = "";
  const cur = localStorage.getItem("theme") || "dark";
  THEMES.forEach(t => {
    const d = document.createElement("div");
    d.className = "theme-swatch" + (t.id === cur ? " active" : "");
    d.style.background = `linear-gradient(135deg, ${t.bg}, ${t.accent})`;
    d.innerHTML = `<span>${t.name}</span>`;
    d.onclick = async () => {
      applyTheme(t.id);
      renderThemeGrid();
      if (TOKEN) try {
        await fetch("/api/auth/theme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: t.id })
        });
      } catch {}
    };
    grid.appendChild(d);
  });
}
applyTheme(localStorage.getItem("theme") || "dark");

// ═══════════════════════════════════════
// Markdown + LaTeX + Mermaid
// ═══════════════════════════════════════
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        try { return hljs.highlight(code, { language: lang }).value; } catch {}
      }
      return code;
    }
  });
}

function renderMarkdown(text, targetEl) {
  let html;
  try {
    html = window.marked ? marked.parse(text) : escapeHtml(text).replace(/\n/g, "<br>");
  } catch {
    html = escapeHtml(text).replace(/\n/g, "<br>");
  }
  targetEl.innerHTML = html;

  // LaTeX
  if (window.renderMathInElement) {
    try {
      renderMathInElement(targetEl, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false
      });
    } catch {}
  }

  // Mermaid
  if (window.mermaid) {
    targetEl.querySelectorAll("code.language-mermaid").forEach(async (codeEl) => {
      const graph = codeEl.textContent;
      const id = "mermaid-" + Math.random().toString(36).slice(2);
      const container = document.createElement("div");
      container.className = "mermaid";
      container.id = id;
      codeEl.parentElement.replaceWith(container);
      try {
        const { svg } = await mermaid.render(id + "-svg", graph);
        container.innerHTML = svg;
      } catch (e) {
        container.innerHTML = `<pre>${escapeHtml(graph)}</pre>`;
      }
    });
  }

  // Code Toolbar
  targetEl.querySelectorAll("pre").forEach(pre => {
    if (pre.querySelector(".code-toolbar")) return;
    const code = pre.querySelector("code");
    if (!code) return;
    const toolbar = document.createElement("div");
    toolbar.className = "code-toolbar";
    toolbar.innerHTML = `
      <button data-act="copy">📋 کپی</button>
      <button data-act="download">⬇️ دانلود</button>
    `;
    toolbar.querySelector('[data-act="copy"]').onclick = () => {
      navigator.clipboard.writeText(code.textContent);
      toast("✅ کپی شد", "success");
    };
    toolbar.querySelector('[data-act="download"]').onclick = () => {
      const lang = (code.className.match(/language-(\w+)/) || [])[1] || "txt";
      const ext = { python: "py", javascript: "js", typescript: "ts", html: "html", css: "css", json: "json", bash: "sh" }[lang] || lang;
      const blob = new Blob([code.textContent], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `code.${ext}`;
      a.click();
      toast("✅ دانلود شد", "success");
    };
    pre.appendChild(toolbar);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// ═══════════════════════════════════════
// Check Auth
// ═══════════════════════════════════════
async function checkAuth() {
  if (!TOKEN) { showAuth(); return; }
  try {
    const r = await fetch("/api/auth/me");
    if (!r.ok) throw new Error();
    currentUser = await r.json();
    hideAuth();
    applyTheme(currentUser.theme || "dark");

    // User info
    const ui = $("userInfo");
    if (ui) {
      $("userAvatar").textContent = (currentUser.username || "?").charAt(0).toUpperCase();
      $("userName").textContent = currentUser.username;
      $("userRole").textContent = currentUser.is_admin ? "👑 ادمین" : "کاربر";
      $("userRole").className = "user-role" + (currentUser.is_admin ? " admin" : "");
    }

    try {
      userSettings = await fetch("/api/settings/user").then(r => r.json());
      applyUserSettings(userSettings);
    } catch {}

    if (currentUser.is_admin) {
      if ($("adminLink")) $("adminLink").style.display = "flex";
      if ($("openAdminSettings")) $("openAdminSettings").style.display = "flex";
      if ($("requestAdminBtn")) $("requestAdminBtn").style.display = "none";
    } else {
      if ($("adminLink")) $("adminLink").style.display = "none";
      if ($("openAdminSettings")) $("openAdminSettings").style.display = "none";
      if ($("requestAdminBtn")) $("requestAdminBtn").style.display = "flex";
      try {
        const req = await fetch("/api/auth/my-admin-request").then(r => r.ok ? r.json() : null);
        if (req && req.status === "pending" && $("requestAdminBtn")) {
          $("requestAdminBtn").innerHTML = '<span>⏳</span> در انتظار تأیید';
        }
      } catch {}
    }

    loadConversations();
  } catch {
    TOKEN = null;
    localStorage.removeItem("token");
    showAuth();
  }
}

function applyUserSettings(s) {
  if (!s) return;
  document.body.style.fontSize = s.font_size + "px";
  document.body.classList.toggle("compact", s.compact_mode);
  const ap = $("agentPanel");
  if (ap) ap.style.display = s.show_agent_timeline ? "block" : "none";
}

// ═══════════════════════════════════════
// Login / Register
// ═══════════════════════════════════════
if ($("authToggle")) {
  $("authToggle").onclick = (e) => {
    e.preventDefault();
    isRegister = !isRegister;
    $("authTitle").textContent = isRegister ? "📝 ثبت‌نام" : "🔐 ورود به حساب";
    $("authSubtitle").textContent = isRegister ? "حساب جدید بساز" : "به AI Workspace خوش آمدی";
    $("authEmailField").style.display = isRegister ? "block" : "none";
    $("authSubmitText").textContent = isRegister ? "ثبت‌نام" : "ورود به حساب";
    $("authToggleText").textContent = isRegister ? "حساب داری؟" : "حساب نداری؟";
    $("authToggle").textContent = isRegister ? "وارد شو" : "ثبت‌نام کن";
  };
}

if ($("togglePass")) {
  $("togglePass").onclick = () => {
    const p = $("authPassword");
    p.type = p.type === "password" ? "text" : "password";
    $("togglePass").textContent = p.type === "password" ? "👁️" : "🙈";
  };
}

if ($("authSubmit")) {
  $("authSubmit").onclick = async () => {
    const username = $("authUsername").value.trim();
    const password = $("authPassword").value;
    const email = $("authEmail").value.trim();
    const err = $("authError");
    err.classList.remove("show");

    if (!username || !password) {
      err.textContent = "نام کاربری و رمز عبور الزامی است";
      err.classList.add("show");
      return;
    }
    if (isRegister && !email) {
      err.textContent = "ایمیل الزامی است";
      err.classList.add("show");
      return;
    }

    $("authSubmitText").textContent = isRegister ? "در حال ثبت‌نام..." : "در حال ورود...";

    try {
      let r;
      if (isRegister) {
        r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
      } else {
        const fd = new FormData();
        fd.append("username", username);
        fd.append("password", password);
        r = await fetch("/api/auth/login", { method: "POST", body: fd });
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "خطا");
      TOKEN = data.access_token;
      localStorage.setItem("token", TOKEN);
      hideAuth();
      $("chat").innerHTML = "";
      checkAuth();
    } catch (e) {
      err.textContent = e.message;
      err.classList.add("show");
      $("authSubmitText").textContent = isRegister ? "ثبت‌نام" : "ورود به حساب";
    }
  };
}

// ═══════════════════════════════════════
// Logout
// ═══════════════════════════════════════
if ($("logoutBtn")) {
  $("logoutBtn").onclick = () => {
    TOKEN = null;
    currentUser = null;
    localStorage.removeItem("token");
    $("chat").innerHTML = "";
    $("convList").innerHTML = "";
    showAuth();
  };
}

// ═══════════════════════════════════════
// Sidebar
// ═══════════════════════════════════════
if ($("menuBtn")) $("menuBtn").onclick = () => $("sidebar").classList.toggle("hidden");
if ($("closeSidebarMobile")) $("closeSidebarMobile").onclick = () => $("sidebar").classList.add("hidden");

if ($("searchInput")) {
  $("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    if ($("clearSearch")) $("clearSearch").style.display = currentSearch ? "block" : "none";
    loadConversations();
  });
}
if ($("clearSearch")) {
  $("clearSearch").onclick = () => {
    $("searchInput").value = "";
    currentSearch = "";
    $("clearSearch").style.display = "none";
    loadConversations();
  };
}

document.querySelectorAll(".filter-tab").forEach(t => {
  t.onclick = () => {
    document.querySelectorAll(".filter-tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    currentFilter = t.dataset.filter;
    loadConversations();
  };
});

// ═══════════════════════════════════════
// Conversations
// ═══════════════════════════════════════
async function loadConversations() {
  try {
    const params = new URLSearchParams();
    if (currentFilter === "archived") params.set("archived", "true");
    if (currentFilter === "favorite") params.set("favorite", "true");
    if (currentSearch) params.set("q", currentSearch);

    const list = await fetch("/api/chat/conversations?" + params.toString()).then(r => r.json());
    const el = $("convList");
    el.innerHTML = "";

    let filtered = list;
    if (currentFilter === "pinned") filtered = list.filter(c => c.pinned);

    if (!filtered.length) {
      el.innerHTML = `<div style="padding:20px;text-align:center;font-size:12px;color:var(--fg2)">گفتگویی یافت نشد</div>`;
      return;
    }

    filtered.forEach(c => {
      const d = document.createElement("div");
      d.className = "conv-item" + (c.id === currentConvId ? " active" : "");
      const icons = [];
      if (c.pinned) icons.push("📌");
      if (c.favorite) icons.push("⭐");
      if (c.archived) icons.push("🗄️");
      d.innerHTML = `
        ${icons.length ? `<span class="conv-icons">${icons.join("")}</span>` : ""}
        <span class="conv-title">${escapeHtml(c.title)}</span>
        <button class="del" title="حذف">✕</button>
      `;
      d.onclick = (e) => {
        if (e.target.classList.contains("del")) {
          e.stopPropagation();
          deleteConv(c.id);
          return;
        }
        openConversation(c.id);
      };
      el.appendChild(d);
    });
  } catch (e) {
    console.error("loadConversations error:", e);
  }
}

async function deleteConv(id) {
  if (!confirm("مطمئنی می‌خوای این گفتگو رو حذف کنی؟")) return;
  await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
  if (id === currentConvId) {
    currentConvId = null;
    currentConvMeta = null;
    $("chat").innerHTML = "";
    showWelcomeScreen();
    updateChatHeader();
  }
  loadConversations();
  toast("🗑️ گفتگو حذف شد", "success");
}

async function openConversation(id) {
  currentConvId = id;
  try {
    const convs = await fetch("/api/chat/conversations").then(r => r.json());
    currentConvMeta = convs.find(c => c.id === id);
    const msgs = await fetch(`/api/chat/conversations/${id}/messages`).then(r => r.json());
    $("chat").innerHTML = "";
    if (!msgs.length) {
      showWelcomeScreen();
    } else {
      msgs.forEach(m => {
        addMessage(m.role, m.content, { id: m.id, edited: m.edited, bookmarked: m.bookmarked });
      });
    }
    updateChatHeader();
    loadConversations();
    $("sidebar").classList.add("hidden");
  } catch (e) {
    console.error("openConversation error:", e);
  }
}

if ($("newChat")) {
  $("newChat").onclick = () => {
    currentConvId = null;
    currentConvMeta = null;
    $("chat").innerHTML = "";
    showWelcomeScreen();
    updateChatHeader();
    loadConversations();
  };
}

function showWelcomeScreen() {
  $("chat").innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-icon">🧠</div>
      <h2 class="welcome-title">به AI Workspace خوش آمدی!</h2>
      <p class="welcome-subtitle">دستیار هوشمند با قابلیت Agent Loop، حافظه‌ی بلندمدت و پشتیبانی از چند Provider</p>
      <div class="welcome-features">
        <div class="welcome-card" data-prompt="یک کد Python برای مرتب‌سازی سریع بنویس">
          <div class="welcome-card-icon">💻</div>
          <div class="welcome-card-title">کدنویسی</div>
          <div class="welcome-card-desc">سوال برنامه‌نویسی بپرس</div>
        </div>
        <div class="welcome-card" data-prompt="درباره هوش مصنوعی توضیح بده">
          <div class="welcome-card-icon">📚</div>
          <div class="welcome-card-title">تحقیق</div>
          <div class="welcome-card-desc">درباره هر موضوعی بپرس</div>
        </div>
        <div class="welcome-card" data-prompt="یک ایده برای پروژه جدید بده">
          <div class="welcome-card-icon">💡</div>
          <div class="welcome-card-title">ایده</div>
          <div class="welcome-card-desc">ایده‌پردازی و خلاقیت</div>
        </div>
        <div class="welcome-card" data-prompt="یک متن اداری حرفه‌ای بنویس">
          <div class="welcome-card-icon">✍️</div>
          <div class="welcome-card-title">نویسندگی</div>
          <div class="welcome-card-desc">متن حرفه‌ای بنویس</div>
        </div>
      </div>
      <div class="welcome-hint">
        💡 می‌تونی با <kbd>Ctrl</kbd> + <kbd>K</kbd> پالت فرمان‌ها رو باز کنی
      </div>
    </div>
  `;
  document.querySelectorAll(".welcome-card").forEach(card => {
    card.onclick = () => {
      $("input").value = card.dataset.prompt || "";
      autoResize();
      $("input").focus();
    };
  });
}

function updateChatHeader() {
  if (currentConvId && currentConvMeta) {
    $("chatTitle").textContent = currentConvMeta.title;
    if ($("chatSubtitle")) $("chatSubtitle").textContent = "📌 فعال";
    if ($("chatActions")) $("chatActions").style.display = "flex";
    if ($("pinChat")) $("pinChat").classList.toggle("active", currentConvMeta.pinned);
    if ($("favChat")) $("favChat").classList.toggle("active", currentConvMeta.favorite);
    if ($("archiveChat")) $("archiveChat").classList.toggle("active", currentConvMeta.archived);
  } else {
    $("chatTitle").textContent = "🧠 AI Workspace";
    if ($("chatSubtitle")) $("chatSubtitle").textContent = "شروع کن...";
    if ($("chatActions")) $("chatActions").style.display = "none";
  }
}

// ═══════════════════════════════════════
// Chat Actions
// ═══════════════════════════════════════
async function patchConversation(data) {
  if (!currentConvId) return;
  const r = await fetch(`/api/chat/conversations/${currentConvId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (r.ok) {
    currentConvMeta = await r.json();
    updateChatHeader();
    loadConversations();
  }
}

if ($("pinChat")) $("pinChat").onclick = () => currentConvMeta && patchConversation({ pinned: !currentConvMeta.pinned });
if ($("favChat")) $("favChat").onclick = () => currentConvMeta && patchConversation({ favorite: !currentConvMeta.favorite });
if ($("archiveChat")) $("archiveChat").onclick = () => currentConvMeta && patchConversation({ archived: !currentConvMeta.archived });

if ($("renameChat")) {
  $("renameChat").onclick = () => {
    if (!currentConvMeta) return;
    const newTitle = prompt("نام جدید:", currentConvMeta.title);
    if (newTitle && newTitle.trim()) patchConversation({ title: newTitle.trim() });
  };
}

if ($("autoNameChat")) {
  $("autoNameChat").onclick = async () => {
    if (!currentConvId) return;
    toast("⏳ در حال تولید نام...");
    const r = await fetch(`/api/chat/conversations/${currentConvId}/auto-name`, { method: "POST" });
    if (r.ok) {
      currentConvMeta = await r.json();
      updateChatHeader();
      loadConversations();
      toast("✅ نام تولید شد", "success");
    }
  };
}

if ($("duplicateChat")) {
  $("duplicateChat").onclick = async () => {
    if (!currentConvId) return;
    const r = await fetch(`/api/chat/conversations/${currentConvId}/duplicate`, { method: "POST" });
    if (r.ok) {
      loadConversations();
      toast("📋 کپی شد", "success");
    }
  };
}

if ($("tagChat")) {
  $("tagChat").onclick = () => {
    if (!currentConvMeta) return;
    $("tagInput").value = currentConvMeta.tags || "";
    renderTagSuggestions();
    $("tagModal").classList.add("open");
  };
}

function renderTagSuggestions() {
  const el = $("tagSuggestions");
  if (!el) return;
  const suggestions = ["کد", "پروژه", "ایده", "مهم", "شخصی", "کار", "تحقیق"];
  el.innerHTML = "";
  suggestions.forEach(s => {
    const b = document.createElement("button");
    b.className = "tag-suggestion";
    b.textContent = s;
    b.onclick = () => {
      const cur = $("tagInput").value.trim();
      const tags = cur ? cur.split(",").map(x => x.trim()) : [];
      if (!tags.includes(s)) tags.push(s);
      $("tagInput").value = tags.join(", ");
    };
    el.appendChild(b);
  });
}

if ($("closeTag")) $("closeTag").onclick = () => $("tagModal").classList.remove("open");
if ($("closeTagBtn")) $("closeTagBtn").onclick = () => $("tagModal").classList.remove("open");
if ($("saveTag")) {
  $("saveTag").onclick = async () => {
    const tags = $("tagInput").value.trim();
    await patchConversation({ tags });
    $("tagModal").classList.remove("open");
    toast("✅ ذخیره شد", "success");
  };
}

if ($("exportChat")) {
  $("exportChat").onclick = () => {
    if (!currentConvId) return;
    const fmt = prompt("فرمت (md/json/txt):", "md");
    if (fmt && ["md", "json", "txt"].includes(fmt)) {
      window.open(`/api/chat/conversations/${currentConvId}/export?fmt=${fmt}`);
    }
  };
}

if ($("deleteChat")) $("deleteChat").onclick = () => currentConvId && deleteConv(currentConvId);

if ($("exportAllBtn")) {
  $("exportAllBtn").onclick = async () => {
    toast("📦 در حال آماده‌سازی بکاپ...");
    const list = await fetch("/api/chat/conversations").then(r => r.json());
    for (const c of list) {
      window.open(`/api/chat/conversations/${c.id}/export?fmt=md`);
      await new Promise(r => setTimeout(r, 500));
    }
  };
}

// ═══════════════════════════════════════
// Messages
// ═══════════════════════════════════════
function addMessage(role, text, meta = {}, streaming = false) {
  const group = document.createElement("div");
  group.className = "msg-group";
  if (meta.id) group.dataset.msgId = meta.id;

  const bubble = document.createElement("div");
  bubble.className = "msg " + role + (streaming ? " streaming-cursor" : "");
  if (meta.edited) bubble.classList.add("edited");
  if (meta.bookmarked) bubble.classList.add("bookmarked");

  const content = document.createElement("div");
  renderMarkdown(text, content);
  bubble.appendChild(content);
  group.appendChild(bubble);

  const actions = document.createElement("div");
  actions.className = "msg-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "msg-action";
  copyBtn.innerHTML = "📋 کپی";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(text);
    toast("✅ کپی شد", "success");
  };
  actions.appendChild(copyBtn);

  if (role === "user" && meta.id) {
    const editBtn = document.createElement("button");
    editBtn.className = "msg-action";
    editBtn.innerHTML = "✏️ ویرایش";
    editBtn.onclick = () => editMessage(meta.id, text, content);
    actions.appendChild(editBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "msg-action danger";
    delBtn.innerHTML = "🗑️";
    delBtn.onclick = () => deleteMessage(meta.id, group);
    actions.appendChild(delBtn);
  }

  if (role === "assistant" && meta.id) {
    const regBtn = document.createElement("button");
    regBtn.className = "msg-action";
    regBtn.innerHTML = "🔄 دوباره";
    regBtn.onclick = () => regenerateMessage(meta.id);
    actions.appendChild(regBtn);

    const contBtn = document.createElement("button");
    contBtn.className = "msg-action";
    contBtn.innerHTML = "➡️ ادامه";
    contBtn.onclick = () => continueMessage(meta.id, text, content);
    actions.appendChild(contBtn);

    const bmBtn = document.createElement("button");
    bmBtn.className = "msg-action" + (meta.bookmarked ? " active" : "");
    bmBtn.innerHTML = "🔖";
    bmBtn.onclick = async () => {
      const r = await fetch(`/api/chat/messages/${meta.id}/bookmark`, { method: "POST" });
      if (r.ok) {
        const d = await r.json();
        bmBtn.classList.toggle("active", d.bookmarked);
        bubble.classList.toggle("bookmarked", d.bookmarked);
      }
    };
    actions.appendChild(bmBtn);
  }

  group.appendChild(actions);
  $("chat").appendChild(group);
  $("chat").scrollTop = $("chat").scrollHeight;
  return { group, bubble, content };
}

function updateMessageContent(contentEl, text) {
  renderMarkdown(text, contentEl);
  $("chat").scrollTop = $("chat").scrollHeight;
}

async function editMessage(mid, oldText, contentEl) {
  const newText = prompt("ویرایش پیام:", oldText);
  if (!newText || newText === oldText) return;
  const r = await fetch(`/api/chat/messages/${mid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: newText }),
  });
  if (r.ok) {
    updateMessageContent(contentEl, newText);
    toast("✅ ویرایش شد", "success");
  }
}

async function deleteMessage(mid, groupEl) {
  if (!confirm("پیام حذف شود؟")) return;
  const r = await fetch(`/api/chat/messages/${mid}`, { method: "DELETE" });
  if (r.ok) {
    groupEl.remove();
    toast("🗑️ حذف شد", "success");
  }
}

async function regenerateMessage(mid) {
  if (!confirm("پاسخ دوباره تولید شود؟")) return;
  toast("⏳ در حال تولید...");
  const r = await fetch(`/api/chat/messages/${mid}/regenerate`, { method: "POST" });
  if (r.ok) {
    if (currentConvId) openConversation(currentConvId);
    toast("✅ تولید شد", "success");
  }
}

async function continueMessage(mid, oldText, contentEl) {
  toast("⏳ در حال ادامه...");
  const r = await fetch(`/api/chat/messages/${mid}/continue`, { method: "POST" });
  if (r.ok) {
    const data = await r.json();
    updateMessageContent(contentEl, oldText + "\n\n" + data.reply);
    toast("✅ ادامه داده شد", "success");
  }
}

// ═══════════════════════════════════════
// Send
// ═══════════════════════════════════════
async function send() {
  const text = $("input").value.trim();
  if (!text && attachedFiles.length === 0) return;
  if (abortController) return;

  const ws = $("welcomeScreen");
  if (ws) ws.remove();

  addMessage("user", text + (attachedFiles.length ? `\n📎 ${attachedFiles.length} فایل` : ""));
  $("input").value = "";
  autoResize();
  if ($("clearInput")) $("clearInput").style.display = "none";

  const sendBtn = $("sendBtn");
  const stopBtn = $("stopBtn");
  sendBtn.disabled = true;
  sendBtn.style.display = "none";
  stopBtn.style.display = "flex";
  $("status").classList.add("busy");
  $("statusText").textContent = "در حال فکر کردن...";

  const steps = ["🧠 تحلیل درخواست", "📋 ساخت Plan", "🛠️ اجرای ابزار", "✅ تولید پاسخ"];
  renderAgentSteps(steps.slice(0, 1));
  let stepIdx = 1;
  const stepTimer = setInterval(() => {
    if (stepIdx < steps.length) renderAgentSteps(steps.slice(0, ++stepIdx));
  }, 700);

  abortController = new AbortController();

  try {
    const useStream = userSettings?.streaming !== false;
    const endpoint = useStream ? "/api/chat/stream" : "/api/chat/send";

    if (useStream) {
      const msgObj = addMessage("assistant", "", {}, true);
      let fullText = "";

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          message: text,
          file_ids: attachedFiles.map(f => f.id),
        }),
        signal: abortController.signal,
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              fullText += data.delta;
              updateMessageContent(msgObj.content, fullText);
            }
            if (data.done) {
              currentConvId = data.conversation_id;
              msgObj.bubble.classList.remove("streaming-cursor");
              speak(fullText);
              notify("پاسخ آماده شد", fullText.slice(0, 80));
              setTimeout(() => {
                if (currentConvId) openConversation(currentConvId);
              }, 300);
            }
            if (data.error) {
              fullText += "\n\n❌ " + data.error;
              updateMessageContent(msgObj.content, fullText);
            }
          } catch {}
        }
      }
    } else {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          message: text,
          file_ids: attachedFiles.map(f => f.id),
        }),
        signal: abortController.signal,
      });
      const data = await r.json();
      currentConvId = data.conversation_id;
      addMessage("assistant", data.reply);
      speak(data.reply);
      notify("پاسخ آماده شد", data.reply.slice(0, 80));
      setTimeout(() => {
        if (currentConvId) openConversation(currentConvId);
      }, 300);
    }

    attachedFiles = [];
    renderAttached();
  } catch (e) {
    if (e.name === "AbortError") {
      toast("⏹️ متوقف شد", "warning");
    } else {
      addMessage("assistant", "❌ خطا: " + e.message);
    }
  } finally {
    clearInterval(stepTimer);
    renderAgentSteps([...steps, "✅ کار تکمیل شد"]);
    sendBtn.disabled = false;
    sendBtn.style.display = "flex";
    stopBtn.style.display = "none";
    $("status").classList.remove("busy");
    $("statusText").textContent = "آماده";
    abortController = null;
  }
}

if ($("stopBtn")) $("stopBtn").onclick = () => { if (abortController) abortController.abort(); };

function renderAgentSteps(steps) {
  if (!userSettings?.show_agent_timeline) return;
  const el = $("agentSteps");
  if (!el) return;
  el.innerHTML = steps.map(s => `<div class="step">${s}</div>`).join("");
}

if ($("sendBtn")) $("sendBtn").onclick = send;
if ($("input")) {
  $("input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  $("input").addEventListener("input", () => {
    autoResize();
    if ($("clearInput")) $("clearInput").style.display = $("input").value ? "block" : "none";
    if ($("charCount")) {
      const n = $("input").value.length;
      const fa = n.toLocaleString("fa-IR");
      $("charCount").textContent = `${fa} کاراکتر`;
    }
  });
}

function autoResize() {
  const t = $("input");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 200) + "px";
}

if ($("clearInput")) {
  $("clearInput").onclick = () => {
    $("input").value = "";
    autoResize();
    $("clearInput").style.display = "none";
    if ($("charCount")) $("charCount").textContent = "۰ کاراکتر";
  };
}

// ═══════════════════════════════════════
// Files
// ═══════════════════════════════════════
if ($("fileBtn")) $("fileBtn").onclick = () => $("fileInput").click();
if ($("fileInput")) {
  $("fileInput").onchange = async (e) => {
    for (const f of e.target.files) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        toast("⏳ در حال آپلود " + f.name);
        const r = await fetch("/api/files/upload", { method: "POST", body: fd });
        const data = await r.json();
        if (data.id) {
          attachedFiles.push(data);
          toast("✅ آپلود شد: " + f.name, "success");
        }
      } catch (err) {
        toast("❌ خطا در آپلود", "error");
      }
    }
    e.target.value = "";
    renderAttached();
  };
}

function renderAttached() {
  const el = $("attached");
  el.innerHTML = "";
  attachedFiles.forEach((f, i) => {
    const c = document.createElement("div");
    c.className = "chip";
    c.innerHTML = `📎 ${escapeHtml(f.filename)} <button data-i="${i}">✕</button>`;
    c.querySelector("button").onclick = () => {
      attachedFiles.splice(i, 1);
      renderAttached();
    };
    el.appendChild(c);
  });
}

// ═══════════════════════════════════════
// Voice
// ═══════════════════════════════════════
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onresult = (e) => {
    let txt = "";
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
    $("input").value = txt;
    autoResize();
  };
  recognition.onend = () => {
    if ($("micBtn")) $("micBtn").classList.remove("recording");
  };
}

if ($("micBtn")) {
  $("micBtn").onclick = () => {
    if (!recognition) {
      alert("مرورگر پشتیبانی نمی‌کند. از Chrome استفاده کن.");
      return;
    }
    recognition.lang = userSettings?.voice_lang || "fa-IR";
    if ($("micBtn").classList.contains("recording")) {
      recognition.stop();
    } else {
      recognition.start();
      $("micBtn").classList.add("recording");
    }
  };
}

function speak(text) {
  if (!window.speechSynthesis) return;
  if (userSettings && !userSettings.voice_enabled) return;
  const clean = text.replace(/```[\s\S]*?```/g, " (کد) ").slice(0, 500);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = userSettings?.voice_lang || "fa-IR";
  u.rate = userSettings?.voice_rate || 1.0;
  u.pitch = userSettings?.voice_pitch || 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

async function notify(title, body) {
  if (!userSettings?.notifications) return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission === "granted" && document.hidden) {
    new Notification(title, { body });
  }
}

// ═══════════════════════════════════════
// Settings Modal
// ═══════════════════════════════════════
if ($("openSettings")) {
  $("openSettings").onclick = async () => {
    try {
      userSettings = await fetch("/api/settings/user").then(r => r.json());
      loadSettingsToUI(userSettings);
      renderThemeGrid();
      $("settingsModal").classList.add("open");
    } catch (e) {
      alert("خطا: " + e.message);
    }
  };
}

function loadSettingsToUI(s) {
  if (!s) return;
  const set = (id, val) => { const el = $(id); if (el) el.value = val; };
  const setChk = (id, val) => { const el = $(id); if (el) el.checked = val; };
  const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  set("setFontSize", s.font_size); setTxt("fontSizeVal", s.font_size);
  setChk("setCompact", s.compact_mode);
  set("setProvider", s.provider);
  set("setModel", s.model);
  set("setTemp", s.temperature); setTxt("tempVal", s.temperature);
  set("setMaxTokens", s.max_tokens);
  set("setSysPrompt", s.system_prompt || "");
  setChk("setVoiceEnabled", s.voice_enabled);
  set("setVoiceLang", s.voice_lang);
  set("setVoiceRate", s.voice_rate); setTxt("voiceRateVal", s.voice_rate);
  set("setVoicePitch", s.voice_pitch); setTxt("voicePitchVal", s.voice_pitch);
  set("setContext", s.context_messages); setTxt("ctxVal", s.context_messages);
  setChk("setAutoSum", s.auto_summarize);
  setChk("setStreaming", s.streaming);
  setChk("setNotifications", s.notifications);
  setChk("setTimeline", s.show_agent_timeline);
}

["setFontSize", "setTemp", "setVoiceRate", "setVoicePitch", "setContext"].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.oninput = () => {
    const map = { setFontSize: "fontSizeVal", setTemp: "tempVal", setVoiceRate: "voiceRateVal", setVoicePitch: "voicePitchVal", setContext: "ctxVal" };
    const target = $(map[id]);
    if (target) target.textContent = el.value;
  };
});

document.querySelectorAll("#settingsTabs .tab").forEach(t => {
  t.onclick = () => {
    document.querySelectorAll("#settingsTabs .tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll("#settingsModal .tab-content").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const target = document.querySelector(`#settingsModal .tab-content[data-tab="${t.dataset.tab}"]`);
    if (target) target.classList.add("active");
  };
});

if ($("testVoice")) {
  $("testVoice").onclick = () => {
    const u = new SpeechSynthesisUtterance("سلام، این یک تست صدا است.");
    u.lang = $("setVoiceLang").value;
    u.rate = parseFloat($("setVoiceRate").value);
    u.pitch = parseFloat($("setVoicePitch").value);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
}

if ($("saveSettings")) {
  $("saveSettings").onclick = async () => {
    const body = {
      font_size: parseInt($("setFontSize").value),
      compact_mode: $("setCompact").checked,
      provider: $("setProvider").value,
      model: $("setModel").value,
      temperature: parseFloat($("setTemp").value),
      max_tokens: parseInt($("setMaxTokens").value),
      system_prompt: $("setSysPrompt").value,
      voice_enabled: $("setVoiceEnabled").checked,
      voice_lang: $("setVoiceLang").value,
      voice_rate: parseFloat($("setVoiceRate").value),
      voice_pitch: parseFloat($("setVoicePitch").value),
      context_messages: parseInt($("setContext").value),
      auto_summarize: $("setAutoSum").checked,
      streaming: $("setStreaming").checked,
      notifications: $("setNotifications").checked,
      show_agent_timeline: $("setTimeline").checked,
    };
    const r = await fetch("/api/settings/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    userSettings = await r.json();
    applyUserSettings(userSettings);
    $("settingsModal").classList.remove("open");
    toast("✅ ذخیره شد", "success");
  };
}

if ($("closeSettings")) $("closeSettings").onclick = () => $("settingsModal").classList.remove("open");
if ($("closeSettingsBtn")) $("closeSettingsBtn").onclick = () => $("settingsModal").classList.remove("open");

// Clear all chats
if ($("clearAllChats")) {
  $("clearAllChats").onclick = async () => {
    if (!confirm("همه‌ی گفتگوها حذف شوند؟ این کار برگشت‌پذیر نیست!")) return;
    const list = await fetch("/api/chat/conversations").then(r => r.json());
    for (const c of list) {
      await fetch(`/api/chat/conversations/${c.id}`, { method: "DELETE" });
    }
    $("chat").innerHTML = "";
    currentConvId = null;
    showWelcomeScreen();
    loadConversations();
    toast("🗑️ همه حذف شد", "success");
  };
}

// Memory Manager
if ($("openMemoryManager")) {
  $("openMemoryManager").onclick = () => {
    loadMemories();
    $("memoryModal").classList.add("open");
  };
}
if ($("closeMemory")) $("closeMemory").onclick = () => $("memoryModal").classList.remove("open");
if ($("closeMemoryBtn")) $("closeMemoryBtn").onclick = () => $("memoryModal").classList.remove("open");
if ($("addMemory")) {
  $("addMemory").onclick = async () => {
    const key = $("memKey").value.trim();
    const value = $("memValue").value.trim();
    if (!key || !value) return;
    await fetch("/api/memory/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, category: "general", importance: 5 }),
    });
    $("memKey").value = "";
    $("memValue").value = "";
    loadMemories();
    toast("✅ اضافه شد", "success");
  };
}

async function loadMemories() {
  const list = await fetch("/api/memory/").then(r => r.json());
  const el = $("memoryList");
  el.innerHTML = "";
  if (!list.length) {
    el.innerHTML = '<p style="color:var(--fg2);font-size:13px;text-align:center;padding:14px">حافظه‌ای ثبت نشده</p>';
    return;
  }
  list.forEach(m => {
    const d = document.createElement("div");
    d.className = "memory-item";
    d.innerHTML = `
      <span class="mem-key">${escapeHtml(m.key)}</span>
      <span class="mem-value">${escapeHtml(m.value)}</span>
      <button class="mem-del" data-id="${m.id}">✕</button>
    `;
    d.querySelector(".mem-del").onclick = async () => {
      await fetch(`/api/memory/${m.id}`, { method: "DELETE" });
      loadMemories();
    };
    el.appendChild(d);
  });
}

// ═══════════════════════════════════════
// Admin Settings
// ═══════════════════════════════════════
if ($("openAdminSettings")) {
  $("openAdminSettings").onclick = async () => {
    try {
      const s = await fetch("/api/settings/admin").then(r => r.json());
      const set = (id, v) => { const el = $(id); if (el) el.value = v; };
      const setChk = (id, v) => { const el = $(id); if (el) el.checked = v; };
      const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };

      set("admAiKey", "");
      if ($("admAiKey")) $("admAiKey").placeholder = s.ai_api_key_masked || "sk-...";
      set("admAiUrl", s.ai_base_url || "");
      set("admAiModel", s.ai_model || "");
      set("admAiTemp", s.ai_temperature);
      setTxt("admTempVal", s.ai_temperature);
      set("admAiMaxTokens", s.ai_max_tokens);
      set("admSysPrompt", s.ai_system_prompt || "");
      setChk("admFallbackEnabled", s.fallback_enabled);
      set("admFbKey", "");
      if ($("admFbKey")) $("admFbKey").placeholder = s.fallback_api_key_masked || "sk-...";
      set("admFbUrl", s.fallback_base_url || "");
      set("admFbModel", s.fallback_model || "");
      setChk("admMaintenance", s.maintenance_mode);
      set("admMaintenanceMsg", s.maintenance_message || "");
      setChk("admAllowReg", s.allow_registration);
      set("admSiteName", s.site_name || "");
      set("admSiteDesc", s.site_description || "");
      set("admWelcome", s.welcome_message || "");
      set("admMaxUpload", s.max_upload_mb);
      set("admDailyMsg", s.daily_message_limit);
      set("admMaxUsers", s.max_users);
      set("admRateLimit", s.rate_limit_per_minute);
      set("admMinPass", s.min_password_length);
      set("admSessionDays", s.session_days);
      setChk("admRequireEmail", s.require_email_verification);
      set("admDefTheme", s.default_theme);
      set("admDefModel", s.default_model);
      set("admDefTemp", s.default_temperature);
      setTxt("admDefTempVal", s.default_temperature);
      setChk("admDefStreaming", s.default_streaming);

      if ($("testApiResult")) $("testApiResult").textContent = "";
      $("adminSettingsModal").classList.add("open");
    } catch (e) {
      alert("خطا: " + e.message);
    }
  };
}

if ($("closeAdminSettings")) $("closeAdminSettings").onclick = () => $("adminSettingsModal").classList.remove("open");
if ($("closeAdminSettingsBtn")) $("closeAdminSettingsBtn").onclick = () => $("adminSettingsModal").classList.remove("open");

document.querySelectorAll("#adminTabs .tab").forEach(t => {
  t.onclick = () => {
    document.querySelectorAll("#adminTabs .tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll("#adminSettingsModal .tab-content").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const target = document.querySelector(`#adminSettingsModal .tab-content[data-atab="${t.dataset.atab}"]`);
    if (target) target.classList.add("active");
  };
});

if ($("admAiTemp")) $("admAiTemp").oninput = () => { $("admTempVal").textContent = $("admAiTemp").value; };
if ($("admDefTemp")) $("admDefTemp").oninput = () => { $("admDefTempVal").textContent = $("admDefTemp").value; };

if ($("saveAdminSettings")) {
  $("saveAdminSettings").onclick = async () => {
    const body = {
      ai_base_url: $("admAiUrl").value,
      ai_model: $("admAiModel").value,
      ai_temperature: parseFloat($("admAiTemp").value),
      ai_max_tokens: parseInt($("admAiMaxTokens").value),
      ai_system_prompt: $("admSysPrompt").value,
      fallback_enabled: $("admFallbackEnabled").checked,
      fallback_base_url: $("admFbUrl").value,
      fallback_model: $("admFbModel").value,
      maintenance_mode: $("admMaintenance").checked,
      maintenance_message: $("admMaintenanceMsg").value,
      allow_registration: $("admAllowReg").checked,
      site_name: $("admSiteName").value,
      site_description: $("admSiteDesc").value,
      welcome_message: $("admWelcome").value,
      max_upload_mb: parseInt($("admMaxUpload").value),
      daily_message_limit: parseInt($("admDailyMsg").value),
      max_users: parseInt($("admMaxUsers").value),
      rate_limit_per_minute: parseInt($("admRateLimit").value),
      min_password_length: parseInt($("admMinPass").value),
      session_days: parseInt($("admSessionDays").value),
      require_email_verification: $("admRequireEmail").checked,
      default_theme: $("admDefTheme").value,
      default_model: $("admDefModel").value,
      default_temperature: parseFloat($("admDefTemp").value),
      default_streaming: $("admDefStreaming").checked,
    };
    if ($("admAiKey").value) body.ai_api_key = $("admAiKey").value;
    if ($("admFbKey").value) body.fallback_api_key = $("admFbKey").value;

    const r = await fetch("/api/settings/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      toast("✅ ذخیره شد", "success");
      $("adminSettingsModal").classList.remove("open");
    } else {
      toast("❌ خطا", "error");
    }
  };
}

if ($("testAdminApi")) {
  $("testAdminApi").onclick = async () => {
    const el = $("testApiResult");
    el.style.color = "var(--fg2)";
    el.textContent = "⏳ در حال تست...";
    const body = { ai_base_url: $("admAiUrl").value, ai_model: $("admAiModel").value };
    if ($("admAiKey").value) body.ai_api_key = $("admAiKey").value;
    await fetch("/api/settings/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    try {
      const r = await fetch("/api/settings/admin/test", { method: "POST" });
      const data = await r.json();
      if (data.ok) {
        el.style.color = "#22c55e";
        el.textContent = "✅ اتصال موفق! " + (data.reply || "");
      } else {
        el.style.color = "#ef4444";
        el.textContent = "❌ " + (data.error || "خطا");
      }
    } catch (e) {
      el.style.color = "#ef4444";
      el.textContent = "❌ " + e.message;
    }
  };
}

// ═══════════════════════════════════════
// Request Admin
// ═══════════════════════════════════════
if ($("requestAdminBtn")) {
  $("requestAdminBtn").onclick = () => {
    $("requestStatus").textContent = "";
    $("requestModal").classList.add("open");
  };
}
if ($("closeRequest")) $("closeRequest").onclick = () => $("requestModal").classList.remove("open");
if ($("closeRequestBtn")) $("closeRequestBtn").onclick = () => $("requestModal").classList.remove("open");
if ($("submitRequest")) {
  $("submitRequest").onclick = async () => {
    const reason = $("requestReason").value;
    const st = $("requestStatus");
    try {
      const r = await fetch("/api/auth/request-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      st.style.color = "#22c55e";
      st.textContent = "✅ درخواست ارسال شد.";
      $("requestAdminBtn").innerHTML = '<span>⏳</span> در انتظار تأیید';
    } catch (e) {
      st.style.color = "#ef4444";
      st.textContent = "❌ " + e.message;
    }
  };
}

if ($("clearAgentTimeline")) {
  $("clearAgentTimeline").onclick = () => {
    $("agentSteps").innerHTML = '<div class="step">آماده برای شروع</div>';
  };
}

// ═══════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════
document.addEventListener("keydown", (e) => {
  // Ctrl+K: Command Palette (پیاده‌سازی بعدی)
  if (e.ctrlKey && e.key === "k") {
    e.preventDefault();
    toast("💡 Command Palette به‌زودی...");
  }
  // Ctrl+N: New chat
  if (e.ctrlKey && e.key === "n") {
    e.preventDefault();
    if ($("newChat")) $("newChat").click();
  }
  // Ctrl+/: Focus input
  if (e.ctrlKey && e.key === "/") {
    e.preventDefault();
    if ($("input")) $("input").focus();
  }
  // Ctrl+B: Toggle sidebar
  if (e.ctrlKey && e.key === "b") {
    e.preventDefault();
    if ($("sidebar")) $("sidebar").classList.toggle("hidden");
  }
  // Esc: Close modals
  if (e.key === "Escape") {
    document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
  }
});

// ═══════════════════════════════════════
// Init
// ═══════════════════════════════════════
if (window.mermaid) {
  mermaid.initialize({ startOnLoad: false, theme: "dark" });
}

// شروع
checkAuth();