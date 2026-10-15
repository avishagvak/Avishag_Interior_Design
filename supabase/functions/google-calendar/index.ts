// ============================================================
// Supabase Edge Function: google-calendar
// מחזירה את אירועי יומן Google הייעודי של אבישג לטווח תאריכים (לתצוגת "הלוז השבועי").
//
// איך זה עובד: Google מספק לכל יומן "כתובת סודית בפורמט iCal". הכתובת נשמרת
// כסוד (Secret) ב-Supabase בשם GOOGLE_CALENDAR_ICS_URL ולא מופיעה בקוד האתר,
// כך שאף אחד לא יכול לראות אותה בדפדפן. הפונקציה מושכת את היומן, פורסת אירועים
// חוזרים ומחזירה רק את האירועים שבטווח המבוקש.
//
// קריאה מהאתר:  client.functions.invoke("google-calendar", { body: { from, to } })
// (רק משתמשת מחוברת - Supabase בודק את ההתחברות לפני שהפונקציה רצה)
// ============================================================

import ICAL from "npm:ical.js@2.1.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });


function expandIcs(icsText: string, from: Date, to: Date) {
    const root = new ICAL.Component(ICAL.parse(icsText));
    for (const tz of root.getAllSubcomponents("vtimezone")) {
        ICAL.TimezoneService.register(new ICAL.Timezone(tz));
    }
    const vevents = root.getAllSubcomponents("vevent");
    const overrides = vevents.filter((v) => v.hasProperty("recurrence-id"));
    const out: Record<string, unknown>[] = [];
    // deno-lint-ignore no-explicit-any
    const push = (item: any, start: any, end: any, allDay: boolean) => {
        if ((item.component.getFirstPropertyValue("status") || "").toUpperCase() === "CANCELLED") return;
        const s = start.toJSDate(), e = (end || start).toJSDate();
        if (!(e > from && s < to)) return;
        out.push({
            id: `${item.uid}_${start.toString()}`,
            title: item.summary || "(ללא כותרת)",
            location: item.location || null,
            all_day: allDay,
            start_time: allDay ? start.toString() : s.toISOString(),
            end_time: allDay ? (end || start).toString() : e.toISOString(),
        });
    };
    for (const v of vevents) {
        if (v.hasProperty("recurrence-id")) continue;
        const ev = new ICAL.Event(v);
        overrides.filter((o) => o.getFirstPropertyValue("uid") === ev.uid).forEach((o) => ev.relateException(o));
        if (ev.isRecurring()) {
            const it = ev.iterator();
            let next, guard = 0;
            while ((next = it.next()) && guard++ < 3000) {
                if (next.toJSDate() >= to) break;
                const d = ev.getOccurrenceDetails(next);
                push(d.item, d.startDate, d.endDate, d.startDate.isDate);
            }
        } else {
            push(ev, ev.startDate, ev.endDate, ev.startDate.isDate);
        }
    }
    out.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    return out;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const icsUrl = Deno.env.get("GOOGLE_CALENDAR_ICS_URL");
    if (!icsUrl) return json({ error: "not_configured" }, 503);

    try {
        const { from, to } = await req.json();
        const fromDate = new Date(from), toDate = new Date(to);
        if (isNaN(+fromDate) || isNaN(+toDate) || toDate <= fromDate) return json({ error: "bad_range" }, 400);

        const res = await fetch(icsUrl);
        if (!res.ok) return json({ error: `google_${res.status}` }, 502);
        const events = expandIcs(await res.text(), fromDate, toDate);
        return json({ events });
    } catch (e) {
        return json({ error: String(e) }, 500);
    }
});
