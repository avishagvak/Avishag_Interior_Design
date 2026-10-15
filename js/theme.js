// ============================================================
// מראה, ערכות נושא ואנימציות (עיצוב "זכוכית")
// ------------------------------------------------------------
// קובץ עצמאי: לא נוגע בנתונים ולא ב-Supabase. נטען ב-<head> כדי
// שהצבעים יוחלו לפני שהמסך מצויר, ושאר החלקים מופעלים ב-DOMContentLoaded.
// ההגדרות נשמרות בדפדפן (localStorage) - לכל מכשיר בנפרד.
// ============================================================

(function () {
    const STORAGE_KEY = "avishag-appearance";

    const THEMES = [
        { name: "נורדי", accent: "#7a6a52", blobs: ["#e9dccb", "#c9d3d8", "#f1e9dc"] },
        { name: "מרווה", accent: "#5e6b52", blobs: ["#d3dcc6", "#e9e2cf", "#c7d6cf"] },
        { name: "אורורה", accent: "#6a4cf0", blobs: ["#ff9ec7", "#8b7bff", "#7fd6ff"] },
        { name: "ים", accent: "#0a7a94", blobs: ["#9be7d5", "#6fc3ff", "#c7f0ff"] },
        { name: "שקיעה", accent: "#c94a2a", blobs: ["#ffc56b", "#ff8a7a", "#ffd6e0"] },
        { name: "יער", accent: "#2f7a55", blobs: ["#b8e0c2", "#e3e9b0", "#9fd3c7"] },
        { name: "לבנדר", accent: "#7a5cc0", blobs: ["#e3d4ff", "#ffd9ec", "#cfe0ff"] },
        { name: "ענבר", accent: "#a86200", blobs: ["#ffd88a", "#ffb68a", "#fff1c2"] },
        { name: "ורד", accent: "#c2416b", blobs: ["#ffc2d4", "#ffd9c2", "#f5c2ff"] },
        { name: "ערפל", accent: "#44617a", blobs: ["#d6dee6", "#c3d3e0", "#e9e4dc"] },
        { name: "מנטה", accent: "#1d8068", blobs: ["#b5f0dc", "#d6f5a8", "#a8e6f5"] },
        { name: "לילה", accent: "#4f5bd5", blobs: ["#8ea2ff", "#c6a8ff", "#7fd0ff"] },
    ];
    const QUICK = [0, 1, 2, 3, 5, 11];
    const svgIcon = (d) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
    const ICON_MOON = svgIcon('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>');
    const ICON_SUN = svgIcon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');

    const DEFAULTS = { theme: 0, custom: null, mode: "light", blur: 22, opacity: 58, radius: 20, dense: false, motion: true, bgMotion: true, contrast: false, fontSize: 1 };
    let S = { ...DEFAULTS };
    try { Object.assign(S, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); } catch (e) { /* ברירת מחדל */ }
    const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* פרטי/חסום */ } };

    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isDark = () => S.mode === "dark" || (S.mode === "auto" && mq.matches);

    function hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0; const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > .5 ? d / (2 - max - min) : d / (max + min);
            h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h *= 60;
        }
        return [h, s * 100, l * 100];
    }
    const hsl = (h, s, l) => `hsl(${(h + 360) % 360} ${s}% ${l}%)`;

    function currentTheme() {
        if (S.custom) {
            const [h, s] = hexToHsl(S.custom);
            return { name: "צבע משלך", accent: S.custom, blobs: [hsl(h + 35, Math.min(s, 90), 80), hsl(h - 30, Math.min(s, 85), 76), hsl(h + 170, 60, 84)] };
        }
        return THEMES[S.theme] || THEMES[0];
    }

    function apply() {
        const t = currentTheme();
        root.style.setProperty("--accent", t.accent);
        t.blobs.forEach((c, i) => root.style.setProperty(`--b${i + 1}`, c));
        root.style.setProperty("--blur", `${S.blur}px`);
        root.style.setProperty("--ga", S.contrast ? .9 : S.opacity / 100);
        root.style.setProperty("--r", `${S.radius}px`);
        root.style.setProperty("--fs", S.fontSize);
        root.dataset.mode = isDark() ? "dark" : "light";
        root.classList.toggle("hc", S.contrast);
        root.classList.toggle("dense", S.dense);
        root.classList.toggle("no-motion", !S.motion);
        root.classList.toggle("still", !S.bgMotion);
        const mb = document.getElementById("mode-btn");
        if (mb) mb.innerHTML = isDark() ? ICON_SUN : ICON_MOON;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = isDark() ? "#0d0e14" : "#f4f0e8";
        if (document.body) syncUI();
    }
    apply(); // מיד - לפני שהדף מצויר
    mq.addEventListener("change", () => { if (S.mode === "auto") apply(); });

    const motionOn = () => S.motion && !reduceMotion.matches;

    // מעבר מעגלי שנפרש מנקודת הלחיצה (בדפדפנים שתומכים, אחרת מעבר רגיל)
    function withTransition(fn, ev) {
        if (!document.startViewTransition || !motionOn()) { fn(); return; }
        const x = ev && ev.clientX ? ev.clientX : innerWidth / 2;
        const y = ev && ev.clientY ? ev.clientY : innerHeight / 2;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const t = document.startViewTransition(fn);
        t.ready.then(() => root.animate(
            { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 700, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" }
        )).catch(() => {});
    }

    function setTheme(i, ev) {
        withTransition(() => { S.theme = i; S.custom = null; save(); apply(); }, ev);
    }

    // ---------- פאנל "מראה ונגישות" ----------

    let panel, scrim;
    function buildPanel() {
        scrim = document.createElement("div");
        scrim.className = "ap-scrim";
        panel = document.createElement("aside");
        panel.className = "appearance-panel glass";
        panel.setAttribute("aria-label", "מראה ונגישות");
        panel.setAttribute("aria-hidden", "true");
        panel.innerHTML = `
            <button type="button" class="icon-btn ap-close" data-ap="close" aria-label="סגירה">✕</button>
            <h2>מראה ונגישות</h2>
            <p class="muted" style="margin:0">ההגדרות נשמרות במכשיר הזה.</p>

            <h3>ערכת נושא</h3>
            <div class="theme-grid">
                ${THEMES.map((t, i) => `
                    <button type="button" class="theme-tile" data-theme="${i}" aria-pressed="false" aria-label="ערכת ${t.name}">
                        <span class="pv">${t.blobs.map((c) => `<i style="background:${c}"></i>`).join("")}<em style="background:${t.accent}"></em></span>
                        <span class="nm">${t.name}</span>
                    </button>`).join("")}
            </div>
            <div class="ap-custom">
                <input type="color" id="ap-color" value="#7a6a52" aria-label="בחירת צבע משלך" />
                <div><b>צבע משלך</b><br><small class="muted">בוחרים צבע אחד, והמערכת בונה ממנו את הרקע.</small></div>
            </div>

            <h3>תצוגה</h3>
            <div class="ap-row"><div><b>מצב</b><small>בהיר, כהה או לפי המכשיר</small></div>
                <div class="seg" role="group" aria-label="מצב תצוגה">
                    <button type="button" data-mode-opt="light">בהיר</button><button type="button" data-mode-opt="dark">כהה</button><button type="button" data-mode-opt="auto">לפי המכשיר</button>
                </div></div>
            <div class="ap-row"><div><b>עוצמת הזכוכית</b><small>טשטוש הרקע מאחורי הכרטיסים</small></div>
                <div class="ap-range"><input type="range" min="0" max="40" data-range="blur" aria-label="עוצמת הזכוכית" /><output data-out="blur"></output></div></div>
            <div class="ap-row"><div><b>אטימות</b><small>שקוף יותר או מוצק יותר</small></div>
                <div class="ap-range"><input type="range" min="25" max="92" data-range="opacity" aria-label="אטימות" /><output data-out="opacity"></output></div></div>
            <div class="ap-row"><div><b>עיגול פינות</b></div>
                <div class="ap-range"><input type="range" min="4" max="32" data-range="radius" aria-label="עיגול פינות" /><output data-out="radius"></output></div></div>
            <div class="ap-row"><div><b>תצוגה צפופה</b><small>יותר מידע על המסך</small></div>
                <button type="button" class="sw-toggle" role="switch" data-toggle="dense" aria-label="תצוגה צפופה"><i></i></button></div>

            <h3>תנועה ונגישות</h3>
            <div class="ap-row"><div><b>אנימציות</b><small>מעברים, הופעת כרטיסים וספירת מספרים</small></div>
                <button type="button" class="sw-toggle" role="switch" data-toggle="motion" aria-label="אנימציות"><i></i></button></div>
            <div class="ap-row"><div><b>רקע נע</b><small>כתמי הצבע ברקע זזים לאט</small></div>
                <button type="button" class="sw-toggle" role="switch" data-toggle="bgMotion" aria-label="רקע נע"><i></i></button></div>
            <div class="ap-row"><div><b>ניגודיות גבוהה</b><small>טקסט כהה יותר וכרטיסים פחות שקופים</small></div>
                <button type="button" class="sw-toggle" role="switch" data-toggle="contrast" aria-label="ניגודיות גבוהה"><i></i></button></div>
            <div class="ap-row"><div><b>גודל טקסט</b></div>
                <div class="seg" role="group" aria-label="גודל טקסט">
                    <button type="button" data-fs="1">רגיל</button><button type="button" data-fs="1.12">גדול</button><button type="button" data-fs="1.25">גדול מאוד</button>
                </div></div>
            <div class="ap-row"><div><b>איפוס</b><small>חזרה להגדרות ההתחלתיות</small></div>
                <button type="button" class="btn-ghost btn-small" data-ap="reset">איפוס המראה</button></div>
        `;
        document.body.append(scrim, panel);

        panel.addEventListener("click", (e) => {
            const tile = e.target.closest("[data-theme]");
            if (tile) return setTheme(+tile.dataset.theme, e);
            const m = e.target.closest("[data-mode-opt]");
            if (m) return withTransition(() => { S.mode = m.dataset.modeOpt; save(); apply(); }, e);
            const tg = e.target.closest("[data-toggle]");
            if (tg) { S[tg.dataset.toggle] = !S[tg.dataset.toggle]; save(); apply(); return; }
            const fs = e.target.closest("[data-fs]");
            if (fs) { S.fontSize = +fs.dataset.fs; save(); apply(); moveIndicator(); return; }
            const a = e.target.closest("[data-ap]");
            if (a && a.dataset.ap === "close") return closePanel();
            if (a && a.dataset.ap === "reset") return withTransition(() => { S = { ...DEFAULTS }; save(); apply(); moveIndicator(); }, e);
        });
        panel.addEventListener("input", (e) => {
            const r = e.target.closest("[data-range]");
            if (r) { S[r.dataset.range] = +r.value; save(); apply(); }
            if (e.target.id === "ap-color") { S.custom = e.target.value; save(); apply(); }
        });
        scrim.addEventListener("click", closePanel);
    }

    let lastFocus = null;
    function openPanel() {
        lastFocus = document.activeElement;
        panel.classList.add("on"); scrim.classList.add("on");
        panel.setAttribute("aria-hidden", "false");
        setTimeout(() => panel.querySelector(".ap-close").focus(), 50);
    }
    function closePanel() {
        if (!panel || !panel.classList.contains("on")) return;
        panel.classList.remove("on"); scrim.classList.remove("on");
        panel.setAttribute("aria-hidden", "true");
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    const UNITS = { blur: "px", opacity: "%", radius: "px" };
    function syncUI() {
        if (!panel) return;
        panel.querySelectorAll("[data-theme]").forEach((b) => b.setAttribute("aria-pressed", !S.custom && +b.dataset.theme === S.theme));
        panel.querySelectorAll("[data-mode-opt]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.modeOpt === S.mode));
        panel.querySelectorAll("[data-fs]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.fs === S.fontSize));
        panel.querySelectorAll("[data-toggle]").forEach((b) => b.setAttribute("aria-checked", !!S[b.dataset.toggle]));
        panel.querySelectorAll("[data-range]").forEach((r) => {
            r.value = S[r.dataset.range];
            panel.querySelector(`[data-out="${r.dataset.range}"]`).textContent = S[r.dataset.range] + UNITS[r.dataset.range];
        });
        if (S.custom) panel.querySelector("#ap-color").value = S.custom;
        document.querySelectorAll("#quick-themes [data-quick]").forEach((b) => b.setAttribute("aria-pressed", !S.custom && +b.dataset.quick === S.theme));
    }

    // ---------- ניווט: סמן מחליק, כותרת, תפריט נייד ----------

    function moveIndicator() {
        const ind = document.querySelector(".nav-ind");
        const btn = document.querySelector(".nav-btn.active");
        if (!ind || !btn || !btn.offsetHeight) return;
        ind.style.transform = `translateY(${btn.offsetTop}px)`;
        ind.style.height = `${btn.offsetHeight}px`;
        if (!ind.classList.contains("on")) ind.classList.add("on");
    }

    function onNavChange() {
        const btn = document.querySelector(".nav-btn.active");
        document.querySelectorAll(".nav-btn").forEach((b) => (b === btn ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
        const title = document.getElementById("view-title");
        if (btn && title) title.textContent = btn.textContent.trim();
        moveIndicator();
        setMenu(false);
    }

    function setMenu(open) {
        const side = document.getElementById("side-nav");
        const sc = document.getElementById("side-scrim");
        const mb = document.getElementById("menu-btn");
        if (!side) return;
        side.classList.toggle("open", open);
        if (sc) sc.hidden = !open;
        if (mb) mb.setAttribute("aria-expanded", open);
    }

    // ---------- אנימציות תוכן ----------

    // אנימציית כניסה פעם אחת בכל מעבר מסך. המחלקה מוסרת בסיום, כדי שרענון של תוכן
    // (למשל פתיחת קטע בכרטיס לקוח) לא יפעיל את האנימציה שוב.
    function replay(el) {
        el.classList.remove("view-enter");
        void el.offsetWidth;
        el.classList.add("view-enter");
        clearTimeout(el._enterTimer);
        el._enterTimer = setTimeout(() => el.classList.remove("view-enter"), 900);
    }

    // ספירה עולה למספרים בכרטיסי הדשבורד
    function countUp(el) {
        const text = el.textContent;
        const m = text.match(/-?[\d,]+(\.\d+)?/);
        if (!m || !motionOn() || el.dataset.counted) return;
        el.dataset.counted = "1";
        const target = parseFloat(m[0].replace(/,/g, ""));
        if (!isFinite(target) || target === 0) return;
        const pre = text.slice(0, m.index), post = text.slice(m.index + m[0].length);
        const start = performance.now(), dur = 1200;
        (function step(now) {
            const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 4);
            el.textContent = pre + Math.round(target * e).toLocaleString("he-IL") + post;
            if (p < 1) requestAnimationFrame(step); else el.textContent = text;
        })(start);
    }

    // ברכה לפי שעה + אימוג'י, תאריך לועזי, תאריך עברי וחג (אם יש)
    function greeting() {
        const t = document.getElementById("greeting-title");
        const d = document.getElementById("greeting-date");
        if (!t) return;
        const now = new Date();
        const h = now.getHours();
        const [part, emoji] =
            h >= 5 && h < 12 ? ["בוקר טוב", "☀️"] :
            h >= 12 && h < 17 ? ["צהריים טובים", "❤️"] :
            h >= 17 && h < 21 ? ["ערב טוב", "🌙"] :
            ["לילה טוב", "🥂"];
        t.innerHTML = `${part}, אבישג <span class="greet-emoji" aria-hidden="true">${emoji}</span>`;
        if (d) {
            const greg = now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            let heb = "", hol = "";
            if (typeof hebrewDate === "function") {
                heb = hebrewDate(now);
                hol = jewishHolidays(now).map((x) => x.name).join(", ");
            }
            d.innerHTML = `${greg}${heb ? ` <span class="greet-sep">·</span> ${heb}` : ""}${hol ? ` <span class="greet-hol">${hol}</span>` : ""}`;
        }
    }
    window.renderGreeting = greeting;

    // ---------- הפעלה ----------

    document.addEventListener("DOMContentLoaded", () => {
        buildPanel();
        greeting();
        apply();

        const qt = document.getElementById("quick-themes");
        if (qt) {
            qt.innerHTML = QUICK.map((i) => `<button type="button" data-quick="${i}" aria-pressed="false" aria-label="ערכת ${THEMES[i].name}" title="${THEMES[i].name}" style="background:linear-gradient(135deg, ${THEMES[i].blobs[0]}, ${THEMES[i].accent})"></button>`).join("");
            qt.addEventListener("click", (e) => { const b = e.target.closest("[data-quick]"); if (b) setTheme(+b.dataset.quick, e); });
        }
        syncUI();

        const byId = (id) => document.getElementById(id);
        byId("appearance-btn")?.addEventListener("click", openPanel);
        byId("mode-btn")?.addEventListener("click", (e) => withTransition(() => { S.mode = isDark() ? "light" : "dark"; save(); apply(); }, e));
        byId("menu-btn")?.addEventListener("click", () => setMenu(true));
        byId("side-scrim")?.addEventListener("click", () => setMenu(false));
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePanel(); setMenu(false); } });

        // מאזינים לשינויים ש-app.js עושה (מחלקות active/hidden) - בלי לשנות את app.js
        const nav = document.querySelector(".main-nav");
        if (nav) new MutationObserver((list) => { if (list.some((m) => m.target.classList.contains("nav-btn"))) onNavChange(); })
            .observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"] });

        // כשמסך עובר ממוסתר לגלוי - מפעילים אנימציית כניסה (רק במעבר, לא בכל שינוי מחלקה)
        const watchVisible = (el) => {
            let wasHidden = el.classList.contains("hidden");
            new MutationObserver(() => {
                const hiddenNow = el.classList.contains("hidden");
                if (wasHidden && !hiddenNow && motionOn()) replay(el);
                wasHidden = hiddenNow;
            }).observe(el, { attributes: true, attributeFilter: ["class"] });
        };
        document.querySelectorAll(".app-view, #clients-list-view, #client-detail-view").forEach(watchVisible);

        const shell = byId("app-shell");
        if (shell) new MutationObserver(() => { if (!shell.classList.contains("hidden")) requestAnimationFrame(moveIndicator); })
            .observe(shell, { attributes: true, attributeFilter: ["class"] });

        const dash = byId("dashboard-container");
        if (dash) new MutationObserver(() => dash.querySelectorAll(".kpi-value").forEach(countUp))
            .observe(dash, { childList: true });

        window.addEventListener("resize", moveIndicator);
        if (document.fonts) document.fonts.ready.then(moveIndicator);

        // אור שעוקב אחרי העכבר על כרטיסים
        const SPOT = ".kpi-card, .detail-section, .dashboard-section, .status-card, .login-card";
        document.addEventListener("pointermove", (e) => {
            const c = e.target.closest && e.target.closest(SPOT);
            if (!c) return;
            c.classList.add("spot");
            const r = c.getBoundingClientRect();
            c.style.setProperty("--mx", `${e.clientX - r.left}px`);
            c.style.setProperty("--my", `${e.clientY - r.top}px`);
        }, { passive: true });

        // אדווה בלחיצה על כפתורים
        document.addEventListener("pointerdown", (e) => {
            const b = e.target.closest("button");
            if (!b || !motionOn() || b.classList.contains("nav-btn") || b.classList.contains("badge")) return;
            const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
            const sp = document.createElement("span");
            sp.className = "ripple";
            sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
            b.append(sp);
            setTimeout(() => sp.remove(), 650);
        });
    });
})();
