/* ═══════════════════════════════════════════════════════════════════════════
   🧠 AI WORKSPACE — app.js
   نسخه: 3.0.0
   ═══════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// Globals
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// Auth Screen Toggle
// ═══════════════════════════════════════════════════════════════
function showAuth() {
  const auth = $("authScreen");
  const main = $("mainApp");
  if (auth) auth.classList.remove("hidden");
  if (main) main.classList.add("hidden");
}

function hideAuth() {
  const auth = $("authScreen");
  const main = $("mainApp");
  if (auth) auth.classList.add("hidden");
  if (main) main.classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════
// Fetch interceptor (اضافه کردن توکن)
// ═══════════════════════════════════════════════════════════════
const origFetch = window.fetch;

window.fetch = function (url, opts = {}) {
  if (typeof url === "string" && url.startsWith("/api/") && TOKEN) {
    opts.headers = opts.headers || {};

    if (opts.headers instanceof Headers) {
      opts.headers.set("Authorization", "Bearer " + TOKEN);
    } else {
      opts.headers["Authorization"] = "Bearer " + TOKEN;
    }
  }

  return origFetch(url, opts);
};

// ═══════════════════════════════════════════════════════════════
// THEMES — ۱۱ تم
// ═══════════════════════════════════════════════════════════════
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
  {
    id: "gaming",
    name: "🎮 گیمینگ",
    bg: "#05060d",
    accent: "#8b5cf6",
    locked: true,
  },
];

function applyTheme(id) {
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem("theme", id);
}

function renderThemeGrid() {
  const grid = $("themeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const cur = localStorage.getItem("theme") || "dark";
  const isGamingUnlocked =
    currentUser && currentUser.gaming_theme_unlocked;

  THEMES.forEach((t) => {
    const d = document.createElement("div");
    const isLocked = t.locked && !isGamingUnlocked;

    d.className =
      "theme-swatch" +
      (t.id === cur ? " active" : "") +
      (isLocked ? " locked" : "");

    if (t.id === "gaming") {
      d.classList.add("gaming-swatch");
      if (isGamingUnlocked) d.classList.add("unlocked");
    }

    d.style.background = `linear-gradient(135deg, ${t.bg}, ${t.accent})`;
    d.innerHTML = `<span>${t.name}</span>`;

    d.onclick = async () => {
      if (isLocked) {
        if ($("gamingModal")) {
          $("gamingModal").classList.add("open");

          if (typeof loadGamingStatus === "function") {
            loadGamingStatus();
          }
        }
        return;
      }

      applyTheme(t.id);
      renderThemeGrid();

      if (TOKEN) {
        try {
          await fetch("/api/auth/theme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: t.id }),
          });
        } catch {}
      }
    };

    grid.appendChild(d);
  });
}

applyTheme(localStorage.getItem("theme") || "dark");

// ═══════════════════════════════════════════════════════════════
// Markdown + LaTeX + Mermaid
// ═══════════════════════════════════════════════════════════════
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function (code, lang) {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch {}
      }
      return code;
    },
  });
}

function renderMarkdown(text, targetEl) {
  let html;

  try {
    html = window.marked
      ? marked.parse(text)
      : escapeHtml(text).replace(/\n/g, "<br>");
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
        throwOnError: false,
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

  // Code toolbar
  targetEl.querySelectorAll("pre").forEach((pre) => {
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
      const lang =
        (code.className.match(/language-(\w+)/) || [])[1] || "txt";

      const ext = {
        python: "py",
        javascript: "js",
        typescript: "ts",
        html: "html",
        css: "css",
        json: "json",
        bash: "sh",
      }[lang] || lang;

      const blob = new Blob([code.textContent], {
        type: "text/plain",
      });

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
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// ═══════════════════════════════════════════════════════════════
// Check Auth
// ═══════════════════════════════════════════════════════════════
async function checkAuth() {
  if (!TOKEN) {
    showAuth();
    return;
  }

  try {
    const r = await fetch("/api/auth/me");

    if (!r.ok) throw new Error("اعتبار ورود منقضی یا نامعتبر است.");

    currentUser = await r.json();

    hideAuth();
    applyTheme(currentUser.theme || "dark");

    // User info در سایدبار
    if ($("userAvatar")) {
      $("userAvatar").textContent =
        (currentUser.username || "?").charAt(0).toUpperCase();
    }

    if ($("userName")) {
      $("userName").textContent = currentUser.username;
    }

    if ($("userRole")) {
      $("userRole").textContent = currentUser.is_admin
        ? "👑 ادمین"
        : "کاربر";

      $("userRole").className =
        "user-role" + (currentUser.is_admin ? " admin" : "");
    }

    // توکن‌ها
    updateTokensDisplay(currentUser.tokens || 0);

    // Settings
    try {
      userSettings = await fetch("/api/settings/user").then((r) => r.json());
      applyUserSettings(userSettings);
    } catch {}

    // نمایش دکمه‌ها بر اساس نقش
    if (currentUser.is_admin) {
      if ($("adminLink")) $("adminLink").style.display = "flex";
      if ($("openAdminSettings")) {
        $("openAdminSettings").style.display = "flex";
      }
      if ($("requestAdminBtn")) {
        $("requestAdminBtn").style.display = "none";
      }
    } else {
      if ($("adminLink")) $("adminLink").style.display = "none";
      if ($("openAdminSettings")) {
        $("openAdminSettings").style.display = "none";
      }
      if ($("requestAdminBtn")) {
        $("requestAdminBtn").style.display = "flex";
      }

      try {
        const req = await fetch("/api/auth/my-admin-request").then((r) =>
          r.ok ? r.json() : null
        );

        if (
          req &&
          req.status === "pending" &&
          $("requestAdminBtn")
        ) {
          $("requestAdminBtn").innerHTML =
            "<span>⏳</span> در انتظار تأیید";
        }
      } catch {}
    }

    loadConversations();
  } catch (e) {
    console.error("checkAuth error:", e);

    TOKEN = null;
    currentUser = null;
    localStorage.removeItem("token");
    showAuth();
  }
}

function applyUserSettings(s) {
  if (!s) return;

  document.body.style.fontSize = s.font_size + "px";
  document.body.classList.toggle("compact", s.compact_mode);

  const ap = $("agentPanel");

  if (ap) {
    ap.style.display = s.show_agent_timeline ? "block" : "none";
  }
}

// ═══════════════════════════════════════════════════════════════
// Login / Register
// ═══════════════════════════════════════════════════════════════
if ($("authToggle")) {
  $("authToggle").onclick = (e) => {
    e.preventDefault();

    isRegister = !isRegister;

    $("authTitle").textContent = isRegister
      ? "📝 ثبت‌نام"
      : "🔐 ورود به حساب";

    $("authSubtitle").textContent = isRegister
      ? "حساب جدید بساز"
      : "به AI Workspace خوش آمدی";

    if ($("authEmailField")) {
      $("authEmailField").style.display = isRegister ? "block" : "none";
    }

    if ($("authReferralField")) {
      $("authReferralField").style.display = isRegister ? "block" : "none";
    }

    $("authSubmitText").textContent = isRegister
      ? "ثبت‌نام"
      : "ورود به حساب";

    $("authToggleText").textContent = isRegister
      ? "حساب داری؟"
      : "حساب نداری؟";

    $("authToggle").textContent = isRegister
      ? "وارد شو"
      : "ثبت‌نام کن";
  };
}

if ($("togglePass")) {
  $("togglePass").onclick = () => {
    const p = $("authPassword");

    p.type = p.type === "password" ? "text" : "password";

    $("togglePass").textContent =
      p.type === "password" ? "👁️" : "🙈";
  };
}

if ($("authSubmit")) {
  $("authSubmit").onclick = async () => {
    const username = $("authUsername").value.trim();
    const password = $("authPassword").value;
    const email = $("authEmail")
      ? $("authEmail").value.trim()
      : "";
    const referral = $("authReferral")
      ? $("authReferral").value.trim()
      : "";
    const err = $("authError");
    const submitBtn = $("authSubmit");
    const submitText = $("authSubmitText");

    if (!err || !submitText) return;

    err.classList.remove("show");
    err.textContent = "";

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

    if (isRegister && password.length < 6) {
      err.textContent = "رمز عبور باید حداقل ۶ کاراکتر باشد.";
      err.classList.add("show");
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = isRegister
      ? "در حال ثبت‌نام..."
      : "در حال ورود...";

    try {
      let r;

      if (isRegister) {
        r = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
            referral_code: referral || null,
          }),
        });
      } else {
        const body = new URLSearchParams();

        body.set("username", username);
        body.set("password", password);

        r = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: body.toString(),
        });
      }

      let data;

      try {
        data = await r.json();
      } catch {
        throw new Error(
          "پاسخ سرور قابل خواندن نیست. لطفاً خطاهای Render را بررسی کن."
        );
      }

      if (!r.ok) {
        let message = data.detail || data.message || "عملیات ناموفق بود.";

        if (Array.isArray(message)) {
          message = message
            .map((item) => item.msg || JSON.stringify(item))
            .join("، ");
        }

        throw new Error(message);
      }

      if (!data.access_token) {
        throw new Error(
          "ورود انجام شد، اما سرور توکن ورود را ارسال نکرد."
        );
      }

      TOKEN = data.access_token;
      currentUser = data.user || null;

      localStorage.setItem("token", TOKEN);

      hideAuth();

      if ($("chat")) {
        $("chat").innerHTML = "";
      }

      await checkAuth();
    } catch (e) {
      console.error("Login/Register error:", e);

      err.textContent =
        e.message || "خطای نامشخص هنگام ورود یا ثبت‌نام رخ داد.";

      err.classList.add("show");
    } finally {
      submitBtn.disabled = false;

      submitText.textContent = isRegister
        ? "ثبت‌نام"
        : "ورود به حساب";
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Logout
// ═══════════════════════════════════════════════════════════════
if ($("logoutBtn")) {
  $("logoutBtn").onclick = () => {
    TOKEN = null;
    currentUser = null;
    userSettings = null;

    localStorage.removeItem("token");

    if ($("chat")) $("chat").innerHTML = "";
    if ($("convList")) $("convList").innerHTML = "";

    showAuth();
  };
}

// ═══════════════════════════════════════════════════════════════
// Sidebar
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");

  if (!sidebar) return;

  const isNowHidden = sidebar.classList.toggle("hidden");

  if (overlay) {
    if (isNowHidden) {
      overlay.classList.remove("show");
    } else if (window.innerWidth <= 760) {
      overlay.classList.add("show");
    }
  }
}

function closeSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");

  if (sidebar) sidebar.classList.add("hidden");
  if (overlay) overlay.classList.remove("show");
}

if ($("menuBtn")) $("menuBtn").onclick = toggleSidebar;
if ($("closeSidebarMobile")) {
  $("closeSidebarMobile").onclick = closeSidebar;
}
if ($("sidebarOverlay")) {
  $("sidebarOverlay").onclick = closeSidebar;
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 760 && $("sidebarOverlay")) {
    $("sidebarOverlay").classList.remove("show");
  }
});

// Search
if ($("searchInput")) {
  $("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();

    if ($("clearSearch")) {
      $("clearSearch").style.display = currentSearch ? "block" : "none";
    }

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

// اصلاح شده: بستن صحیح forEach مربوط به دکمه‌های فیلتر
document.querySelectorAll(".filter-tab").forEach((t) => {
  t.onclick = () => {
    document
      .querySelectorAll(".filter-tab")
      .forEach((x) => x.classList.remove("active"));

    t.classList.add("active");
    currentFilter = t.dataset.filter;

    loadConversations();
  };
});

// ═══════════════════════════════════════════════════════════════
// Conversations
// ═══════════════════════════════════════════════════════════════
async function loadConversations() {
  try {
    const params = new URLSearchParams();

    if (currentFilter === "archived") {
      params.set("archived", "true");
    }

    if (currentFilter === "favorite") {
      params.set("favorite", "true");
    }

    if (currentSearch) {
      params.set("q", currentSearch);
    }

    const list = await fetch(
      "/api/chat/conversations?" + params.toString()
    ).then((r) => {
      if (!r.ok) throw new Error("گرفتن گفتگوها ناموفق بود.");
      return r.json();
    });

    const el = $("convList");
    if (!el) return;

    el.innerHTML = "";

    let filtered = list;

    if (currentFilter === "pinned") {
      filtered = list.filter((c) => c.pinned);
    }

    if (!filtered.length) {
      el.innerHTML = `
        <div style="padding:20px;text-align:center;font-size:12px;color:var(--fg2)">
          گفتگویی یافت نشد
        </div>
      `;
      return;
    }

    filtered.forEach((c) => {
      const d = document.createElement("div");

      d.className =
        "conv-item" + (c.id === currentConvId ? " active" : "");

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

  await fetch(`/api/chat/conversations/${id}`, {
    method: "DELETE",
  });

  if (id === currentConvId) {
    currentConvId = null;
    currentConvMeta = null;

    if ($("chat")) $("chat").innerHTML = "";

    showWelcomeScreen();
    updateChatHeader();
  }

  loadConversations();
  toast("🗑️ گفتگو حذف شد", "success");
}

async function openConversation(id) {
  currentConvId = id;

  try {
    const convs = await fetch("/api/chat/conversations").then((r) => r.json());

    currentConvMeta = convs.find((c) => c.id === id);

    const msgs = await fetch(
      `/api/chat/conversations/${id}/messages`
    ).then((r) => r.json());

    if (!$("chat")) return;

    $("chat").innerHTML = "";

    if (!msgs.length) {
      showWelcomeScreen();
    } else {
      msgs.forEach((m) => {
        addMessage(m.role, m.content, {
          id: m.id,
          edited: m.edited,
          bookmarked: m.bookmarked,
        });
      });
    }

    updateChatHeader();
    loadConversations();
    closeSidebar();
  } catch (e) {
    console.error("openConversation error:", e);
  }
}

if ($("newChat")) {
  $("newChat").onclick = () => {
    currentConvId = null;
    currentConvMeta = null;

    if ($("chat")) $("chat").innerHTML = "";

    showWelcomeScreen();
    updateChatHeader();
    loadConversations();
  };
}

function showWelcomeScreen() {
  const chat = $("chat");
  if (!chat) return;

  chat.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-icon">🧠</div>
      <h2 class="welcome-title">به AI Workspace خوش آمدی!</h2>
      <p class="welcome-subtitle">
        دستیار هوشمند با قابلیت Agent Loop، حافظه‌ی بلندمدت و پشتیبانی از چند Provider
      </p>
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

  document.querySelectorAll(".welcome-card").forEach((card) => {
    card.onclick = () => {
      if ($("input")) {
        $("input").value = card.dataset.prompt || "";
        autoResize();
        $("input").focus();
      }
    };
  });
}

function updateChatHeader() {
  if (currentConvId && currentConvMeta) {
    if ($("chatTitle")) {
      $("chatTitle").textContent = currentConvMeta.title;
    }

    if ($("chatSubtitle")) {
      $("chatSubtitle").textContent = "📌 فعال";
    }

    if ($("chatActions")) {
      $("chatActions").style.display = "flex";
    }

    if ($("pinChat")) {
      $("pinChat").classList.toggle("active", currentConvMeta.pinned);
    }

    if ($("favChat")) {
      $("favChat").classList.toggle("active", currentConvMeta.favorite);
    }

    if ($("archiveChat")) {
      $("archiveChat").classList.toggle("active", currentConvMeta.archived);
    }
  } else {
    if ($("chatTitle")) {
      $("chatTitle").textContent = "🧠 AI Workspace";
    }

    if ($("chatSubtitle")) {
      $("chatSubtitle").textContent = "شروع کن...";
    }

    if ($("chatActions")) {
      $("chatActions").style.display = "none";
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Chat Actions
// ═══════════════════════════════════════════════════════════════
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

if ($("pinChat")) {
  $("pinChat").onclick = () =>
    currentConvMeta &&
    patchConversation({ pinned: !currentConvMeta.pinned });
}

if ($("favChat")) {
  $("favChat").onclick = () =>
    currentConvMeta &&
    patchConversation({ favorite: !currentConvMeta.favorite });
}

if ($("archiveChat")) {
  $("archiveChat").onclick = () =>
    currentConvMeta &&
    patchConversation({ archived: !currentConvMeta.archived });
}

if ($("renameChat")) {
  $("renameChat").onclick = () => {
    if (!currentConvMeta) return;

    const newTitle = prompt("نام جدید:", currentConvMeta.title);

    if (newTitle && newTitle.trim()) {
      patchConversation({ title: newTitle.trim() });
    }
  };
}

if ($("autoNameChat")) {
  $("autoNameChat").onclick = async () => {
    if (!currentConvId) return;

    toast("⏳ در حال تولید نام...");

    const r = await fetch(
      `/api/chat/conversations/${currentConvId}/auto-name`,
      { method: "POST" }
    );

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

    const r = await fetch(
      `/api/chat/conversations/${currentConvId}/duplicate`,
      { method: "POST" }
    );

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

  const suggestions = [
    "کد",
    "پروژه",
    "ایده",
    "مهم",
    "شخصی",
    "کار",
    "تحقیق",
  ];

  el.innerHTML = "";

  suggestions.forEach((s) => {
    const b = document.createElement("button");
    b.className = "tag-suggestion";
    b.textContent = s;

    b.onclick = () => {
      const cur = $("tagInput").value.trim();
      const tags = cur
        ? cur.split(",").map((x) => x.trim())
        : [];

      if (!tags.includes(s)) tags.push(s);

      $("tagInput").value = tags.join(", ");
    };

    el.appendChild(b);
  });
}

if ($("closeTag")) {
  $("closeTag").onclick = () => $("tagModal").classList.remove("open");
}

if ($("closeTagBtn")) {
  $("closeTagBtn").onclick = () => $("tagModal").classList.remove("open");
}

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
      window.open(
        `/api/chat/conversations/${currentConvId}/export?fmt=${fmt}`
      );
    }
  };
}

if ($("deleteChat")) {
  $("deleteChat").onclick = () => {
    if (currentConvId) deleteConv(currentConvId);
  };
}

if ($("exportAllBtn")) {
  $("exportAllBtn").onclick = async () => {
    toast("📦 در حال آماده‌سازی بکاپ...");

    const list = await fetch("/api/chat/conversations").then((r) => r.json());

    for (const c of list) {
      window.open(`/api/chat/conversations/${c.id}/export?fmt=md`);
      await new Promise((r) => setTimeout(r, 500));
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════════
function addMessage(role, text, meta = {}, streaming = false) {
  const group = document.createElement("div");
  group.className = "msg-group";

  if (meta.id) group.dataset.msgId = meta.id;

  const bubble = document.createElement("div");
  bubble.className =
    "msg " + role + (streaming ? " streaming-cursor" : "");

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

    bmBtn.className =
      "msg-action" + (meta.bookmarked ? " active" : "");

    bmBtn.innerHTML = "🔖";

    bmBtn.onclick = async () => {
      const r = await fetch(
        `/api/chat/messages/${meta.id}/bookmark`,
        { method: "POST" }
      );

      if (r.ok) {
        const d = await r.json();

        bmBtn.classList.toggle("active", d.bookmarked);
        bubble.classList.toggle("bookmarked", d.bookmarked);
      }
    };

    actions.appendChild(bmBtn);
  }

  group.appendChild(actions);

  if ($("chat")) {
    $("chat").appendChild(group);
    $("chat").scrollTop = $("chat").scrollHeight;
  }

  return { group, bubble, content };
}

function updateMessageContent(contentEl, text) {
  renderMarkdown(text, contentEl);

  if ($("chat")) {
    $("chat").scrollTop = $("chat").scrollHeight;
  }
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

  const r = await fetch(`/api/chat/messages/${mid}`, {
    method: "DELETE",
  });

  if (r.ok) {
    groupEl.remove();
    toast("🗑️ حذف شد", "success");
  }
}

async function regenerateMessage(mid) {
  if (!confirm("پاسخ دوباره تولید شود؟")) return;

  toast("⏳ در حال تولید...");

  const r = await fetch(
    `/api/chat/messages/${mid}/regenerate`,
    { method: "POST" }
  );

  if (r.ok) {
    if (currentConvId) openConversation(currentConvId);
    toast("✅ تولید شد", "success");
  }
}

async function continueMessage(mid, oldText, contentEl) {
  toast("⏳ در حال ادامه...");

  const r = await fetch(
    `/api/chat/messages/${mid}/continue`,
    { method: "POST" }
  );

  if (r.ok) {
    const data = await r.json();

    updateMessageContent(
      contentEl,
      oldText + "\n\n" + data.reply
    );

    toast("✅ ادامه داده شد", "success");
  }
}

// ═══════════════════════════════════════════════════════════════
// Send
// ═══════════════════════════════════════════════════════════════
async function send() {
  if (!$("input") || !$("sendBtn") || !$("stopBtn")) return;

  const text = $("input").value.trim();

  if (!text && attachedFiles.length === 0) return;
  if (abortController) return;

  const ws = $("welcomeScreen");
  if (ws) ws.remove();

  addMessage(
    "user",
    text + (attachedFiles.length ? `\n📎 ${attachedFiles.length} فایل` : "")
  );

  $("input").value = "";
  autoResize();

  if ($("clearInput")) {
    $("clearInput").style.display = "none";
  }

  const sendBtn = $("sendBtn");
  const stopBtn = $("stopBtn");

  sendBtn.disabled = true;
  sendBtn.style.display = "none";
  stopBtn.style.display = "flex";

  if ($("status")) $("status").classList.add("busy");

  if ($("statusText")) {
    $("statusText").textContent = "در حال فکر کردن...";
  }

  const steps = [
    "🧠 تحلیل درخواست",
    "📋 ساخت Plan",
    "🛠️ اجرای ابزار",
    "✅ تولید پاسخ",
  ];

  renderAgentSteps(steps.slice(0, 1));

  let stepIdx = 1;

  const stepTimer = setInterval(() => {
    if (stepIdx < steps.length) {
      renderAgentSteps(steps.slice(0, ++stepIdx));
    }
  }, 700);

  abortController = new AbortController();

  try {
    const useStream = userSettings?.streaming !== false;

    const endpoint = useStream
      ? "/api/chat/stream"
      : "/api/chat/send";

    if (useStream) {
      const msgObj = addMessage("assistant", "", {}, true);
      let fullText = "";

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          message: text,
          file_ids: attachedFiles.map((f) => f.id),
        }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(
          errData.detail || "ارسال پیام به سرور ناموفق بود."
        );
      }

      if (!resp.body) {
        throw new Error("پاسخ جریانی سرور در دسترس نیست.");
      }

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
                if (currentConvId) {
                  openConversation(currentConvId);
                }
              }, 300);
            }

            if (data.error) {
              fullText += "\n\n❌ " + data.error;
              updateMessageContent(msgObj.content, fullText);
            }
          } catch (e) {
            console.error("Stream parse error:", e);
          }
        }
      }
    } else {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          message: text,
          file_ids: attachedFiles.map((f) => f.id),
        }),
        signal: abortController.signal,
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.detail || "ارسال پیام ناموفق بود.");
      }

      currentConvId = data.conversation_id;

      addMessage("assistant", data.reply);

      speak(data.reply);
      notify("پاسخ آماده شد", data.reply.slice(0, 80));

      setTimeout(() => {
        if (currentConvId) {
          openConversation(currentConvId);
        }
      }, 300);
    }

    attachedFiles = [];
    renderAttached();
  } catch (e) {
    if (e.name === "AbortError") {
      toast("⏹️ متوقف شد", "warning");
    } else {
      console.error("send error:", e);
      addMessage("assistant", "❌ خطا: " + e.message);
    }
  } finally {
    clearInterval(stepTimer);

    renderAgentSteps([...steps, "✅ کار تکمیل شد"]);

    sendBtn.disabled = false;
    sendBtn.style.display = "flex";
    stopBtn.style.display = "none";

    if ($("status")) {
      $("status").classList.remove("busy");
    }

    if ($("statusText")) {
      $("statusText").textContent = "آماده";
    }

    abortController = null;
  }
}

if ($("stopBtn")) {
  $("stopBtn").onclick = () => {
    if (abortController) abortController.abort();
  };
}

function renderAgentSteps(steps) {
  if (!userSettings?.show_agent_timeline) return;

  const el = $("agentSteps");
  if (!el) return;

  el.innerHTML = steps
    .map((s) => `<div class="step">${s}</div>`)
    .join("");
}

if ($("sendBtn")) {
  $("sendBtn").onclick = send;
}

if ($("input")) {
  $("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  $("input").addEventListener("input", () => {
    autoResize();

    if ($("clearInput")) {
      $("clearInput").style.display =
        $("input").value ? "block" : "none";
    }

    if ($("charCount")) {
      const n = $("input").value.length;

      $("charCount").textContent =
        `${n.toLocaleString("fa-IR")} کاراکتر`;
    }
  });
}

function autoResize() {
  const t = $("input");
  if (!t) return;

  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 200) + "px";
}

if ($("clearInput")) {
  $("clearInput").onclick = () => {
    if (!$("input")) return;

    $("input").value = "";
    autoResize();

    $("clearInput").style.display = "none";

    if ($("charCount")) {
      $("charCount").textContent = "۰ کاراکتر";
    }
  };
}

if ($("clearAgentTimeline")) {
  $("clearAgentTimeline").onclick = () => {
    if ($("agentSteps")) {
      $("agentSteps").innerHTML =
        '<div class="step">آماده برای شروع</div>';
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Files
// ═══════════════════════════════════════════════════════════════
if ($("fileBtn")) {
  $("fileBtn").onclick = () => {
    if ($("fileInput")) $("fileInput").click();
  };
}

if ($("fileInput")) {
  $("fileInput").onchange = async (e) => {
    for (const f of e.target.files) {
      const fd = new FormData();
      fd.append("file", f);

      try {
        toast("⏳ در حال آپلود " + f.name);

        const r = await fetch("/api/files/upload", {
          method: "POST",
          body: fd,
        });

        const data = await r.json();

        if (r.ok && data.id) {
          attachedFiles.push(data);
          toast("✅ آپلود شد: " + f.name, "success");
        } else {
          toast(
            "❌ " + (data.detail || "آپلود ناموفق بود"),
            "error"
          );
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast("❌ خطا در آپلود", "error");
      }
    }

    e.target.value = "";
    renderAttached();
  };
}

function renderAttached() {
  const el = $("attached");
  if (!el) return;

  el.innerHTML = "";

  attachedFiles.forEach((f, i) => {
    const c = document.createElement("div");
    c.className = "chip";

    c.innerHTML = `
      📎 ${escapeHtml(f.filename)}
      <button data-i="${i}">✕</button>
    `;

    c.querySelector("button").onclick = () => {
      attachedFiles.splice(i, 1);
      renderAttached();
    };

    el.appendChild(c);
  });
}

// ═══════════════════════════════════════════════════════════════
// Voice
// ═══════════════════════════════════════════════════════════════
const SR =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SR) {
  recognition = new SR();

  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let txt = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      txt += e.results[i][0].transcript;
    }

    if ($("input")) {
      $("input").value = txt;
      autoResize();
    }
  };

  recognition.onend = () => {
    if ($("micBtn")) {
      $("micBtn").classList.remove("recording");
    }
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

  const clean = text
    .replace(/```[\s\S]*?```/g, " (کد) ")
    .slice(0, 500);

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

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  if (
    Notification.permission === "granted" &&
    document.hidden
  ) {
    new Notification(title, { body });
  }
}

// ═══════════════════════════════════════════════════════════════
// Settings Modal
// ═══════════════════════════════════════════════════════════════
if ($("openSettings")) {
  $("openSettings").onclick = async () => {
    try {
      userSettings = await fetch("/api/settings/user").then((r) =>
        r.json()
      );

      loadSettingsToUI(userSettings);
      renderThemeGrid();

      if ($("settingsModal")) {
        $("settingsModal").classList.add("open");
      }
    } catch (e) {
      alert("خطا: " + e.message);
    }
  };
}

function loadSettingsToUI(s) {
  if (!s) return;

  const set = (id, val) => {
    const el = $(id);
    if (el) el.value = val;
  };

  const setChk = (id, val) => {
    const el = $(id);
    if (el) el.checked = val;
  };

  const setTxt = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val;
  };

  set("setFontSize", s.font_size);
  setTxt("fontSizeVal", s.font_size);

  setChk("setCompact", s.compact_mode);
  set("setProvider", s.provider);
  set("setModel", s.model);

  set("setTemp", s.temperature);
  setTxt("tempVal", s.temperature);

  set("setMaxTokens", s.max_tokens);
  set("setSysPrompt", s.system_prompt || "");

  setChk("setVoiceEnabled", s.voice_enabled);
  set("setVoiceLang", s.voice_lang);

  set("setVoiceRate", s.voice_rate);
  setTxt("voiceRateVal", s.voice_rate);

  set("setVoicePitch", s.voice_pitch);
  setTxt("voicePitchVal", s.voice_pitch);

  set("setContext", s.context_messages);
  setTxt("ctxVal", s.context_messages);

  setChk("setAutoSum", s.auto_summarize);
  setChk("setStreaming", s.streaming);
  setChk("setNotifications", s.notifications);
  setChk("setTimeline", s.show_agent_timeline);
}

[
  "setFontSize",
  "setTemp",
  "setVoiceRate",
  "setVoicePitch",
  "setContext",
].forEach((id) => {
  const el = $(id);
  if (!el) return;

  el.oninput = () => {
    const map = {
      setFontSize: "fontSizeVal",
      setTemp: "tempVal",
      setVoiceRate: "voiceRateVal",
      setVoicePitch: "voicePitchVal",
      setContext: "ctxVal",
    };

    const target = $(map[id]);

    if (target) {
      target.textContent = el.value;
    }
  };
});

document.querySelectorAll("#settingsTabs .tab").forEach((t) => {
  t.onclick = () => {
    document
      .querySelectorAll("#settingsTabs .tab")
      .forEach((x) => x.classList.remove("active"));

    document
      .querySelectorAll("#settingsModal .tab-content")
      .forEach((x) => x.classList.remove("active"));

    t.classList.add("active");

    const target = document.querySelector(
      `#settingsModal .tab-content[data-tab="${t.dataset.tab}"]`
    );

    if (target) target.classList.add("active");
  };
});

if ($("testVoice")) {
  $("testVoice").onclick = () => {
    const u = new SpeechSynthesisUtterance(
      "سلام، این یک تست صدا است."
    );

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

if ($("closeSettings")) {
  $("closeSettings").onclick = () =>
    $("settingsModal").classList.remove("open");
}

if ($("closeSettingsBtn")) {
  $("closeSettingsBtn").onclick = () =>
    $("settingsModal").classList.remove("open");
}

if ($("clearAllChats")) {
  $("clearAllChats").onclick = async () => {
    if (
      !confirm(
        "همه‌ی گفتگوها
