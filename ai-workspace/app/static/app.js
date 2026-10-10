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
// ═══════════════════════════════════════════════════════════════
// ادامه فایل app.js از بخش حذف گفتگوها
// ═══════════════════════════════════════════════════════════════

if ($("clearAllChats")) {
  $("clearAllChats").onclick = async () => {
    if (
      !confirm(
        "همه‌ی گفتگوها حذف شوند؟ این کار برگشت‌پذیر نیست!"
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/chat/conversations");

      if (!response.ok) {
        throw new Error("دریافت فهرست گفتگوها ناموفق بود.");
      }

      const list = await response.json();

      for (const c of list) {
        const r = await fetch(`/api/chat/conversations/${c.id}`, {
          method: "DELETE",
        });

        if (!r.ok) {
          throw new Error("حذف یکی از گفتگوها ناموفق بود.");
        }
      }

      currentConvId = null;
      currentConvMeta = null;

      if ($("chat")) $("chat").innerHTML = "";

      showWelcomeScreen();
      updateChatHeader();
      await loadConversations();

      toast("✅ همه‌ی گفتگوها حذف شدند", "success");
    } catch (e) {
      console.error("clearAllChats error:", e);
      toast("❌ " + e.message, "error");
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Memory Manager — مدیریت حافظه بلندمدت
// ═══════════════════════════════════════════════════════════════

if ($("openMemoryManager")) {
  $("openMemoryManager").onclick = () => {
    loadMemories();

    if ($("memoryModal")) {
      $("memoryModal").classList.add("open");
    }
  };
}

if ($("closeMemory")) {
  $("closeMemory").onclick = () => {
    $("memoryModal").classList.remove("open");
  };
}

if ($("closeMemoryBtn")) {
  $("closeMemoryBtn").onclick = () => {
    $("memoryModal").classList.remove("open");
  };
}

if ($("addMemory")) {
  $("addMemory").onclick = async () => {
    const key = $("memKey").value.trim();
    const value = $("memValue").value.trim();

    if (!key || !value) {
      toast("لطفاً کلید و مقدار حافظه را وارد کن.", "warning");
      return;
    }

    try {
      const r = await fetch("/api/memory/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value,
          category: "general",
          importance: 5,
        }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(data.detail || "ذخیره حافظه ناموفق بود.");
      }

      $("memKey").value = "";
      $("memValue").value = "";

      await loadMemories();
      toast("✅ حافظه ذخیره شد", "success");
    } catch (e) {
      console.error("addMemory error:", e);
      toast("❌ " + e.message, "error");
    }
  };
}

async function loadMemories() {
  try {
    const r = await fetch("/api/memory/");

    if (!r.ok) {
      throw new Error("دریافت حافظه‌ها ناموفق بود.");
    }

    const list = await r.json();
    const el = $("memoryList");

    if (!el) return;

    el.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = `
        <p style="color:var(--fg2);font-size:13px;text-align:center;padding:14px">
          حافظه‌ای ثبت نشده
        </p>
      `;
      return;
    }

    list.forEach((m) => {
      const d = document.createElement("div");
      d.className = "memory-item";

      d.innerHTML = `
        <span class="mem-key">${escapeHtml(m.key)}</span>
        <span class="mem-value">${escapeHtml(m.value)}</span>
        <button class="mem-del" data-id="${m.id}" type="button">✕</button>
      `;

      d.querySelector(".mem-del").onclick = async () => {
        if (!confirm("این مورد از حافظه حذف شود؟")) return;

        try {
          const response = await fetch(`/api/memory/${m.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.detail || "حذف حافظه ناموفق بود.");
          }

          await loadMemories();
          toast("🗑️ حافظه حذف شد", "success");
        } catch (e) {
          toast("❌ " + e.message, "error");
        }
      };

      el.appendChild(d);
    });
  } catch (e) {
    console.error("loadMemories error:", e);
    toast("❌ " + e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════
// Tokens & Referral — توکن‌ها و دعوت دوستان
// ═══════════════════════════════════════════════════════════════

function updateTokensDisplay(tokens) {
  const el = $("tokensCount");

  if (el) {
    el.textContent = (Number(tokens) || 0).toLocaleString("fa-IR");
  }
}

async function loadReferralInfo() {
  try {
    const r = await fetch("/api/referral/info");

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      throw new Error(errorData.detail || "دریافت اطلاعات دعوت ناموفق بود.");
    }

    const data = await r.json();

    if ($("myRefCode")) {
      $("myRefCode").value = data.my_code || "—";
    }

    if ($("refCount")) {
      $("refCount").textContent = data.total_referrals || 0;
    }

    if ($("refTokens")) {
      $("refTokens").textContent = data.total_tokens_earned || 0;
    }

    if ($("tokensPerRef")) {
      $("tokensPerRef").textContent = data.tokens_per_referral || 10;
    }

    const list = $("refList");

    if (!list) return;

    list.innerHTML = "";

    if (!data.referrals || !data.referrals.length) {
      list.innerHTML = `
        <p style="color:var(--fg3);font-size:12px;text-align:center;padding:12px">
          هنوز کسی رو دعوت نکردی
        </p>
      `;
      return;
    }

    data.referrals.forEach((referral) => {
      const d = document.createElement("div");

      d.style.cssText = [
        "display:flex",
        "justify-content:space-between",
        "padding:8px 12px",
        "background:var(--bg3)",
        "border-radius:8px",
        "margin-bottom:4px",
        "font-size:12px",
      ].join(";");

      d.innerHTML = `
        <span>👤 ${escapeHtml(referral.username)}</span>
        <span style="color:#fbbf24">🪙 +${Number(referral.tokens_awarded) || 0}</span>
      `;

      list.appendChild(d);
    });
  } catch (e) {
    console.error("referral error:", e);
    toast("❌ " + e.message, "error");
  }
}

if ($("openReferral")) {
  $("openReferral").onclick = () => {
    loadReferralInfo();

    if ($("referralModal")) {
      $("referralModal").classList.add("open");
    }
  };
}

if ($("closeReferral")) {
  $("closeReferral").onclick = () => {
    $("referralModal").classList.remove("open");
  };
}

if ($("closeReferralBtn")) {
  $("closeReferralBtn").onclick = () => {
    $("referralModal").classList.remove("open");
  };
}

if ($("copyRefCode")) {
  $("copyRefCode").onclick = async () => {
    const code = $("myRefCode") ? $("myRefCode").value : "";

    if (!code || code === "—") {
      toast("کد معرف در دسترس نیست.", "warning");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = $("myRefCode");

        if (!input) return;

        input.focus();
        input.select();

        if (!document.execCommand("copy")) {
          throw new Error("کپی خودکار انجام نشد.");
        }
      }

      toast("✅ کد معرف کپی شد: " + code, "success");
    } catch (e) {
      toast("کپی نشد؛ کد را دستی کپی کن.", "warning");
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Gaming Theme — تم گیمینگ
// ═══════════════════════════════════════════════════════════════

async function loadGamingStatus() {
  try {
    const r = await fetch("/api/auth/me");

    if (!r.ok) {
      throw new Error("برای بررسی تم گیمینگ باید وارد حساب شوی.");
    }

    const me = await r.json();
    currentUser = me;

    const statusEl = $("gamingStatus");
    const actionsEl = $("gamingActions");

    if (!statusEl || !actionsEl) return;

    if (me.gaming_theme_unlocked || me.is_admin) {
      statusEl.innerHTML = `
        ✅ <b style="color:#22c55e">تم گیمینگ فعال است!</b>
        می‌تونی از بخش تم‌ها انتخابش کنی.
      `;

      actionsEl.innerHTML = `
        <button class="send-btn" id="applyGaming" type="button"
          style="width:100%;height:48px">
          🎮 فعال‌سازی تم گیمینگ
        </button>
      `;

      $("applyGaming").onclick = async () => {
        applyTheme("gaming");
        renderThemeGrid();

        try {
          await fetch("/api/auth/theme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: "gaming" }),
          });
        } catch (e) {
          console.error("Saving gaming theme failed:", e);
        }

        toast("🎮 تم گیمینگ فعال شد!", "success");
        $("gamingModal").classList.remove("open");
      };
    } else {
      statusEl.textContent =
        "🔒 برای فعال‌سازی تم گیمینگ، یکی از روش‌های زیر را انتخاب کن.";

      actionsEl.innerHTML = `
        <button class="send-btn" id="unlockWithTokens" type="button"
          style="width:100%;height:48px">
          🪙 فعال‌سازی با توکن
        </button>

        <button class="btn-ghost" id="unlockWithPayment" type="button"
          style="height:48px;border-color:#fbbf24;color:#fbbf24">
          💰 درخواست پرداخت
        </button>
      `;

      $("unlockWithTokens").onclick = async () => {
        if (!confirm("آیا می‌خواهی تم گیمینگ را با توکن فعال کنی؟")) {
          return;
        }

        try {
          const response = await fetch(
            "/api/referral/unlock-gaming-theme",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ method: "tokens" }),
            }
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.detail || "فعال‌سازی ناموفق بود.");
          }

          toast("🎮 تم گیمینگ فعال شد!", "success");

          if (typeof data.remaining_tokens === "number") {
            updateTokensDisplay(data.remaining_tokens);
          }

          await loadGamingStatus();
          renderThemeGrid();
        } catch (e) {
          toast("❌ " + e.message, "error");
        }
      };

      $("unlockWithPayment").onclick = async () => {
        try {
          const response = await fetch(
            "/api/referral/unlock-gaming-theme",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ method: "payment" }),
            }
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.detail || "ساخت درخواست پرداخت ناموفق بود.");
          }

          if (data.payment_url) {
            window.location.href = data.payment_url;
            return;
          }

          toast("✅ درخواست ثبت شد.", "success");
          $("gamingModal").classList.remove("open");
        } catch (e) {
          toast("❌ " + e.message, "error");
        }
      };
    }
  } catch (e) {
    console.error("loadGamingStatus error:", e);
    toast("❌ " + e.message, "error");
  }
}

if ($("openGaming")) {
  $("openGaming").onclick = () => {
    loadGamingStatus();

    if ($("gamingModal")) {
      $("gamingModal").classList.add("open");
    }
  };
}

if ($("closeGaming")) {
  $("closeGaming").onclick = () => {
    $("gamingModal").classList.remove("open");
  };
}

if ($("closeGamingBtn")) {
  $("closeGamingBtn").onclick = () => {
    $("gamingModal").classList.remove("open");
  };
}

// ═══════════════════════════════════════════════════════════════
// Admin Settings — تنظیمات ادمین
// ═══════════════════════════════════════════════════════════════

if ($("openAdminSettings")) {
  $("openAdminSettings").onclick = async () => {
    try {
      const r = await fetch("/api/settings/admin");
      const s = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(s.detail || "دسترسی به تنظیمات ادمین ممکن نیست.");
      }

      const set = (id, value) => {
        const el = $(id);
        if (el && value !== undefined && value !== null) {
          el.value = value;
        }
      };

      const setChk = (id, value) => {
        const el = $(id);
        if (el && value !== undefined && value !== null) {
          el.checked = Boolean(value);
        }
      };

      const setTxt = (id, value) => {
        const el = $(id);
        if (el && value !== undefined && value !== null) {
          el.textContent = value;
        }
      };

      set("admAiKey", "");
      if ($("admAiKey")) {
        $("admAiKey").placeholder = s.ai_api_key_masked || "کلید API";
      }

      set("admAiUrl", s.ai_base_url || "");
      set("admAiModel", s.ai_model || "");
      set("admAiTemp", s.ai_temperature);
      setTxt("admTempVal", s.ai_temperature);
      set("admAiMaxTokens", s.ai_max_tokens);
      set("admSysPrompt", s.ai_system_prompt || "");

      setChk("admFallbackEnabled", s.fallback_enabled);
      set("admFbKey", "");

      if ($("admFbKey")) {
        $("admFbKey").placeholder =
          s.fallback_api_key_masked || "کلید API جایگزین";
      }

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
      setChk("admReferralEnabled", s.referral_enabled);
      set("admReferralTokens", s.referral_tokens);
      set("admGamingPrice", s.gaming_theme_price);
      set("admGamingTokenPrice", s.gaming_theme_token_price);

      if ($("testApiResult")) {
        $("testApiResult").textContent = "";
      }

      $("adminSettingsModal").classList.add("open");
    } catch (e) {
      console.error("openAdminSettings error:", e);
      toast("❌ " + e.message, "error");
    }
  };
}

if ($("closeAdminSettings")) {
  $("closeAdminSettings").onclick = () => {
    $("adminSettingsModal").classList.remove("open");
  };
}

if ($("closeAdminSettingsBtn")) {
  $("closeAdminSettingsBtn").onclick = () => {
    $("adminSettingsModal").classList.remove("open");
  };
}

document.querySelectorAll("#adminTabs .tab").forEach((tab) => {
  tab.onclick = () => {
    document
      .querySelectorAll("#adminTabs .tab")
      .forEach((item) => item.classList.remove("active"));

    document
      .querySelectorAll("#adminSettingsModal .tab-content")
      .forEach((item) => item.classList.remove("active"));

    tab.classList.add("active");

    const target = document.querySelector(
      `#adminSettingsModal .tab-content[data-atab="${tab.dataset.atab}"]`
    );

    if (target) target.classList.add("active");
  };
});

if ($("admAiTemp")) {
  $("admAiTemp").oninput = () => {
    if ($("admTempVal")) {
      $("admTempVal").textContent = $("admAiTemp").value;
    }
  };
}

if ($("admDefTemp")) {
  $("admDefTemp").oninput = () => {
    if ($("admDefTempVal")) {
      $("admDefTempVal").textContent = $("admDefTemp").value;
    }
  };
}

if ($("saveAdminSettings")) {
  $("saveAdminSettings").onclick = async () => {
    try {
      const body = {
        ai_base_url: $("admAiUrl").value,
        ai_model: $("admAiModel").value,
        ai_temperature: parseFloat($("admAiTemp").value),
        ai_max_tokens: parseInt($("admAiMaxTokens").value, 10),
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
        max_upload_mb: parseInt($("admMaxUpload").value, 10),
        daily_message_limit: parseInt($("admDailyMsg").value, 10),
        max_users: parseInt($("admMaxUsers").value, 10),
        rate_limit_per_minute: parseInt($("admRateLimit").value, 10),
        min_password_length: parseInt($("admMinPass").value, 10),
        session_days: parseInt($("admSessionDays").value, 10),
        require_email_verification: $("admRequireEmail").checked,
        default_theme: $("admDefTheme").value,
        default_model: $("admDefModel").value,
        default_temperature: parseFloat($("admDefTemp").value),
        default_streaming: $("admDefStreaming").checked,
        referral_enabled: $("admReferralEnabled").checked,
        referral_tokens: parseInt($("admReferralTokens").value, 10),
        gaming_theme_price: parseInt($("admGamingPrice").value, 10),
        gaming_theme_token_price: parseInt($("admGamingTokenPrice").value, 10),
      };

      if ($("admAiKey").value) {
        body.ai_api_key = $("admAiKey").value;
      }

      if ($("admFbKey").value) {
        body.fallback_api_key = $("admFbKey").value;
      }

      const r = await fetch("/api/settings/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(data.detail || "ذخیره تنظیمات ناموفق بود.");
      }

      toast("✅ تنظیمات ادمین ذخیره شد", "success");
      $("adminSettingsModal").classList.remove("open");
    } catch (e) {
      console.error("saveAdminSettings error:", e);
      toast("❌ " + e.message, "error");
    }
  };
}

if ($("testAdminApi")) {
  $("testAdminApi").onclick = async () => {
    const el = $("testApiResult");

    if (!el) return;

    el.style.color = "var(--fg2)";
    el.textContent = "⏳ در حال تست اتصال...";

    try {
      const body = {
        ai_base_url: $("admAiUrl").value,
        ai_model: $("admAiModel").value,
      };

      if ($("admAiKey").value) {
        body.ai_api_key = $("admAiKey").value;
      }

      const saveResponse = await fetch("/api/settings/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const saveData = await saveResponse.json().catch(() => ({}));

      if (!saveResponse.ok) {
        throw new Error(
          saveData.detail || "ذخیره تنظیمات API ناموفق بود."
        );
      }

      const r = await fetch("/api/settings/admin/test", {
        method: "POST",
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data.ok) {
        throw new Error(data.error || data.detail || "اتصال برقرار نشد.");
      }

      el.style.color = "#22c55e";
      el.textContent = "✅ اتصال موفق! " + (data.reply || "");
    } catch (e) {
      el.style.color = "#ef4444";
      el.textContent = "❌ " + e.message;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Request Admin — درخواست ادمین
// ═══════════════════════════════════════════════════════════════

if ($("requestAdminBtn")) {
  $("requestAdminBtn").onclick = () => {
    if ($("requestStatus")) {
      $("requestStatus").textContent = "";
    }

    $("requestModal").classList.add("open");
  };
}

if ($("closeRequest")) {
  $("closeRequest").onclick = () => {
    $("requestModal").classList.remove("open");
  };
}

if ($("closeRequestBtn")) {
  $("closeRequestBtn").onclick = () => {
    $("requestModal").classList.remove("open");
  };
}

if ($("submitRequest")) {
  $("submitRequest").onclick = async () => {
    const reason = $("requestReason").value;
    const statusEl = $("requestStatus");

    try {
      const r = await fetch("/api/auth/request-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(data.detail || "ارسال درخواست ناموفق بود.");
      }

      if (statusEl) {
        statusEl.style.color = "#22c55e";
        statusEl.textContent = "✅ درخواست ارسال شد.";
      }

      $("requestAdminBtn").innerHTML =
        "<span>⏳</span> در انتظار تأیید";
    } catch (e) {
      if (statusEl) {
        statusEl.style.color = "#ef4444";
        statusEl.textContent = "❌ " + e.message;
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Command Palette — پالت فرمان‌ها
// ═══════════════════════════════════════════════════════════════

const COMMANDS = [
  {
    icon: "➕",
    title: "گفتگوی جدید",
    desc: "شروع یک مکالمه جدید",
    shortcut: "Ctrl+N",
    action: () => $("newChat") && $("newChat").click(),
  },
  {
    icon: "⚙️",
    title: "تنظیمات",
    desc: "باز کردن تنظیمات",
    action: () => $("openSettings") && $("openSettings").click(),
  },
  {
    icon: "🎁",
    title: "دعوت دوستان",
    desc: "کد معرف و توکن‌ها",
    action: () => $("openReferral") && $("openReferral").click(),
  },
  {
    icon: "🎮",
    title: "تم گیمینگ",
    desc: "خرید یا فعال‌سازی",
    action: () => $("openGaming") && $("openGaming").click(),
  },
  {
    icon: "🔍",
    title: "جستجو در گفتگوها",
    desc: "جستجوی گفتگوها",
    action: () => $("searchInput") && $("searchInput").focus(),
  },
  {
    icon: "📦",
    title: "بکاپ گفتگوها",
    desc: "دانلود گفتگوها",
    action: () => $("exportAllBtn") && $("exportAllBtn").click(),
  },
  {
    icon: "🚪",
    title: "خروج",
    desc: "خروج از حساب",
    action: () => $("logoutBtn") && $("logoutBtn").click(),
  },
  {
    icon: "☰",
    title: "نمایش یا مخفی کردن منو",
    desc: "باز و بسته کردن سایدبار",
    shortcut: "Ctrl+B",
    action: toggleSidebar,
  },
  {
    icon: "🎙️",
    title: "میکروفون",
    desc: "شروع ضبط",
    action: () => $("micBtn") && $("micBtn").click(),
  },
];

let paletteSelected = 0;

function renderPalette(query = "") {
  const list = $("paletteList");

  if (!list) return;

  list.innerHTML = "";

  const q = query.toLowerCase();

  const filtered = COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = `
      <div style="padding:20px;text-align:center;color:var(--fg2);font-size:13px">
        چیزی پیدا نشد
      </div>
    `;
    return;
  }

  paletteSelected = 0;

  filtered.forEach((c, i) => {
    const d = document.createElement("div");

    d.className =
      "palette-item" + (i === 0 ? " selected" : "");

    d.innerHTML = `
      <span class="palette-item-icon">${c.icon}</span>
      <div class="palette-item-content">
        <div class="palette-item-title">${escapeHtml(c.title)}</div>
        <div class="palette-item-desc">${escapeHtml(c.desc)}</div>
      </div>
      ${c.shortcut ? `<span class="palette-item-shortcut">${c.shortcut}</span>` : ""}
    `;

    d.onclick = () => {
      c.action();

      if ($("commandPalette")) {
        $("commandPalette").classList.remove("open");
      }
    };

    list.appendChild(d);
  });
}

if ($("paletteInput")) {
  $("paletteInput").addEventListener("input", (e) => {
    renderPalette(e.target.value);
  });
}

// ═══════════════════════════════════════════════════════════════
// Keyboard Shortcuts — میانبرهای صفحه‌کلید
// ═══════════════════════════════════════════════════════════════

document.addEventListener("keydown", (e) => {
  // Ctrl+K: باز کردن پالت فرمان
  if (e.ctrlKey && e.key.toLowerCase() === "k") {
    e.preventDefault();

    if ($("commandPalette")) {
      $("commandPalette").classList.add("open");
      renderPalette();

      setTimeout(() => {
        if ($("paletteInput")) $("paletteInput").focus();
      }, 100);
    }
  }

  // Ctrl+N: گفتگوی جدید
  if (e.ctrlKey && e.key.toLowerCase() === "n") {
    e.preventDefault();

    if ($("newChat")) {
      $("newChat").click();
    }
  }

  // Ctrl+/: فوکوس روی ورودی پیام
  if (e.ctrlKey && e.key === "/") {
    e.preventDefault();

    if ($("input")) $("input").focus();
  }

  // Ctrl+B: سایدبار
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    e.preventDefault();
    toggleSidebar();
  }

  // Escape: بستن پنجره‌ها
  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal.open")
      .forEach((modal) => modal.classList.remove("open"));
  }

  // Enter: اجرای فرمان انتخاب‌شده
  if (
    $("commandPalette") &&
    $("commandPalette").classList.contains("open") &&
    e.key === "Enter"
  ) {
    const items = document.querySelectorAll(".palette-item");

    if (items[paletteSelected]) {
      items[paletteSelected].click();
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// Init — راه‌اندازی نهایی
// ═══════════════════════════════════════════════════════════════

if (window.mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
  });
}

// پس از ثبت همه‌ی دکمه‌ها، وضعیت ورود بررسی می‌شود.
checkAuth();

console.info("✅ AI Workspace JavaScript loaded successfully.");
