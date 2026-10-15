// ============================================================
// מסך "ראשי" (שלב 11, עודכן בעדכון ט')
// 1. לוז שבועי - שבוע א'-ש', עם מעבר לשבוע קודם/הבא, תאריך עברי וחגים.
//    האירועים נקראים מטבלת calendar_events, שתתמלא מיומן Google ייעודי בשלב 12.
// 2. משימות פתוחות - מכל הלקוחות + משימות כלליות (בלי לקוח), הקרובות ביותר למעלה.
// 3. מספרים - ממתין לגבייה, פרויקטים פעילים, פניות פתוחות, עמלות ממתינות.
// חייב להיטען אחרי js/app.js, js/ui.js וקבצי המסכים (PAYMENT_STATUS, LEAD_STATUS,
// COMMISSION_STATUS, TASK_STATUS).
// ============================================================

const dashboardContainer = document.getElementById("dashboard-container");

const DASH_TASKS_LIMIT = 8;
const GENERAL_TASK_LABEL = "משימה כללית";
const WEEKDAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

let dashWeekOffset = 0;      // 0 = השבוע, -1 = שבוע שעבר, 1 = שבוע הבא
let dashTasks = [];
let dashClientNames = {};

// ---------- עזרי תאריכים ----------

function startOfWeek(offset) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + offset * 7); // יום ראשון
    return d;
}

function isoDay(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysFromToday(isoDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = isoDate.split("-").map(Number);
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function shekel(n) {
    return `₪${Number(n || 0).toLocaleString("he-IL")}`;
}

// ---------- טעינה ----------

async function loadDashboardView() {
    if (typeof renderGreeting === "function") renderGreeting();
    dashboardContainer.innerHTML = `<p class="muted">טוענת נתונים...</p>`;

    const [
        { data: leadsData, error: leadsError },
        { data: clientsData, error: clientsError },
        { data: paymentsData, error: paymentsError },
        { data: commissionData, error: commissionError },
        { data: tasksData, error: tasksError },
    ] = await Promise.all([
        client.from("leads").select("id, status"),
        client.from("clients").select("id, full_name, status"),
        client.from("payments").select("id, amount, status"),
        client.from("commission_income").select("id, commission_amount, status"),
        client.from("tasks").select("*").eq("status", TASK_STATUS.OPEN),
    ]);

    if (leadsError || clientsError || paymentsError || commissionError) {
        dashboardContainer.innerHTML = `<p class="error-text">שגיאה בטעינת הנתונים למסך הראשי.</p>`;
        return;
    }

    dashClientNames = {};
    (clientsData || []).forEach((c) => { dashClientNames[c.id] = c.full_name; });
    dashTasks = tasksError ? [] : (tasksData || []);

    dashboardContainer.innerHTML = `
        <section class="week-cal" aria-label="לוז שבועי">
            <div class="wc-head">
                <div class="wc-title">
                    <h3>הלוז השבועי</h3>
                    <span class="muted" id="wc-range"></span>
                </div>
                <span class="wc-sync" title="האירועים יגיעו מיומן Google ייעודי שיחובר בשלב 12">יומן Google · יחובר בהמשך</span>
                <div class="wc-nav" role="group" aria-label="מעבר בין שבועות">
                    <button type="button" class="btn-act" data-week="-1" title="שבוע קודם" aria-label="שבוע קודם">${UI_ICONS.prev}</button>
                    <button type="button" class="btn-ghost btn-small" data-week="0">השבוע</button>
                    <button type="button" class="btn-act" data-week="1" title="שבוע הבא" aria-label="שבוע הבא">${UI_ICONS.next}</button>
                </div>
            </div>
            <div class="wc-grid" id="wc-grid"></div>
        </section>

        <div class="dash-row">
            <section class="dashboard-section tasks-panel" aria-labelledby="dash-tasks-title">
                <div class="tp-head">
                    <h3 id="dash-tasks-title">משימות פתוחות <span class="tp-count" id="dash-tasks-count"></span></h3>
                    <button type="button" class="btn-act btn-act-add" data-action="dash-add-task" title="משימה כללית חדשה" aria-label="משימה כללית חדשה">${UI_ICONS.plus}</button>
                </div>
                <ul class="dt-list" id="dash-tasks-list"></ul>
                ${tasksError ? `<p class="error-text">שגיאה בטעינת משימות.</p>` : ""}
            </section>
            ${renderDashboardKpis(leadsData || [], clientsData || [], paymentsData || [], commissionData || [])}
        </div>
    `;

    renderDashboardTasks();
    loadWeekCalendar();
}

// ---------- מספרים ----------

function renderDashboardKpis(leads, clients, payments, commissions) {
    const pendingRows = payments.filter((p) => p.status === PAYMENT_STATUS.PENDING);
    const pendingTotal = pendingRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const commissionPendingTotal = commissions
        .filter((c) => c.status === COMMISSION_STATUS.PENDING)
        .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    const openLeadsCount = leads.filter((l) => l.status === LEAD_STATUS.OPEN).length;
    const CLOSED_CLIENT_STATUSES = ["סגור/ארכיון", "ויתר"];
    const activeClients = clients.filter((c) => !CLOSED_CLIENT_STATUSES.includes(c.status));

    const card = (view, cls, label, value, sub) => `
        <div class="kpi-card ${cls}" data-go="${view}" role="button" tabindex="0" aria-label="${label}: ${value}. מעבר למסך">
            <span class="kpi-label">${label}</span>
            <span class="kpi-value">${value}</span>
            <span class="kpi-sub">${sub}</span>
        </div>`;

    return `
        <div class="kpi-grid kpi-side">
            ${card("payments", "kpi-blue", "ממתין לגבייה", shekel(pendingTotal), `${pendingRows.length} תשלומים בהמתנה`)}
            ${card("clients", "kpi-purple", "פרויקטים פעילים", activeClients.length, "לקוחות שאינם סגורים")}
            ${card("leads", "kpi-amber", "פניות פתוחות", openLeadsCount, "ממתינות לטיפול")}
            ${card("commission", "kpi-gray", "עמלות ממתינות", shekel(commissionPendingTotal), "מחברות עיצוב")}
        </div>`;
}

// ---------- לוז שבועי ----------

async function loadWeekCalendar() {
    const grid = document.getElementById("wc-grid");
    if (!grid) return;
    const start = startOfWeek(dashWeekOffset);
    const end = new Date(start); end.setDate(end.getDate() + 7);

    const fmt = (d, opts) => d.toLocaleDateString("he-IL", opts);
    const last = new Date(end); last.setDate(last.getDate() - 1);
    const sameMonth = start.getMonth() === last.getMonth();
    document.getElementById("wc-range").textContent =
        `${sameMonth ? start.getDate() : fmt(start, { day: "numeric", month: "long" })}–${fmt(last, { day: "numeric", month: "long" })} · ${hebrewDateShort(start)} – ${hebrewDateShort(last)}`;

    document.querySelectorAll(".wc-nav [data-week]").forEach((b) => {
        if (b.dataset.week === "0") b.disabled = dashWeekOffset === 0;
    });

    let events = [];
    const { data, error } = await client
        .from("calendar_events")
        .select("id, title, start_time, end_time, event_type, client_id")
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString())
        .order("start_time", { ascending: true });
    if (!error) events = data || [];

    const todayIso = isoDay(new Date());
    let html = "";
    for (let i = 0; i < 7; i++) {
        const day = new Date(start); day.setDate(day.getDate() + i);
        const iso = isoDay(day);
        const holidays = jewishHolidays(day);
        const dayEvents = events.filter((ev) => isoDay(new Date(ev.start_time)) === iso);
        const shown = dayEvents.slice(0, 3);
        const classes = ["wc-day"];
        if (iso === todayIso) classes.push("is-today");
        if (i === 6) classes.push("is-shabbat");
        if (holidays.some((h) => h.major)) classes.push("is-holiday");
        if (iso < todayIso) classes.push("is-past");

        html += `
            <div class="${classes.join(" ")}">
                <div class="wc-dh">
                    <span class="wc-dn">${WEEKDAY_NAMES[i]}</span>
                    <span class="wc-num">${day.getDate()}</span>
                </div>
                <div class="wc-heb">${hebrewDateShort(day)}</div>
                ${holidays.map((h) => `<span class="wc-hol ${h.major ? "major" : ""}">${h.name}</span>`).join("")}
                <ul class="wc-ev">
                    ${shown.map((ev) => {
                        const t = new Date(ev.start_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
                        const attrs = ev.client_id ? `data-action="dash-open-client" data-client-id="${ev.client_id}" role="button" tabindex="0"` : "";
                        return `<li ${attrs} title="${escapeHtml(ev.title || "")}"><time>${t}</time> ${escapeHtml(ev.title || "")}</li>`;
                    }).join("")}
                    ${dayEvents.length > shown.length ? `<li class="wc-more">ועוד ${dayEvents.length - shown.length}</li>` : ""}
                </ul>
            </div>`;
    }
    grid.innerHTML = html;

    // במסך צר הלוז נגלל לצדדים - מביאים את היום הנוכחי לתצוגה
    if (grid.scrollWidth > grid.clientWidth + 4) {
        const today = grid.querySelector(".is-today");
        if (today) grid.scrollLeft = today.offsetLeft - grid.clientWidth / 2 + today.offsetWidth / 2;
    }
}

// ---------- משימות פתוחות ----------

function dueInfo(due) {
    if (!due) return { cls: "none", label: "ללא תאריך" };
    const n = daysFromToday(due);
    if (n < 0) return { cls: "late", label: n === -1 ? "באיחור של יום" : `באיחור של ${-n} ימים` };
    if (n === 0) return { cls: "today", label: "היום" };
    if (n === 1) return { cls: "soon", label: "מחר" };
    if (n <= 7) return { cls: "soon", label: `בעוד ${n} ימים` };
    return { cls: "later", label: formatDate(due) };
}

function renderDashboardTasks() {
    const list = document.getElementById("dash-tasks-list");
    if (!list) return;

    // הקרובות ביותר למעלה (כולל משימות באיחור), משימות בלי תאריך בסוף
    const sorted = [...dashTasks].sort((a, b) => {
        if (!a.due_date && !b.due_date) return (a.title || "").localeCompare(b.title || "", "he");
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
    });

    document.getElementById("dash-tasks-count").textContent = sorted.length ? `(${sorted.length})` : "";

    if (sorted.length === 0) {
        list.innerHTML = `<li class="dt-empty">אין משימות פתוחות. אפשר להוסיף משימה כללית בכפתור +</li>`;
        return;
    }

    const shown = sorted.slice(0, DASH_TASKS_LIMIT);
    list.innerHTML = shown.map((t) => {
        const due = dueInfo(t.due_date);
        const who = t.client_id
            ? `<button type="button" class="link-btn" data-action="dash-open-client" data-client-id="${t.client_id}">${escapeHtml(dashClientNames[t.client_id] || "לקוח")}</button>`
            : `<span class="dt-general">${GENERAL_TASK_LABEL}</span>`;
        return `
            <li class="dt-row" data-task-id="${t.id}">
                <input type="checkbox" class="dt-check" data-action="dash-task-done" data-id="${t.id}" aria-label="סימון ${escapeHtml(t.title)} כבוצעה" />
                <div class="dt-main">
                    <span class="dt-title">${escapeHtml(t.title)}</span>
                    <span class="dt-meta">${who}</span>
                </div>
                <span class="dt-due ${due.cls}">${due.label}</span>
            </li>`;
    }).join("") + (sorted.length > shown.length
        ? `<li class="dt-more"><button type="button" class="link-btn" data-go="tasks">ועוד ${sorted.length - shown.length} משימות - לכל המשימות</button></li>`
        : "");
}

async function markDashboardTaskDone(id, checkbox) {
    const { error } = await client.from("tasks").update({ status: TASK_STATUS.DONE }).eq("id", id);
    if (error) {
        checkbox.checked = false;
        showToast("שגיאה בעדכון המשימה", "error");
        return;
    }
    const row = checkbox.closest(".dt-row");
    if (row) row.classList.add("is-done");
    showToast("המשימה סומנה כבוצעה");
    setTimeout(() => {
        dashTasks = dashTasks.filter((t) => t.id !== id);
        renderDashboardTasks();
    }, 450);
}

function openGeneralTaskModal() {
    openModal(`
        <h2>משימה כללית חדשה</h2>
        <p class="muted">משימה שלא שייכת לאף לקוח, למשל "לחדש ביטוח לסטודיו".</p>
        <form id="general-task-form">
            <label for="general-task-title">המשימה *</label>
            <input type="text" id="general-task-title" required />
            <label for="general-task-due">תאריך יעד</label>
            <input type="date" id="general-task-due" />
            <p class="error-text" id="general-task-error"></p>
            <div class="modal-actions">
                <button type="button" class="btn-ghost" data-action="close-modal">ביטול</button>
                <button type="submit">הוספה</button>
            </div>
        </form>
    `);
    document.getElementById("general-task-title").focus();
    document.getElementById("general-task-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("general-task-title").value.trim();
        const due = document.getElementById("general-task-due").value || null;
        const errorEl = document.getElementById("general-task-error");
        if (!title) { errorEl.textContent = "כתבי מה המשימה."; return; }

        const { data, error } = await client.from("tasks").insert({
            client_id: null,
            title,
            due_date: due,
            status: TASK_STATUS.OPEN,
            stage_source: GENERAL_TASK_LABEL,
            reminder_active: false,
        }).select().single();

        if (error) {
            // אם עמודת client_id עדיין מוגדרת כחובה ב-DB, צריך להריץ את המיגרציה (ראו מסמך האב)
            errorEl.textContent = /client_id/.test(error.message)
                ? "המערכת עוד לא מוכנה למשימות כלליות. צריך להריץ עדכון קטן בבסיס הנתונים (מופיע במסמך האב)."
                : `שגיאה בשמירה: ${error.message}`;
            return;
        }
        closeModal();
        dashTasks.push(data);
        renderDashboardTasks();
        showToast("המשימה נוספה");
    });
}

// ---------- אירועים ----------

dashboardContainer.addEventListener("click", async (e) => {
    const weekBtn = e.target.closest("[data-week]");
    if (weekBtn) {
        const step = Number(weekBtn.dataset.week);
        dashWeekOffset = step === 0 ? 0 : dashWeekOffset + step;
        loadWeekCalendar();
        return;
    }
    if (e.target.closest('[data-action="dash-add-task"]')) return openGeneralTaskModal();

    const clientBtn = e.target.closest('[data-action="dash-open-client"]');
    if (clientBtn) {
        await switchView("clients");
        await openClientDetail(clientBtn.dataset.clientId);
        return;
    }
    const go = e.target.closest("[data-go]");
    if (go) switchView(go.dataset.go);
});

dashboardContainer.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest('[data-go][role="button"], [data-action="dash-open-client"][role="button"]');
    if (el) { e.preventDefault(); el.click(); }
});

dashboardContainer.addEventListener("change", (e) => {
    const cb = e.target.closest('[data-action="dash-task-done"]');
    if (cb && cb.checked) markDashboardTaskDone(cb.dataset.id, cb);
});
