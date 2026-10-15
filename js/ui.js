// ============================================================
// עזרי ממשק משותפים
// ------------------------------------------------------------
// 1. כפתורי פעולה אחידים (עריכה / מחיקה) - אייקון זהה בכל המערכת
// 2. מחוון מיון עדין שלא משנה את רוחב העמודה
// 3. תאריך עברי (בגימטריה) וחגי ישראל - לברכה ולתצוגת היומן
// נטען אחרי js/app.js ולפני קבצי המסכים.
// ============================================================

// ---------- 1. כפתורי פעולה ----------

const UI_ICONS = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14 7 3 3"/></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 6-6 6 6 6"/></svg>',
};

// attrs = מחרוזת מאפיינים, למשל: data-action="edit-lead" data-id="..."
function editBtn(attrs, label = "עריכה") {
    return `<button type="button" class="btn-act" ${attrs} title="${label}" aria-label="${label}">${UI_ICONS.edit}</button>`;
}

function deleteBtn(attrs, label = "מחיקה") {
    return `<button type="button" class="btn-act btn-act-del" ${attrs} title="${label}" aria-label="${label}">${UI_ICONS.delete}</button>`;
}

// ---------- 2. מחוון מיון ----------

// תמיד מחזיר אלמנט באותו רוחב (גם כשהעמודה לא ממוינת), כך שרוחב העמודה לא קופץ.
function sortIndicator(isActive, direction) {
    const cls = isActive ? (direction === "asc" ? "asc" : "desc") : "";
    return `<span class="sort-ind ${cls}" aria-hidden="true"></span>`;
}

// ---------- 3. תאריך עברי וחגים ----------

const HEB_MONTHS = {
    Tishri: "תשרי", Heshvan: "חשוון", Kislev: "כסלו", Tevet: "טבת", Shevat: "שבט",
    Adar: "אדר", "Adar I": "אדר א׳", "Adar II": "אדר ב׳", Nisan: "ניסן", Iyar: "אייר",
    Sivan: "סיוון", Tamuz: "תמוז", Av: "אב", Elul: "אלול",
};

const _hebPartsFmt = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" });

function hebrewParts(date) {
    const parts = _hebPartsFmt.formatToParts(date);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    return { day: Number(get("day")), month: get("month"), year: Number(get("year")) };
}

// מספר בגימטריה: 15 → ט״ו, 787 → תשפ״ז
function gematria(num) {
    const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    let n = num % 1000;
    let out = "";
    while (n >= 400) { out += "ת"; n -= 400; }
    out += ["", "ק", "ר", "ש"][Math.floor(n / 100)];
    n %= 100;
    if (n === 15) out += "טו";
    else if (n === 16) out += "טז";
    else out += tens[Math.floor(n / 10)] + ones[n % 10];
    return out.length === 1 ? `${out}׳` : `${out.slice(0, -1)}״${out.slice(-1)}`;
}

// "ד׳ בחשוון תשפ״ז" (או בלי שנה)
function hebrewDate(date, withYear = true) {
    const p = hebrewParts(date);
    const month = HEB_MONTHS[p.month] || p.month;
    return `${gematria(p.day)} ב${month}${withYear ? ` ${gematria(p.year)}` : ""}`;
}

function hebrewDateShort(date) {
    const p = hebrewParts(date);
    return `${gematria(p.day)} ${HEB_MONTHS[p.month] || p.month}`;
}

// חגים ומועדים בישראל לתאריך נתון. major = יום חג (שבתון).
function jewishHolidays(date) {
    const { day: d, month: m } = hebrewParts(date);
    const dow = date.getDay(); // 0 = ראשון
    const out = [];
    const add = (name, major = false) => out.push({ name, major });
    const adarOfPurim = m === "Adar" || m === "Adar II";

    if (m === "Elul" && d === 29) add("ערב ראש השנה");
    if (m === "Tishri") {
        if (d === 1 || d === 2) add("ראש השנה", true);
        if (d === 3 && dow !== 6) add("צום גדליה");
        if (d === 4 && dow === 0) add("צום גדליה");
        if (d === 9) add("ערב יום כיפור");
        if (d === 10) add("יום כיפור", true);
        if (d === 14) add("ערב סוכות");
        if (d === 15) add("סוכות", true);
        if (d >= 16 && d <= 20) add("חול המועד סוכות");
        if (d === 21) add("הושענא רבה");
        if (d === 22) add("שמחת תורה", true);
    }
    if (m === "Kislev" && d >= 25) add(`חנוכה, נר ${d - 24}`);
    if (m === "Tevet" && d <= 3) {
        // חנוכה נמשך 8 ימים מכ״ה בכסלו - בודקים כמה ימים עברו מאז
        for (let back = 1; back <= 8; back++) {
            const prev = new Date(date); prev.setDate(prev.getDate() - back);
            const pp = hebrewParts(prev);
            if (pp.month === "Kislev" && pp.day === 25) { if (back <= 7) add(`חנוכה, נר ${back + 1}`); break; }
        }
    }
    if (m === "Tevet" && d === 10) add("צום עשרה בטבת");
    if (m === "Shevat" && d === 15) add("ט״ו בשבט");
    if (adarOfPurim) {
        if (d === 13 && dow !== 6 && dow !== 5) add("תענית אסתר");
        if (d === 11 && dow === 4) add("תענית אסתר");
        if (d === 14) add("פורים");
        if (d === 15) add("שושן פורים");
    }
    if (m === "Nisan") {
        if (d === 14) add("ערב פסח");
        if (d === 15) add("פסח", true);
        if (d >= 16 && d <= 20) add("חול המועד פסח");
        if (d === 21) add("שביעי של פסח", true);
        // יום השואה: כ״ז בניסן, נדחה/מוקדם כשנופל ליד שבת
        if ((d === 27 && dow !== 5 && dow !== 0) || (d === 26 && dow === 4) || (d === 28 && dow === 1)) add("יום השואה");
    }
    if (m === "Iyar") {
        // יום הזיכרון ויום העצמאות - לפי כללי ההקדמה/דחייה
        const atzmaut = (d === 5 && dow === 3) || (d === 4 && dow === 4) || (d === 3 && dow === 4) || (d === 6 && dow === 2);
        const zikaron = (d === 4 && dow === 2) || (d === 3 && dow === 3) || (d === 2 && dow === 3) || (d === 5 && dow === 1);
        if (zikaron) add("יום הזיכרון");
        if (atzmaut) add("יום העצמאות", true);
        if (d === 18) add("ל״ג בעומר");
        if (d === 28) add("יום ירושלים");
    }
    if (m === "Sivan") {
        if (d === 5) add("ערב שבועות");
        if (d === 6) add("שבועות", true);
    }
    if (m === "Tamuz" && ((d === 17 && dow !== 6) || (d === 18 && dow === 0))) add("צום י״ז בתמוז");
    if (m === "Av") {
        if ((d === 9 && dow !== 6) || (d === 10 && dow === 0)) add("תשעה באב");
        if (d === 15) add("ט״ו באב");
    }
    return out;
}
