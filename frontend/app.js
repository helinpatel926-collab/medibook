const TYPES = ["New patient", "Follow-up", "Consultation", "Annual physical", "Vaccination"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STAFF_VIEWS = ["dashboard", "appointments", "patients", "doctors"];
const SESSION_KEY = "medibook-session";
const THEME_KEY = "medibook-theme-v4";
const P = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 2.8 3 6"/>',
  steth: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/><path d="M3.5 12h5l1.5-3 3 6 1.5-3h6"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5.5 12 3c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01"/>',
  bone: '<path d="M17 10c.7-.7 1.7 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .8.7 1.8 0 2.5l-7 7c-.7.7-1.7 0-2.5 0a2.5 2.5 0 0 0 0 5c.3 0 .5.2.5.5a2.5 2.5 0 1 0 5 0c0-.8-.7-1.8 0-2.5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};
const icon = (n, c = "ico") => `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Object.prototype.hasOwnProperty.call(P, n) ? P[n] : ""}</svg>`;
const STATUS = { scheduled: ["Scheduled", "clock"], completed: ["Completed", "check"], cancelled: ["Cancelled", "x"] };
const stat = s => STATUS[s] || [String(s || "Unknown"), "clock"];

let doctors = [];
let depts = [];
let catalogReady = false;
let pub = { next: null, nextAt: null, open: null };
let avail = { doctorId: "", days: null, err: "" };
let availSeq = 0;
const freshState = () => ({ appts: [], patients: [], ready: false });
let state = freshState();
let staffGen = 0;
const schedule = {};
const schedFailed = new Set();
const busy = {};
const errs = {};
let session = null;
let current = "home";
let wiz = null;
let filters = { q: "", doctor: "all", status: "all", range: "upcoming" };
let apView = "list";
let calDate = "";
let apLimit = 40;
let patientQuery = "";
let pickedTime = "";
let returnToBooking = null;
let bookedCache = null;
let profileId = "";
let profileTab = "overview";
let themePref = "light";
const initialThemeAttr = document.documentElement.getAttribute("data-theme");

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parseDay = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ymd(new Date());
const nowKey = () => { const n = new Date(); return `${ymd(n)}T${pad(n.getHours())}:${pad(n.getMinutes())}`; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sameId = (a, b) => String(a) === String(b);
const doctorById = id => doctors.find(d => d.id === id);
const docOf = id => doctorById(id) || { id, name: String(id || "Unknown doctor"), dept: "", room: "—", days: [], langs: [] };
const patientById = id => state.patients.find(p => sameId(p.id, id));
const patientOf = a => patientById(a.patientId) || { id: a.patientId, name: a.patientName || "Unknown patient", mrn: a.patientMrn || "" };
const apptById = id => state.appts.find(a => sameId(a.id, id));
const nextFor = id => (pub.next && pub.next.get(id)) || null;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const sentence = s => (/[.!?]$/.test(s) ? s : `${s}.`);
const initials = name => String(name).replace(/^Dr\.\s*/, "").trim().split(/\s+/).map(w => w[0] || "").slice(0, 2).join("").toUpperCase();
const digits = s => String(s || "").replace(/\D/g, "");
const smooth = () => (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const roleLabel = r => String(r || "Staff").replace(/[_-]+/g, " ").replace(/^\w/, c => c.toUpperCase());

function fmtTime(t) { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "a.m." : "p.m."}`; }
function fmtShort(ds) { const d = parseDay(ds); return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; }
function fmtDay(ds) {
  const t = new Date();
  if (ds === ymd(t)) return "Today";
  if (ds === ymd(addDays(t, 1))) return "Tomorrow";
  if (ds === ymd(addDays(t, -1))) return "Yesterday";
  return fmtShort(ds);
}
function fmtLong(ds) { const d = parseDay(ds); return `${DAY_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function fmtDate(ds) { const d = parseDay(ds); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function fmtWhen(start) { return `${fmtDay(start.slice(0, 10))}, ${fmtTime(start.slice(11))}`; }
function monthsOld(dob) {
  const b = parseDay(dob), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  return m;
}
function ageLabel(dob) { if (!dob) return "—"; const m = monthsOld(dob); return m < 24 ? `${m} mo` : `${Math.floor(m / 12)}`; }

const mapDoctor = d => ({ id: String(d.id), name: d.name || "", dept: d.department || "", room: d.room || "", days: Array.isArray(d.days) ? d.days.map(Number) : [], langs: Array.isArray(d.languages) ? d.languages : [] });
const mapDept = d => ({ name: d.name || "", icon: d.icon || "", text: d.description || "" });
const mapPatient = p => ({ id: p.id, mrn: p.mrn || "", name: p.full_name || "", dob: p.dob || "", phone: p.phone || "", email: p.email || "", card: p.health_card || "", created: String(p.created_at || "").slice(0, 10) });
const mapAppt = a => ({ id: a.id, ref: a.ref || "", patientId: a.patient_id, patientName: a.patient_name || "", patientMrn: a.patient_mrn || "", doctorId: String(a.doctor_id || ""), start: String(a.start || "").replace(" ", "T").slice(0, 16), type: a.type || "", reason: a.reason || "", status: a.status, source: a.source === "online" ? "online" : "staff", createdTs: Date.parse(a.created_at) || 0 });

function apiError(message, status, extra) { return Object.assign(new Error(message), { api: true, status }, extra); }
function detailText(data, status) {
  const d = data && data.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d) && d.length) {
    const msgs = [...new Set(d.map(x => String((x && x.msg) || x || "").replace(/^Value error,\s+/i, "").trim()).filter(Boolean))];
    if (msgs.length) return msgs.map(m => (/[.!?]$/.test(m) ? m : `${m}.`)).join(" ");
  }
  if (status >= 502 && status <= 504) return "The service is temporarily unavailable. Please try again in a moment.";
  return `Something went wrong (error ${status}). Please try again.`;
}
async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && session) headers.Authorization = `Bearer ${session.token}`;
  let res;
  try { res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" }); }
  catch (e) { throw apiError("Can't reach the server. Check your connection and try again.", 0); }
  let data = null;
  try { const text = await res.text(); data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (res.status === 401 && auth) { sessionEnded(); throw apiError("Your session has ended. Please sign in again.", 401, { silent: true }); }
  if (!res.ok) throw apiError(detailText(data, res.status), res.status);
  return data;
}
function fail(err) {
  if (err && err.silent) return;
  if (!err || !err.api) console.error(err);
  toast(err && err.api ? err.message : "Something went wrong. Please try again.");
}

function load() {
  try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) { session = null; }
  if (session && !session.token) session = null;
  try { themePref = localStorage.getItem(THEME_KEY) || "light"; } catch (e) { themePref = "light"; }
}
function clearSession() {
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  state = freshState();
  staffGen++;
  bookedCache = null;
  profileId = "";
  patientQuery = "";
  returnToBooking = null;
  [dlgBook, dlgPatient, dlgProfile].forEach(d => { if (d.open) d.close(); });
}
function sessionEnded() {
  if (!session) return;
  const wasStaff = current.startsWith("staff-");
  clearSession();
  if (wasStaff) go("login");
  toast("Your session has ended. Please sign in again.");
}

function once(key, run) {
  if (!busy[key]) {
    errs[key] = "";
    busy[key] = run().catch(err => { errs[key] = err.message; throw err; }).finally(() => { delete busy[key]; });
  }
  return busy[key];
}
const failed = key => !busy[key] && errs[key];
function ensureCatalog() {
  if (catalogReady) return Promise.resolve();
  return once("catalog", () => Promise.all([api("/api/public/doctors"), api("/api/public/departments")]).then(([docs, deps]) => {
    doctors = (Array.isArray(docs) ? docs : []).map(mapDoctor);
    depts = (Array.isArray(deps) ? deps : []).map(mapDept);
    catalogReady = true;
    fillDoctorSelects();
  }));
}
function loadNext() {
  return once("next", () => api("/api/public/next-available").then(list => {
    pub.next = new Map((Array.isArray(list) ? list : []).filter(x => x && x.doctor_id && x.date && x.time).map(x => [String(x.doctor_id), { ds: x.date, time: String(x.time).slice(0, 5) }]));
    pub.nextAt = new Date();
  }));
}
function loadSummary() {
  return once("summary", () => api("/api/public/summary").then(r => { pub.open = Number(r && r.open_slots_7d) || 0; }));
}
function ensureSchedule(from, days) {
  const base = parseDay(from), missing = [];
  for (let i = 0; i < days; i++) { const ds = ymd(addDays(base, i)); if (!schedule[ds]) missing.push(ds); }
  if (!missing.length) return Promise.resolve();
  const start = missing[0], last = missing[missing.length - 1];
  const n = Math.min(90, Math.round((parseDay(last) - parseDay(start)) / 86400000) + 1);
  return once(`slots:${start}:${n}`, () => api(`/api/public/slots?start=${start}&days=${n}`).then(r => {
    Object.entries((r && r.dates) || {}).forEach(([ds, v]) => {
      const docs = {};
      Object.entries((v && v.doctors) || {}).forEach(([id, list]) => { docs[id] = (Array.isArray(list) ? list : []).map(t => String(t).slice(0, 5)); });
      schedule[ds] = { closed_reason: (v && v.closed_reason) || null, doctors: docs };
      schedFailed.delete(ds);
    });
    missing.forEach(ds => { if (!schedule[ds]) schedFailed.add(ds); });
  }).catch(err => { missing.forEach(ds => schedFailed.add(ds)); throw err; }));
}
const doctorSlots = (docId, ds) => (schedule[ds] && schedule[ds].doctors[docId]) || [];
const closedReason = ds => (schedule[ds] ? schedule[ds].closed_reason : null);
function clinicSlots(ds) { const d = schedule[ds]; return d ? [...new Set(Object.values(d.doctors).flat())].sort() : []; }
function closedNote(ds, doc) {
  const r = closedReason(ds), wd = parseDay(ds).getDay();
  if (!schedule[ds]) return "The clinic schedule for this day couldn't be loaded.";
  if (r === "Sunday") return "The clinic is closed on Sundays.";
  if (r) return `The clinic is closed for ${r}.`;
  if (doc) return `${doc.name} isn't in clinic on ${DAY_PLURAL[wd]}.`;
  return "No doctors are in clinic on this day.";
}
async function fetchStaff() {
  const token = session.token, gen = staffGen;
  const [, appts, patients, schedErr] = await Promise.all([
    ensureCatalog(),
    api("/api/staff/appointments", { auth: true }),
    api("/api/staff/patients", { auth: true }),
    ensureSchedule(ymd(addDays(new Date(), -21)), 90).then(() => null, err => err)
  ]);
  if (!session) return;
  if (session.token !== token || gen !== staffGen) return fetchStaff();
  state.appts = (Array.isArray(appts) ? appts : []).map(mapAppt);
  state.patients = (Array.isArray(patients) ? patients : []).map(mapPatient);
  state.ready = true;
  bookedCache = null;
  if (schedErr) fail(schedErr);
}
function loadStaff() {
  if (!session) return Promise.resolve();
  return once("staff", fetchStaff);
}
function resetAvail() { availSeq++; avail = { doctorId: "", days: null, err: "" }; }
function loadAvail(docId) {
  const seq = ++availSeq;
  avail = { doctorId: docId, days: null, err: "" };
  api(`/api/public/availability?doctor_id=${encodeURIComponent(docId)}&limit=12`).then(r => {
    if (seq !== availSeq) return;
    avail.days = (r && Array.isArray(r.days) ? r.days : []).map(x => {
      const slots = (Array.isArray(x.slots) ? x.slots : []).map(s => ({ time: String(s.time).slice(0, 5), free: Boolean(s.free) }));
      return { ds: x.date, n: Number.isFinite(x.open) ? x.open : slots.filter(s => s.free).length, slots };
    }).filter(x => x.ds && x.n > 0);
  }).catch(err => {
    if (seq !== availSeq) return;
    avail.err = err.message;
    fail(err);
  }).finally(() => {
    if (seq === availSeq && current === "book" && wiz && wiz.step === 2) render();
  });
}
function refresh() {
  const view = current;
  let jobs;
  if (view === "home") jobs = [ensureCatalog(), loadNext(), loadSummary()];
  else if (view === "book") jobs = [ensureCatalog(), loadNext()];
  else if (view.startsWith("staff-") && session) { schedFailed.clear(); jobs = [loadStaff()]; }
  else return;
  Promise.allSettled(jobs).then(results => {
    const bad = results.find(r => r.status === "rejected");
    if (bad) fail(bad.reason);
    if (current !== view || (view === "book" && wiz && wiz.step > 2)) return;
    render();
  });
}
function retry() {
  schedFailed.clear();
  if (current === "book") resetAvail();
  refresh();
  render();
}

function bookedSet() {
  if (!bookedCache) bookedCache = new Set(state.appts.filter(a => a.status !== "cancelled").map(a => `${a.doctorId}|${a.start}`));
  return bookedCache;
}
function isBooked(docId, ds, t) { return bookedSet().has(`${docId}|${ds}T${t}`); }
function freeSlots(doc, ds) {
  const nk = nowKey();
  return doctorSlots(doc.id, ds).filter(t => `${ds}T${t}` > nk && !isBooked(doc.id, ds, t));
}
function nextOpen(doc, from) {
  const t = todayStr();
  const start = parseDay(!from || from < t ? t : from);
  for (let i = 0; i < 42; i++) {
    const ds = ymd(addDays(start, i));
    const free = freeSlots(doc, ds);
    if (free.length) return { ds, time: free[0] };
  }
  return null;
}

const chip = s => `<span class="chip chip-${esc(s)}">${icon(stat(s)[1], "")}${esc(stat(s)[0])}</span>`;
const srcBadge = a => a.source === "online" ? `<span class="src src-online" title="Booked on the website">Online</span>` : `<span class="src src-staff">Front desk</span>`;
const empty = (title, text, action = "") => `<div class="empty"><p class="empty-title">${title}</p><p class="muted small">${text}</p>${action}</div>`;
const loadingHtml = (text = "Loading…") => `<p class="muted small loading" role="status">${text}</p>`;
const retryBtn = '<button type="button" class="btn btn-secondary btn-sm" data-retry>Try again</button>';
const pending = (key, title) => (failed(key) ? empty(title, esc(errs[key]), retryBtn) : loadingHtml());
const pendingQuiet = key => loadingHtml(failed(key) ? "Not available right now." : "Loading…");
function srTable(caption, head, rows) {
  return `<table class="sr"><caption>${esc(caption)}</caption><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function hydrateIcons(root = document) { root.querySelectorAll("[data-icon]").forEach(el => { if (!el.firstElementChild) el.innerHTML = icon(el.dataset.icon); }); }

function renderHome() {
  const at = pub.nextAt;
  $("#next-asof").textContent = at ? `As of ${fmtTime(`${pad(at.getHours())}:${pad(at.getMinutes())}`)}` : "";
  $("#st-open").textContent = pub.open === null ? (failed("summary") ? "—" : "…") : String(pub.open);
  if (!catalogReady) {
    $("#home-next").innerHTML = pendingQuiet("catalog");
    $("#home-depts").innerHTML = pendingQuiet("catalog");
    $("#home-docs").innerHTML = pending("catalog", "We couldn't load the clinic's doctors.");
    return;
  }
  const nextText = nx => nx ? `${fmtDay(nx.ds)}, ${fmtTime(nx.time)}` : pub.next ? "No openings in 6 weeks" : failed("next") ? "Not available right now" : "Checking…";
  if (!pub.next) $("#home-next").innerHTML = pendingQuiet("next");
  else {
    const items = doctors.map(d => ({ d, nx: nextFor(d.id) })).sort((a, b) => (a.nx ? a.nx.ds + a.nx.time : "z").localeCompare(b.nx ? b.nx.ds + b.nx.time : "z"));
    $("#home-next").innerHTML = items.length ? items.map(({ d, nx }) => nx
      ? `<button type="button" class="next-row" data-book data-doctor="${esc(d.id)}" data-date="${esc(nx.ds)}" data-time="${esc(nx.time)}" aria-label="Book ${esc(d.name)}, ${fmtDay(nx.ds)} at ${fmtTime(nx.time)}"><span class="avatar av-sm">${esc(initials(d.name))}</span><span class="grow"><span class="cell-main">${esc(d.name)}</span><span class="cell-sub">${esc(d.dept)}</span></span><span class="pill-time">${fmtDay(nx.ds) === "Today" || fmtDay(nx.ds) === "Tomorrow" ? fmtDay(nx.ds) : DAY_NAMES[parseDay(nx.ds).getDay()]} ${fmtTime(nx.time)}</span></button>`
      : `<div class="next-row" style="cursor:default"><span class="avatar av-sm">${esc(initials(d.name))}</span><span class="grow"><span class="cell-main">${esc(d.name)}</span><span class="cell-sub">${esc(d.dept)}</span></span><span class="muted small">Fully booked</span></div>`).join("") : loadingHtml("No doctors are listed yet.");
  }
  $("#home-depts").innerHTML = depts.length ? depts.map(dp => {
    const d = doctors.find(x => x.dept === dp.name);
    return `<button type="button" class="dept-tile" data-book${d ? ` data-doctor="${esc(d.id)}"` : ""}><span class="dept-ico">${icon(dp.icon)}</span><h3>${esc(dp.name)}</h3><p>${esc(dp.text)}</p>${d ? `<span class="cell-sub">${esc(d.name)}</span>` : ""}</button>`;
  }).join("") : loadingHtml("No departments are listed yet.");
  $("#home-docs").innerHTML = doctors.length ? doctors.map(d => {
    const nx = nextFor(d.id);
    return `<article class="doc-card">
      <div style="display:flex;align-items:center;gap:12px"><span class="avatar av-md">${esc(initials(d.name))}</span><div style="min-width:0"><h3>${esc(d.name)}</h3><span class="cell-sub">${esc(d.dept)} · Room ${esc(d.room)}</span></div></div>
      <div class="langs" aria-label="Languages">${d.langs.map(l => `<span class="lang">${esc(l)}</span>`).join("")}</div>
      <div class="daylist" aria-label="In clinic on ${d.days.map(w => DAY_LONG[w]).join(", ")}">${[1, 2, 3, 4, 5, 6].map(w => `<span class="day${d.days.includes(w) ? " on" : ""}" aria-hidden="true">${DAY_NAMES[w]}</span>`).join("")}</div>
      <div class="kv"><span>Next open time</span><span class="cell-main">${nextText(nx)}</span></div>
      <button type="button" class="btn btn-secondary btn-block" data-book data-doctor="${esc(d.id)}" aria-label="Book with ${esc(d.name)}">Book appointment</button>
    </article>`;
  }).join("") : empty("No doctors are listed yet.", "Please check back soon, or call the front desk.");
}

function newWiz(opts = {}) {
  const doctorId = opts.doctorId || "";
  const jump = Boolean(doctorId && opts.date && opts.time);
  wiz = { step: doctorId ? 2 : 1, dept: "", doctorId, ds: opts.date || "", time: jump ? opts.time : "", jump, d: { name: "", dob: "", phone: "", email: "", card: "", type: "New patient", reason: "" }, consent: false, errors: {}, result: null, busy: false };
  resetAvail();
}
function wizSummary() {
  const d = doctorById(wiz.doctorId);
  return `<aside class="card summary" aria-label="Your appointment">
    <h2 class="card-title">Your appointment</h2>
    <dl class="sum">
      <div><dt>Doctor</dt><dd>${d ? `${esc(d.name)}<span class="cell-sub">${esc(d.dept)}</span>` : '<span class="muted">Not chosen yet</span>'}</dd></div>
      <div><dt>Date</dt><dd>${wiz.ds ? fmtLong(wiz.ds) : '<span class="muted">Not chosen yet</span>'}</dd></div>
      <div><dt>Time</dt><dd>${wiz.time ? fmtTime(wiz.time) : '<span class="muted">Not chosen yet</span>'}</dd></div>
      <div><dt>Where</dt><dd>MediBook Clinic${d ? `, Room ${esc(d.room)}` : ""}<span class="cell-sub">100 Example Avenue, Toronto</span></dd></div>
    </dl>
    <p class="muted small">Bring your Ontario health card (OHIP) and your booking reference.</p>
  </aside>`;
}
function wizField(id, name, label, opts = {}) {
  const err = wiz.errors[name];
  const val = esc(wiz.d[name]);
  const attrs = `id="${id}" name="${name}"${err ? ` aria-invalid="true" aria-describedby="${id}-err"` : ""}${opts.attrs ? " " + opts.attrs : ""}`;
  const control = opts.textarea ? `<textarea ${attrs} rows="3">${val}</textarea>` : opts.select ? `<select ${attrs}>${opts.select.map(o => `<option${o === wiz.d[name] ? " selected" : ""}>${o}</option>`).join("")}</select>` : `<input ${attrs} type="${opts.type || "text"}" value="${val}">`;
  return `<div class="field${opts.full ? " full" : ""}"><label for="${id}">${label}${opts.required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(optional)</span>'}</label>${control}${err ? `<p class="field-error" id="${id}-err">${err}</p>` : ""}</div>`;
}
function renderWizard() {
  if (!wiz) newWiz();
  const labels = ["Doctor", "Date and time", "Your details", "Confirmed"];
  $("#wiz-steps").innerHTML = labels.map((l, i) => `<li class="${i + 1 < wiz.step ? "done" : i + 1 === wiz.step ? "now" : ""}"${i + 1 === wiz.step ? ' aria-current="step"' : ""}><span>${i + 1}. ${l}</span></li>`).join("");
  const body = $("#wiz-body");
  if (wiz.step < 4 && !catalogReady) {
    body.innerHTML = `<div class="card">${pending("catalog", "We couldn't load the clinic's doctors.")}</div>`;
    return;
  }
  if (wiz.step === 1) {
    if (!wiz.dept) wiz.dept = (doctorById(wiz.doctorId) || {}).dept || "all";
    const list = doctors.filter(d => wiz.dept === "all" || d.dept === wiz.dept);
    body.innerHTML = `<div class="wiz-grid"><div>
      <div class="card">
        <h2 class="card-title">Choose a doctor</h2>
        <p class="muted small">Filter by department, then pick the doctor you'd like to see.</p>
        <div class="filter-chips" role="group" aria-label="Department">
          <button type="button" class="fchip" data-wdept="all" aria-pressed="${wiz.dept === "all"}">All departments</button>
          ${depts.map(dp => `<button type="button" class="fchip" data-wdept="${esc(dp.name)}" aria-pressed="${wiz.dept === dp.name}">${esc(dp.name)}</button>`).join("")}
        </div>
        <div class="pick-list">${list.length ? list.map(d => {
          const nx = nextFor(d.id);
          const pill = nx ? `Next: ${fmtDay(nx.ds)} ${fmtTime(nx.time)}` : pub.next ? "Fully booked" : "";
          return `<button type="button" class="pick" data-wdoc="${esc(d.id)}" aria-pressed="${wiz.doctorId === d.id}"><span class="avatar av-md">${esc(initials(d.name))}</span><span class="grow"><span class="cell-main">${esc(d.name)}</span><span class="cell-sub">${esc(d.dept)} · Room ${esc(d.room)} · Speaks ${esc(d.langs.join(", "))}</span></span>${pill ? `<span class="pill-time">${pill}</span>` : ""}<span class="radio" aria-hidden="true"></span></button>`;
        }).join("") : empty("No doctors in this department yet.", "Choose another department, or call the front desk.")}</div>
      </div>
      <div class="wiz-nav"><button type="button" class="btn btn-ghost" data-go="home">Cancel</button><button type="button" class="btn btn-primary" data-wnext${wiz.doctorId ? "" : " disabled"}>Continue</button></div>
    </div>${wizSummary()}</div>`;
  } else if (wiz.step === 2) {
    const doc = doctorById(wiz.doctorId);
    if (!doc) { wiz.step = 1; wiz.doctorId = ""; wiz.ds = ""; wiz.time = ""; wiz.jump = false; renderWizard(); return; }
    if (avail.doctorId !== doc.id) loadAvail(doc.id);
    let inner;
    if (!avail.days) inner = avail.err ? empty("We couldn't load open times.", esc(avail.err), retryBtn) : loadingHtml("Loading open times…");
    else {
      const days = avail.days;
      if (wiz.jump) {
        wiz.jump = false;
        const want = days.find(x => x.ds === wiz.ds);
        if (want && want.slots.some(s => s.time === wiz.time && s.free) && `${wiz.ds}T${wiz.time}` > nowKey()) { wiz.step = 3; renderWizard(); return; }
        wiz.time = "";
      }
      if (!days.some(x => x.ds === wiz.ds)) { wiz.ds = days.length ? days[0].ds : ""; wiz.time = ""; }
      const nk = nowKey();
      const day = days.find(x => x.ds === wiz.ds);
      const slots = day ? day.slots : [];
      if (wiz.time && !slots.some(s => s.time === wiz.time && s.free)) wiz.time = "";
      const btn = s => { const off = !s.free || `${wiz.ds}T${s.time}` <= nk; const sel = wiz.time === s.time; return `<button type="button" class="slot${sel ? " is-selected" : ""}" data-wtime="${esc(s.time)}" aria-pressed="${sel}"${off ? " disabled" : ""}>${fmtTime(s.time)}</button>`; };
      const am = slots.filter(s => Number(s.time.slice(0, 2)) < 12), pm = slots.filter(s => Number(s.time.slice(0, 2)) >= 12);
      inner = days.length ? `<div class="date-strip" role="group" aria-label="Available dates">${days.map(x => { const d = parseDay(x.ds); const sel = x.ds === wiz.ds; return `<button type="button" class="dchip" data-wday="${esc(x.ds)}" aria-pressed="${sel}" aria-label="${fmtLong(x.ds)}, ${plural(x.n, "open time", "open times")}"><span class="dw">${fmtDay(x.ds) === "Today" ? "Today" : DAY_NAMES[d.getDay()]}</span><span class="dd">${d.getDate()}</span><span class="dn">${x.n} open</span></button>`; }).join("")}</div>
        <div class="time-groups">
          ${am.length ? `<div class="time-group"><h3>Morning</h3><div class="slot-grid">${am.map(btn).join("")}</div></div>` : ""}
          ${pm.length ? `<div class="time-group"><h3>Afternoon</h3><div class="slot-grid">${pm.map(btn).join("")}</div></div>` : ""}
        </div>` : empty("No open times in the next 6 weeks.", "Please choose another doctor, or call the front desk.");
    }
    body.innerHTML = `<div class="wiz-grid"><div>
      <div class="card">
        <h2 class="card-title">Pick a date and time</h2>
        <p class="muted small">${esc(doc.name)} · ${esc(doc.dept)} · <button type="button" class="link" data-wstep="1">Change doctor</button></p>
        ${inner}
      </div>
      <div class="wiz-nav"><button type="button" class="btn btn-ghost" data-wback>Back</button><button type="button" class="btn btn-primary" data-wnext${wiz.time ? "" : " disabled"}>Continue</button></div>
    </div>${wizSummary()}</div>`;
  } else if (wiz.step === 3) {
    const hasErr = Object.keys(wiz.errors).length > 0;
    body.innerHTML = `<div class="wiz-grid"><div>
      <form class="card" id="wiz-form" novalidate>
        <h2 class="card-title">Your details</h2>
        <p class="muted small">We use these to confirm your visit and find your record at the front desk. Booking for a child? Enter the child's details.</p>
        ${hasErr ? `<p class="form-error" role="alert" style="margin-top:14px">${esc(wiz.errors._ || "Please fix the highlighted fields.")}</p>` : ""}
        <div class="form-grid">
          ${wizField("w-name", "name", "Full name", { required: true, full: true, attrs: 'autocomplete="name" maxlength="100"' })}
          ${wizField("w-dob", "dob", "Date of birth", { required: true, type: "date", attrs: `max="${todayStr()}"` })}
          ${wizField("w-phone", "phone", "Phone", { required: true, type: "tel", attrs: 'autocomplete="tel" maxlength="20" placeholder="416-555-0100"' })}
          ${wizField("w-email", "email", "Email", { type: "email", attrs: 'autocomplete="email" maxlength="120" placeholder="name@example.com"' })}
          ${wizField("w-card", "card", "Health card number", { attrs: 'maxlength="20" placeholder="1234-567-890-AB"' })}
          ${wizField("w-type", "type", "Visit type", { required: true, select: TYPES })}
          ${wizField("w-reason", "reason", "Reason for visit", { full: true, textarea: true, attrs: 'maxlength="300" placeholder="For example: knee pain for two weeks"' })}
          <div class="full"><label class="check"><input type="checkbox" id="w-consent" name="consent"${wiz.consent ? " checked" : ""}${wiz.errors.consent ? ' aria-invalid="true" aria-describedby="w-consent-err"' : ""}><span>I agree that MediBook Clinic can store these details to manage my appointment.</span></label>${wiz.errors.consent ? `<p class="field-error" id="w-consent-err">${wiz.errors.consent}</p>` : ""}</div>
        </div>
        <div class="wiz-nav"><button type="button" class="btn btn-ghost" data-wback${wiz.busy ? " disabled" : ""}>Back</button><button type="submit" class="btn btn-primary"${wiz.busy ? " disabled" : ""}>${wiz.busy ? "Booking…" : "Confirm booking"}</button></div>
      </form>
    </div>${wizSummary()}</div>`;
  } else {
    const r = wiz.result;
    if (!r) { newWiz(); renderWizard(); return; }
    const d = docOf(r.doctorId);
    body.innerHTML = `<div class="card confirm">
      <span class="confirm-ico">${icon("check", "ico-lg")}</span>
      <h2>You're booked, ${esc(r.firstName)}.</h2>
      <p class="muted">Show this booking reference at the front desk when you arrive.</p>
      <span class="ref">${esc(r.ref)}</span>
      <dl class="confirm-facts">
        <div><dt>Doctor</dt><dd>${esc(d.name)}<span class="cell-sub">${esc(d.dept)}</span></dd></div>
        <div><dt>When</dt><dd>${fmtLong(r.start.slice(0, 10))}<span class="cell-sub">${fmtTime(r.start.slice(11))}</span></dd></div>
        <div><dt>Where</dt><dd>MediBook Clinic, Room ${esc(d.room)}<span class="cell-sub">100 Example Avenue, Toronto</span></dd></div>
        <div><dt>Visit type</dt><dd>${esc(r.type)}<span class="cell-sub">${r.reason ? esc(r.reason) : "No reason given"}</span></dd></div>
      </dl>
      <p class="muted small">Need to cancel or change it? Call the front desk at <span class="mono">416-555-0199</span> with your reference.</p>
      <div class="hero-cta" style="margin-top:6px"><button type="button" class="btn btn-secondary" data-wreset>Book another appointment</button><button type="button" class="btn btn-primary" data-go="home">Back to home</button></div>
    </div>`;
  }
}
async function submitWizard() {
  if (wiz.busy) return;
  const d = wiz.d, errors = {};
  const name = d.name.trim(), phone = d.phone.trim(), email = d.email.trim();
  const doc = doctorById(wiz.doctorId);
  if (!name) errors.name = "Enter the patient's full name.";
  if (!d.dob) errors.dob = "Enter a date of birth.";
  else if (d.dob > todayStr()) errors.dob = "Date of birth can't be in the future.";
  else if (doc && doc.dept === "Pediatrics" && monthsOld(d.dob) >= 216) errors.dob = "Pediatrics sees patients under 18. Please choose another doctor.";
  if (!phone) errors.phone = "Enter a phone number so we can reach you.";
  else if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) errors.phone = "Use digits, spaces or dashes, like 416-555-0100.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address, like name@example.com.";
  if (!wiz.consent) errors.consent = "Please agree so we can keep your booking.";
  if (!wiz.time || `${wiz.ds}T${wiz.time}` <= nowKey()) { wiz.step = 2; wiz.time = ""; wiz.errors = {}; resetAvail(); renderWizard(); toast("That time is no longer open. Please pick another time."); return; }
  wiz.errors = errors;
  if (Object.keys(errors).length) {
    renderWizard();
    const first = $("#wiz-form [aria-invalid='true']");
    if (first) first.focus();
    return;
  }
  wiz.busy = true;
  renderWizard();
  const body = { doctor_id: wiz.doctorId, date: wiz.ds, time: wiz.time, type: d.type, reason: d.reason.trim() || null, consent: true, patient: { full_name: name, dob: d.dob, phone, email: email || null, health_card: d.card.trim() || null } };
  try {
    const res = await api("/api/public/bookings", { method: "POST", body });
    const a = (res && res.appointment) || {};
    wiz.result = {
      ref: (res && res.ref) || a.ref || "",
      doctorId: String(a.doctor_id || wiz.doctorId),
      start: String(a.start || `${wiz.ds}T${wiz.time}`).replace(" ", "T").slice(0, 16),
      type: a.type || d.type,
      reason: a.reason === undefined ? d.reason.trim() : a.reason || "",
      firstName: name.split(/\s+/)[0]
    };
    wiz.step = 4;
    resetAvail();
    window.scrollTo({ top: 0, behavior: smooth() });
  } catch (err) {
    if (err.status === 409) { wiz.step = 2; wiz.time = ""; wiz.errors = {}; resetAvail(); toast(err.message); }
    else if (err.status === 422) wiz.errors = { _: err.message };
    else fail(err);
  } finally {
    wiz.busy = false;
    if (current === "book") render();
  }
}

function weekChart() {
  const now = new Date();
  const data = [...Array(7)].map((_, i) => {
    const d = addDays(now, i), ds = ymd(d);
    const v = state.appts.filter(a => a.status !== "cancelled" && a.start.startsWith(ds)).length;
    const reason = closedReason(ds);
    const closed = Boolean(schedule[ds]) && !clinicSlots(ds).length;
    return { ds, v, today: i === 0, label: i === 0 ? "Today" : DAY_NAMES[d.getDay()], sub: `${MONTHS[d.getMonth()]} ${d.getDate()}`, tip: `${fmtShort(ds)} · ${closed ? (reason && reason !== "Sunday" ? `Closed for ${reason}` : "Clinic closed") : plural(v, "appointment", "appointments")}` };
  });
  const top = Math.max(1, ...data.map(d => d.v));
  const step = top <= 4 ? 1 : top <= 8 ? 2 : top <= 20 ? 5 : 10;
  const max = Math.ceil(top / step) * step;
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const pct = v => `${(v / max) * 100}%`;
  return `<div class="cchart" aria-hidden="true"><div class="cplot">${ticks.map(v => `<div class="gl${v === 0 ? " gl-zero" : ""}" style="bottom:${pct(v)}"><span class="gl-label">${v}</span></div>`).join("")}<div class="ccols">${data.map(d => `<div class="ccol" data-tip="${esc(d.tip)}"><span class="cval" style="bottom:${pct(d.v)}">${d.v}</span><span class="cbar" style="height:${pct(d.v)}"></span></div>`).join("")}</div></div><div class="cxl">${data.map(d => `<span class="${d.today ? "strong" : ""}">${d.label}<small>${d.sub}</small></span>`).join("")}</div></div>${srTable("Appointments per day, next 7 days", ["Day", "Appointments"], data.map(d => [fmtShort(d.ds), d.v]))}`;
}
function doctorChart() {
  const nk = nowKey();
  const rows = doctors.map(d => { const v = state.appts.filter(a => a.doctorId === d.id && a.status === "scheduled" && a.start >= nk).length; return { d, v, tip: `${d.name} · ${plural(v, "upcoming visit", "upcoming visits")}` }; }).sort((a, b) => b.v - a.v);
  if (!rows.length) return empty("No doctors are listed yet.", "Doctors appear here once they're added.");
  const max = Math.max(1, ...rows.map(r => r.v));
  return `<ul class="hbars" aria-hidden="true">${rows.map(r => `<li class="hbar" data-tip="${esc(r.tip)}"><div class="hbar-label"><span class="cell-main">${esc(r.d.name)}</span><span class="cell-sub">${esc(r.d.dept)}</span></div><div class="hbar-track"><span class="hbar-fill" style="width:${(r.v / max) * 82}%"></span><span class="hbar-val">${r.v}</span></div></li>`).join("")}</ul>${srTable("Upcoming scheduled visits by doctor", ["Doctor", "Upcoming visits"], rows.map(r => [r.d.name, r.v]))}`;
}

function actionsFor(a) {
  if (a.status !== "scheduled") return "";
  const canComplete = a.start.slice(0, 10) <= todayStr();
  return `<div class="act">${canComplete ? `<button type="button" class="btn btn-sm btn-secondary" data-act="complete" data-id="${esc(a.id)}">Complete</button>` : ""}<button type="button" class="btn btn-sm btn-ghost danger" data-act="cancel" data-id="${esc(a.id)}">Cancel</button></div>`;
}
function apptRow(a, compact) {
  const p = patientOf(a), d = docOf(a.doctorId);
  const ds = a.start.slice(0, 10), t = a.start.slice(11);
  return `<tr class="${a.status === "cancelled" ? "is-cancelled" : ""}">
    <td class="nowrap"><span class="cell-main">${compact ? fmtTime(t) : fmtDay(ds)}</span><span class="cell-sub">${compact ? `Room ${esc(d.room)}` : fmtTime(t)}</span></td>
    <td><button type="button" class="link" data-patient="${esc(p.id)}">${esc(p.name)}</button><span class="cell-sub mono">${esc(p.mrn)}</span></td>
    <td><span class="cell-main">${esc(d.name)}</span><span class="cell-sub">${esc(d.dept)}</span></td>
    <td class="hide-sm"><span class="cell-main" style="font-weight:500">${esc(a.type)}</span>${a.ref ? `<span class="cell-sub mono">${esc(a.ref)}</span>` : ""}</td>
    ${compact ? "" : `<td class="hide-md reason">${esc(a.reason || "—")}</td>`}
    <td class="hide-md">${srcBadge(a)}</td>
    <td>${chip(a.status)}</td>
    <td class="actions">${actionsFor(a)}</td>
  </tr>`;
}
function apptTable(list, compact) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th scope="col">${compact ? "Time" : "When"}</th><th scope="col">Patient</th><th scope="col">Doctor</th><th scope="col" class="hide-sm">Visit</th>${compact ? "" : '<th scope="col" class="hide-md">Reason</th>'}<th scope="col" class="hide-md">Booked</th><th scope="col">Status</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>${list.map(a => apptRow(a, compact)).join("")}</tbody></table></div>`;
}

function renderDashboard() {
  const now = new Date(), t = todayStr(), nk = nowKey(), h = now.getHours();
  $("#dash-greet").textContent = `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${session.name}`;
  $("#dash-date").textContent = fmtLong(t);
  if (!state.ready) {
    $("#dash-kpis").innerHTML = pending("staff", "We couldn't load the clinic data.");
    ["#chart-week", "#chart-doctors", "#today-list"].forEach(s => { $(s).innerHTML = pendingQuiet("staff"); });
    $("#online-feed").innerHTML = `<li>${pendingQuiet("staff")}</li>`;
    $("#today-sub").textContent = "";
    return;
  }
  const todays = state.appts.filter(a => a.start.startsWith(t)).sort((a, b) => a.start.localeCompare(b.start));
  const known = Boolean(schedule[t]);
  const inClinic = doctors.filter(d => doctorSlots(d.id, t).length);
  const open = !known || inClinic.length > 0;
  const reason = closedReason(t);
  const active = todays.filter(a => a.status !== "cancelled").length;
  const done = todays.filter(a => a.status === "completed").length;
  const remaining = todays.filter(a => a.status === "scheduled").length;
  const freeToday = inClinic.reduce((s, d) => s + freeSlots(d, t).length, 0);
  const weekEnd = ymd(addDays(now, 6));
  const upcoming = state.appts.filter(a => a.status === "scheduled" && a.start >= nk);
  const next7 = upcoming.filter(a => a.start.slice(0, 10) <= weekEnd).length;
  const online = upcoming.filter(a => a.source === "online").length;
  const pct = upcoming.length ? Math.round((online / upcoming.length) * 100) : 0;
  const kpis = [
    { label: "Appointments today", value: active, sub: open ? `${done} completed · ${remaining} still to come` : "The clinic is closed today", ico: "calendar" },
    { label: "Open slots today", value: known ? freeToday : "—", sub: !known ? "Schedule not available" : inClinic.length ? `${plural(inClinic.length, "doctor", "doctors")} in clinic` : reason === "Sunday" ? "Closed on Sundays" : reason ? `Closed for ${reason}` : "No doctors in clinic today", ico: "clock" },
    { label: "Scheduled, next 7 days", value: next7, sub: `Through ${fmtShort(weekEnd)}`, ico: "trend" },
    { label: "Booked online", value: `${pct}%`, sub: `${online} of ${plural(upcoming.length, "upcoming visit", "upcoming visits")}`, ico: "globe" }
  ];
  $("#dash-kpis").innerHTML = kpis.map(k => `<div class="kpi"><div class="kpi-top"><span class="kpi-label">${k.label}</span><span class="kpi-ico">${icon(k.ico)}</span></div><span class="kpi-value">${esc(k.value)}</span><span class="kpi-sub">${esc(k.sub)}</span></div>`).join("");
  $("#chart-week").innerHTML = weekChart();
  $("#chart-doctors").innerHTML = doctorChart();
  $("#today-sub").textContent = !known ? plural(todays.length, "appointment", "appointments") : open ? `${plural(todays.length, "appointment", "appointments")} · ${plural(inClinic.length, "doctor", "doctors")} in clinic` : "The clinic is closed today";
  $("#today-list").innerHTML = todays.length ? apptTable(todays, true) : empty(open ? "No appointments booked for today yet." : "The clinic is closed today.", open ? "New bookings for today will show up here." : "Look at the next 7 days, or book ahead.", '<button type="button" class="btn btn-secondary btn-sm" data-sbook>New booking</button>');
  const feed = state.appts.filter(a => a.source === "online").sort((a, b) => (b.createdTs || 0) - (a.createdTs || 0)).slice(0, 6);
  $("#online-feed").innerHTML = feed.length ? feed.map(a => { const p = patientOf(a), d = docOf(a.doctorId); return `<li><div style="min-width:0"><button type="button" class="link" data-patient="${esc(p.id)}">${esc(p.name)}</button><span class="cell-sub">${esc(d.name)} · ${fmtWhen(a.start)}</span></div><div style="display:grid;justify-items:end;gap:4px"><span class="mono small">${esc(a.ref)}</span>${chip(a.status)}</div></li>`; }).join("") : `<li>${empty("No online bookings yet.", "Bookings made on the website will appear here.")}</li>`;
}

function filteredAppts() {
  const q = filters.q.trim().toLowerCase(), t = todayStr(), nk = nowKey();
  const list = state.appts.filter(a => {
    if (filters.doctor !== "all" && a.doctorId !== filters.doctor) return false;
    if (filters.status !== "all" && a.status !== filters.status) return false;
    if (filters.range === "upcoming" && a.start < nk) return false;
    if (filters.range === "today" && a.start.slice(0, 10) !== t) return false;
    if (filters.range === "past" && a.start >= nk) return false;
    if (q) {
      const p = patientOf(a);
      if (!`${p.name} ${p.mrn} ${a.reason} ${a.ref} ${docOf(a.doctorId).name}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const asc = filters.range === "upcoming" || filters.range === "today";
  return list.sort((x, y) => (asc ? x.start.localeCompare(y.start) : y.start.localeCompare(x.start)));
}
function renderAppointments() {
  $$("[data-apview]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.apview === apView)));
  $$("[data-range]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.range === filters.range)));
  $("#ap-q").value = filters.q;
  $("#ap-doctor").value = filters.doctor;
  $("#ap-status").value = filters.status;
  $("#ap-range").hidden = apView === "day";
  $("#ap-status-wrap").hidden = apView === "day";
  $("#ap-q").closest(".search").hidden = apView === "day";
  if (!state.ready) { $("#ap-count").textContent = ""; $("#ap-table").innerHTML = pending("staff", "We couldn't load the appointments."); return; }
  if (apView === "day") { renderCalendar(); return; }
  const list = filteredAppts();
  $("#ap-count").textContent = plural(list.length, "appointment", "appointments");
  if (!list.length) {
    $("#ap-table").innerHTML = empty("No appointments match these filters.", "Try another date range, or clear the search and filters.", '<button type="button" class="btn btn-secondary btn-sm" id="ap-clear">Clear filters</button>');
    return;
  }
  const rest = list.length - apLimit;
  $("#ap-table").innerHTML = apptTable(list.slice(0, apLimit), false) + (rest > 0 ? `<div class="more"><button type="button" class="btn btn-ghost btn-sm" id="ap-more">Show ${Math.min(40, rest)} more</button></div>` : "");
}
function renderCalendar() {
  if (!calDate) calDate = todayStr();
  const ds = calDate, nk = nowKey();
  const dayAppts = state.appts.filter(a => a.status !== "cancelled" && a.start.startsWith(ds));
  $("#ap-count").textContent = `${plural(dayAppts.length, "appointment", "appointments")} on ${fmtShort(ds)}`;
  const bar = `<div class="cal-bar"><button type="button" class="icon-btn" data-cal="-1" aria-label="Previous day">${icon("chevL")}</button><button type="button" class="icon-btn" data-cal="1" aria-label="Next day">${icon("chevR")}</button><strong>${fmtLong(ds)}</strong><button type="button" class="btn btn-ghost btn-sm" data-cal="0"${ds === todayStr() ? " disabled" : ""}>Today</button></div>`;
  if (!schedule[ds] && !schedFailed.has(ds)) {
    $("#ap-table").innerHTML = bar + loadingHtml();
    ensureSchedule(ymd(addDays(parseDay(ds), -14)), 45).catch(fail).finally(() => { if (current === "staff-appointments" && apView === "day" && calDate === ds) render(); });
    return;
  }
  const docs = doctors.filter(d => (filters.doctor === "all" || d.id === filters.doctor) && (doctorSlots(d.id, ds).length || dayAppts.some(a => a.doctorId === d.id)));
  const slots = [...new Set(docs.flatMap(d => doctorSlots(d.id, ds)).concat(dayAppts.filter(a => docs.some(d => d.id === a.doctorId)).map(a => a.start.slice(11))))].sort();
  if (!slots.length || !docs.length) {
    const why = closedNote(ds, filters.doctor !== "all" ? doctorById(filters.doctor) : null);
    $("#ap-table").innerHTML = bar + empty(esc(why), "Use the arrows to move to another day.");
    return;
  }
  const map = new Map(dayAppts.map(a => [`${a.doctorId}|${a.start.slice(11)}`, a]));
  const open = new Map(docs.map(d => [d.id, new Set(doctorSlots(d.id, ds))]));
  let cells = `<div class="cal-h"><span class="muted small">Time</span></div>` + docs.map(d => `<div class="cal-h"><span class="cell-main">${esc(d.name)}</span><span class="cell-sub">${esc(d.dept)} · Room ${esc(d.room)}</span></div>`).join("");
  for (const s of slots) {
    cells += `<div class="cal-t">${fmtTime(s)}</div>`;
    for (const d of docs) {
      const a = map.get(`${d.id}|${s}`);
      if (a) { const p = patientOf(a); cells += `<div class="cal-c"><button type="button" class="ev ${esc(a.status)}" data-patient="${esc(p.id)}" aria-label="${esc(p.name)}, ${fmtTime(s)} with ${esc(d.name)}, ${esc(stat(a.status)[0])}"><span class="ev-name">${esc(p.name)}${a.source === "online" ? '<span class="src src-online">Online</span>' : ""}</span><span class="ev-sub">${esc(a.type)} · ${esc(stat(a.status)[0])}</span></button></div>`; }
      else if (open.get(d.id).has(s) && `${ds}T${s}` > nk) cells += `<div class="cal-c"><button type="button" class="add-slot" data-sbook data-doctor="${esc(d.id)}" data-date="${ds}" data-time="${s}" aria-label="Book ${esc(d.name)} at ${fmtTime(s)}">+ Book</button></div>`;
      else cells += `<div class="cal-c" aria-hidden="true"></div>`;
    }
  }
  $("#ap-table").innerHTML = `${bar}<div class="cal-wrap"><div class="cal" style="grid-template-columns:84px repeat(${docs.length},minmax(170px,1fr))">${cells}</div></div>`;
}

function renderPatients() {
  const q = patientQuery.trim().toLowerCase(), nk = nowKey();
  const weekAgo = ymd(addDays(new Date(), -7));
  $("#pt-q").value = patientQuery;
  if (!state.ready) { $("#pt-count").textContent = ""; $("#pt-table").innerHTML = pending("staff", "We couldn't load the patient list."); return; }
  const byPatient = new Map();
  state.appts.forEach(a => { const k = String(a.patientId); if (!byPatient.has(k)) byPatient.set(k, []); byPatient.get(k).push(a); });
  const list = state.patients.filter(p => !q || `${p.name} ${p.mrn} ${p.phone} ${digits(p.phone)} ${p.email}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  $("#pt-count").textContent = `${plural(state.patients.length, "patient", "patients")} registered`;
  if (!list.length) {
    $("#pt-table").innerHTML = q ? empty(`No patients match “${esc(patientQuery.trim())}”.`, "Check the spelling, or search by MRN or phone number.", '<button type="button" class="btn btn-secondary btn-sm" data-add-patient>Add patient</button>') : empty("No patients registered yet.", "Patients appear here when they book online or you add them.", '<button type="button" class="btn btn-secondary btn-sm" data-add-patient>Add patient</button>');
    return;
  }
  $("#pt-table").innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th scope="col">Patient</th><th scope="col">Age</th><th scope="col">Phone</th><th scope="col" class="hide-sm">Email</th><th scope="col">Next visit</th><th scope="col" class="hide-sm">Visits</th></tr></thead><tbody>${list.map(p => {
    const mine = byPatient.get(String(p.id)) || [];
    const next = mine.filter(a => a.status === "scheduled" && a.start >= nk).sort((a, b) => a.start.localeCompare(b.start))[0];
    const visits = mine.filter(a => a.status === "completed").length;
    return `<tr><td><div style="display:flex;align-items:center;gap:10px"><span class="avatar av-sm">${esc(initials(p.name))}</span><div><button type="button" class="link" data-patient="${esc(p.id)}">${esc(p.name)}</button>${p.created && p.created >= weekAgo ? '<span class="badge">New</span>' : ""}<span class="cell-sub mono">${esc(p.mrn)}</span></div></div></td><td class="num nowrap">${ageLabel(p.dob)}</td><td class="mono nowrap">${esc(p.phone || "—")}</td><td class="hide-sm">${esc(p.email || "—")}</td><td class="nowrap">${next ? `<span class="cell-main">${fmtDay(next.start.slice(0, 10))}</span><span class="cell-sub">${fmtTime(next.start.slice(11))} · ${esc(docOf(next.doctorId).name)}</span>` : '<span class="muted">—</span>'}</td><td class="num hide-sm">${visits}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderDoctors() {
  const t = todayStr(), known = Boolean(schedule[t]);
  if (!state.ready) { $("#doc-list").innerHTML = `<li>${pending("staff", "We couldn't load the doctors' schedules.")}</li>`; return; }
  if (!doctors.length) { $("#doc-list").innerHTML = `<li>${empty("No doctors are listed yet.", "Doctors appear here once they're added.")}</li>`; return; }
  $("#doc-list").innerHTML = doctors.map(d => {
    const total = doctorSlots(d.id, t).length;
    const works = total > 0;
    const booked = works ? state.appts.filter(a => a.doctorId === d.id && a.start.startsWith(t) && a.status !== "cancelled").length : 0;
    const nx = nextOpen(d);
    return `<li class="doc-row">
      <div class="doc-id"><span class="avatar av-md">${esc(initials(d.name))}</span><div style="min-width:0"><span class="cell-main" style="font-weight:800">${esc(d.name)}</span><span class="cell-sub">${esc(d.dept)} · Room ${esc(d.room)} · ${esc(d.langs.join(", "))}</span></div></div>
      <div class="daylist" aria-label="In clinic on ${d.days.map(w => DAY_LONG[w]).join(", ")}">${[1, 2, 3, 4, 5, 6].map(w => `<span class="day${d.days.includes(w) ? " on" : ""}" aria-hidden="true">${DAY_NAMES[w]}</span>`).join("")}</div>
      <div class="doc-load">${works ? `<div class="meter-label"><span>Today</span><span class="num">${booked} of ${total} slots booked</span></div><div class="meter" role="meter" aria-label="Today's slots booked" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${Math.min(booked, total)}"><span style="width:${Math.min(100, (booked / total) * 100)}%"></span></div>` : `<p class="muted small">${known ? "Not in clinic today" : "Today's schedule isn't available"}</p>`}</div>
      <div class="kv"><span>Next open time</span><span class="cell-main">${nx ? `${fmtDay(nx.ds)}, ${fmtTime(nx.time)}` : "No openings in 6 weeks"}</span></div>
      <div class="row-actions"><button type="button" class="btn btn-ghost btn-sm" data-dayview="${esc(d.id)}">Schedule</button><button type="button" class="btn btn-secondary btn-sm" data-sbook data-doctor="${esc(d.id)}"${nx ? ` data-date="${nx.ds}" data-time="${nx.time}"` : ""}>Book</button></div>
    </li>`;
  }).join("");
}

function profilePatient() {
  const p = patientById(profileId);
  if (p) return p;
  const a = state.appts.find(x => sameId(x.patientId, profileId));
  return a ? { id: a.patientId, mrn: a.patientMrn || "", name: a.patientName || "Unknown patient", dob: "", phone: "", email: "", card: "", created: "" } : null;
}
function renderProfile() {
  const p = profilePatient();
  if (!p) return;
  const nk = nowKey();
  $("#pf-init").textContent = initials(p.name);
  $("#pf-title").textContent = p.name;
  $("#pf-mrn").textContent = `${p.mrn} · ${p.dob ? `${ageLabel(p.dob)}${monthsOld(p.dob) < 24 ? "" : " years"}` : "Age not recorded"}`;
  $$(".tab").forEach(t => { const on = t.dataset.tab === profileTab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
  $("#pf-body").setAttribute("aria-labelledby", `tab-${profileTab}`);
  const mine = state.appts.filter(a => sameId(a.patientId, p.id));
  const up = mine.filter(a => a.status === "scheduled" && a.start >= nk).sort((a, b) => a.start.localeCompare(b.start));
  const past = mine.filter(a => !(a.status === "scheduled" && a.start >= nk)).sort((a, b) => b.start.localeCompare(a.start));
  const mini = list => `<ul class="mini">${list.map(a => { const d = docOf(a.doctorId); return `<li><div><span class="cell-main">${fmtWhen(a.start)}</span><span class="cell-sub">${esc(d.name)} · ${esc(a.type)}${a.reason ? ` · ${esc(a.reason)}` : ""}${a.ref ? ` · <span class="mono">${esc(a.ref)}</span>` : ""}</span></div>${chip(a.status)}</li>`; }).join("")}</ul>`;
  if (profileTab === "overview") {
    $("#pf-body").innerHTML = `<dl class="facts">
      <div><dt>Date of birth</dt><dd>${p.dob ? fmtDate(p.dob) : "—"}</dd></div>
      <div><dt>Phone</dt><dd class="mono">${esc(p.phone || "—")}</dd></div>
      <div><dt>Email</dt><dd>${esc(p.email || "—")}</dd></div>
      <div><dt>Health card</dt><dd class="mono">${esc(p.card || "—")}</dd></div>
      <div><dt>Registered</dt><dd>${p.created ? fmtDate(p.created) : "—"}</dd></div>
      <div><dt>Completed visits</dt><dd>${mine.filter(a => a.status === "completed").length}</dd></div>
    </dl>
    <h3 class="sub-h">Next appointment</h3>${up.length ? mini(up.slice(0, 1)) : '<p class="muted small">No upcoming appointments.</p>'}`;
  } else {
    $("#pf-body").innerHTML = `<h3 class="sub-h">Upcoming</h3>${up.length ? mini(up) : '<p class="muted small">No upcoming appointments.</p>'}<h3 class="sub-h">History</h3>${past.length ? mini(past.slice(0, 12)) : '<p class="muted small">No past visits yet.</p>'}`;
  }
  $("#pf-foot").innerHTML = `<button type="button" class="btn btn-ghost" data-close>Close</button><button type="button" class="btn btn-primary" data-sbook data-patient-id="${esc(p.id)}">Book appointment</button>`;
}
function openProfile(id) {
  profileId = id;
  profileTab = "overview";
  if (!profilePatient()) return;
  renderProfile();
  if (!dlgProfile.open) dlgProfile.showModal();
}

function render() {
  try {
    if (current === "home") renderHome();
    else if (current === "book") renderWizard();
    else if (current.startsWith("staff-") && session) {
      const v = current.slice(6);
      $("#who-name").textContent = session.name;
      $("#who-role").textContent = roleLabel(session.role);
      $("#who-init").textContent = initials(session.name);
      ({ dashboard: renderDashboard, appointments: renderAppointments, patients: renderPatients, doctors: renderDoctors })[v]();
      if (dlgProfile.open) renderProfile();
    }
  } catch (err) { fail(err); }
  applyTheme();
}
function show(name) {
  if (name.startsWith("staff-") && !session) name = "login";
  else if (name === "login" && session) name = "staff-dashboard";
  if (name === "book" && !wiz) newWiz();
  current = name;
  closeMenu();
  $("#app-public").hidden = !(name === "home" || name === "book");
  $("#app-login").hidden = name !== "login";
  $("#app-staff").hidden = !name.startsWith("staff-");
  $("#view-home").hidden = name !== "home";
  $("#view-book").hidden = name !== "book";
  STAFF_VIEWS.forEach(v => { $(`#sv-${v}`).hidden = name !== `staff-${v}`; });
  $$("[data-staff]").forEach(b => { if (`staff-${b.dataset.staff}` === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  hideTip();
  refresh();
  render();
  window.scrollTo(0, 0);
  if (name === "login") setTimeout(() => { const e = $("#lg-email"); if (e && !e.value) e.focus(); }, 0);
}
function tokenFromHash() { let h = ""; try { h = location.hash.slice(1); } catch (e) {} return h; }
function route() {
  const h = tokenFromHash();
  if (h === "book" || h === "login") return show(h);
  if (h.startsWith("staff")) { const v = h.split("-")[1] || "dashboard"; return show(`staff-${STAFF_VIEWS.includes(v) ? v : "dashboard"}`); }
  show("home");
}
function go(token) {
  try { if (tokenFromHash() !== token) history.pushState(null, "", `#${token}`); } catch (e) {}
  if (token === "home") return show("home");
  if (token === "book" || token === "login") return show(token);
  show(token.startsWith("staff-") ? token : "home");
}
function openWizard(opts) { newWiz(opts); go("book"); }
function closeMenu() { const s = $("#menu-sheet"); if (s && !s.hidden) { s.hidden = true; $("#menu-btn").setAttribute("aria-expanded", "false"); } }

function applyTheme() {
  const r = document.documentElement;
  if (themePref === "system") { if (initialThemeAttr) r.setAttribute("data-theme", initialThemeAttr); else r.removeAttribute("data-theme"); }
  else r.setAttribute("data-theme", themePref);
  $$("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === themePref)));
}

const tip = $("#tip");
function hideTip() { tip.hidden = true; }
function toast(msg, undo) {
  const box = $("#toasts");
  if (!undo && Array.from(box.children).some(c => c.dataset.msg === msg)) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.dataset.msg = msg;
  const text = document.createElement("span");
  text.textContent = msg;
  el.append(text);
  if (undo) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-btn";
    b.textContent = "Undo";
    b.addEventListener("click", () => { el.remove(); undo(); });
    el.append(b);
  }
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 6000);
}

const dlgBook = $("#dlg-book"), dlgPatient = $("#dlg-patient"), dlgProfile = $("#dlg-profile");
function showError(id, msg) { const el = $(id); el.textContent = msg; el.hidden = false; }
function hideError(id) { $(id).hidden = true; }
function fillDoctorSelects() {
  $("#ap-doctor").innerHTML = `<option value="all">All doctors</option>${doctors.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("")}`;
  $("#ap-doctor").value = filters.doctor;
  $("#bk-doctor").innerHTML = doctors.map(d => `<option value="${esc(d.id)}">${esc(d.name)} · ${esc(d.dept)}</option>`).join("");
}
function fillPatientOptions(selected) {
  const sorted = [...state.patients].sort((a, b) => a.name.localeCompare(b.name));
  $("#bk-patient").innerHTML = `<option value="">Select a patient</option>${sorted.map(p => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.mrn)}</option>`).join("")}`;
  $("#bk-patient").value = selected == null ? "" : String(selected);
}
function openBooking(opts = {}) {
  if (!session) return;
  if (!state.ready) { loadStaff().then(() => { if (session && state.ready && current.startsWith("staff-")) openBooking(opts); }).catch(fail); return; }
  const doc = doctorById(opts.doctorId) || doctors[0];
  if (!doc) { toast("No doctors are set up yet."); return; }
  fillPatientOptions(opts.patientId);
  $("#bk-doctor").value = doc.id;
  $("#bk-type").value = opts.type || "Follow-up";
  $("#bk-reason").value = opts.reason || "";
  $("#bk-date").min = todayStr();
  let ds = opts.date, time = opts.time || "";
  if (!ds) { const nx = nextOpen(doc); ds = nx ? nx.ds : todayStr(); if (!time && nx) time = nx.time; }
  $("#bk-date").value = ds;
  pickedTime = time;
  hideError("#bk-error");
  renderSlots();
  if (dlgProfile.open) dlgProfile.close();
  if (!dlgBook.open) dlgBook.showModal();
}
function renderSlots() {
  const doc = doctorById($("#bk-doctor").value);
  const ds = $("#bk-date").value;
  const box = $("#bk-slots"), count = $("#bk-slot-count");
  if (!doc) { $("#bk-doc-hint").textContent = ""; box.innerHTML = '<p class="slot-note">Choose a doctor to see open times.</p>'; count.textContent = ""; pickedTime = ""; return; }
  $("#bk-doc-hint").textContent = `${doc.dept} · Room ${doc.room} · In clinic ${doc.days.map(w => DAY_NAMES[w]).join(", ")}`;
  if (!ds) { box.innerHTML = '<p class="slot-note">Choose a date to see open times.</p>'; count.textContent = ""; pickedTime = ""; return; }
  if (ds < todayStr()) { box.innerHTML = '<p class="slot-note">That date has passed. Choose today or a later date.</p>'; count.textContent = ""; pickedTime = ""; return; }
  if (!schedule[ds] && !schedFailed.has(ds)) {
    box.innerHTML = loadingHtml("Loading open times…");
    count.textContent = "";
    ensureSchedule(ds, 42).catch(err => showError("#bk-error", err.message)).then(() => { if (dlgBook.open && $("#bk-date").value === ds && $("#bk-doctor").value === doc.id) renderSlots(); });
    return;
  }
  const slots = doctorSlots(doc.id, ds);
  if (!slots.length) {
    box.innerHTML = `<p class="slot-note">${esc(closedNote(ds, doc))} <button type="button" class="link" id="bk-next-day">Show the next open day</button></p>`;
    count.textContent = "";
    pickedTime = "";
    return;
  }
  const nk = nowKey();
  const free = slots.filter(s => `${ds}T${s}` > nk && !isBooked(doc.id, ds, s));
  if (!free.includes(pickedTime)) pickedTime = "";
  count.textContent = free.length ? `· ${plural(free.length, "open time", "open times")} on ${fmtShort(ds)}` : "· Fully booked";
  box.innerHTML = slots.map(s => {
    const past = `${ds}T${s}` <= nk, taken = isBooked(doc.id, ds, s), sel = pickedTime === s;
    return `<button type="button" class="slot${sel ? " is-selected" : ""}" data-slot="${s}" aria-pressed="${sel}"${past || taken ? " disabled" : ""}${taken ? ' title="Already booked"' : ""}>${fmtTime(s)}</button>`;
  }).join("") + (free.length ? "" : '<p class="slot-note">No open times left on this day. <button type="button" class="link" id="bk-next-day">Show the next open day</button></p>');
}
function showNextDay() {
  const doc = doctorById($("#bk-doctor").value);
  if (!doc) return;
  const picked = $("#bk-date").value, t = todayStr();
  const from = picked && picked > t ? picked : t;
  ensureSchedule(from, 42).then(() => {
    const nx = nextOpen(doc, from);
    if (!nx) { showError("#bk-error", `${doc.name} has no open times in the next 6 weeks.`); return; }
    $("#bk-date").value = nx.ds;
    pickedTime = nx.time;
    hideError("#bk-error");
    renderSlots();
  }).catch(err => showError("#bk-error", err.message));
}
function openPatientForm() {
  $("#pt-form").reset();
  $("#pt-dob").max = todayStr();
  hideError("#pt-error");
  dlgPatient.showModal();
  $("#pt-name").focus();
}
function upsertAppt(raw) {
  const a = mapAppt(raw);
  staffGen++;
  const i = state.appts.findIndex(x => sameId(x.id, a.id));
  if (i >= 0) state.appts[i] = a;
  else state.appts.push(a);
  bookedCache = null;
  return a;
}
function afterChange() {
  if (!current.startsWith("staff-")) return;
  render();
  refresh();
}
async function patchStatus(id, status) {
  const raw = await api(`/api/staff/appointments/${encodeURIComponent(id)}`, { method: "PATCH", body: { status }, auth: true });
  const a = upsertAppt(raw);
  afterChange();
  return a;
}
function undoFail(err) { fail(err); afterChange(); }
async function doAct(kind, id) {
  const a = apptById(id);
  if (!a) return;
  const prev = a.status;
  try {
    const upd = await patchStatus(a.id, kind === "complete" ? "completed" : "cancelled");
    const p = patientOf(upd);
    toast(sentence(`${kind === "complete" ? "Marked as completed" : "Cancelled"}: ${p.name}, ${fmtWhen(upd.start)}`), () => { patchStatus(upd.id, prev).catch(undoFail); });
  } catch (err) { undoFail(err); }
}
async function signIn(email, pw) {
  const em = email.trim();
  if (!em || !pw) { showError("#lg-error", "Enter your email and password."); return; }
  hideError("#lg-error");
  const btn = $("#lg-form button[type='submit']");
  btn.disabled = true;
  try {
    const res = await api("/api/auth/login", { method: "POST", body: { email: em, password: pw } });
    const u = (res && res.user) || {};
    if (!res || !res.token) throw apiError("Sign-in failed. Please try again.", 0);
    session = { token: res.token, email: u.email || em, name: u.name || u.email || em, role: u.role || "" };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
    state = freshState();
    staffGen++;
    bookedCache = null;
    $("#lg-pass").value = "";
    go("staff-dashboard");
    toast(`Signed in as ${session.name}.`);
  } catch (err) {
    showError("#lg-error", err.message);
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener("click", e => {
  const el = e.target.closest("button, a, [data-tab]");
  if (!el) return;
  const ds = el.dataset;
  if (el.id === "menu-btn") { const s = $("#menu-sheet"); s.hidden = !s.hidden; el.setAttribute("aria-expanded", String(!s.hidden)); return; }
  if ("go" in ds) { e.preventDefault(); go(ds.go); return; }
  if ("scroll" in ds) { e.preventDefault(); closeMenu(); if (current !== "home") go("home"); const t = document.getElementById(ds.scroll); if (t) t.scrollIntoView({ behavior: smooth(), block: "start" }); return; }
  if ("book" in ds) { openWizard({ doctorId: ds.doctor, date: ds.date, time: ds.time }); return; }
  if ("sbook" in ds) { openBooking({ doctorId: ds.doctor, date: ds.date, time: ds.time, patientId: ds.patientId }); return; }
  if ("staff" in ds) { go(`staff-${ds.staff}`); return; }
  if ("retry" in ds) { retry(); return; }
  if ("wdept" in ds) { wiz.dept = ds.wdept; renderWizard(); return; }
  if ("wdoc" in ds) { if (wiz.doctorId !== ds.wdoc) { wiz.doctorId = ds.wdoc; wiz.ds = ""; wiz.time = ""; } renderWizard(); return; }
  if ("wnext" in ds) {
    if (wiz.step === 1 && wiz.doctorId) { wiz.step = 2; resetAvail(); }
    else if (wiz.step === 2 && wiz.time) wiz.step = 3;
    else return;
    wiz.errors = {};
    renderWizard();
    window.scrollTo({ top: 0, behavior: smooth() });
    return;
  }
  if ("wback" in ds) { wiz.step = Math.max(1, wiz.step - 1); wiz.errors = {}; renderWizard(); return; }
  if ("wstep" in ds) { wiz.step = Number(ds.wstep); wiz.errors = {}; renderWizard(); return; }
  if ("wday" in ds) { wiz.ds = ds.wday; wiz.time = ""; renderWizard(); return; }
  if ("wtime" in ds) { wiz.time = ds.wtime; renderWizard(); return; }
  if ("wreset" in ds) { newWiz(); renderWizard(); refresh(); window.scrollTo({ top: 0, behavior: smooth() }); return; }
  if ("patient" in ds) { openProfile(ds.patient); return; }
  if ("act" in ds) { el.disabled = true; doAct(ds.act, ds.id); return; }
  if ("close" in ds) { el.closest("dialog").close(); return; }
  if ("slot" in ds) { if (!el.disabled) { pickedTime = ds.slot; hideError("#bk-error"); renderSlots(); } return; }
  if ("range" in ds) { filters.range = ds.range; apLimit = 40; renderAppointments(); return; }
  if ("apview" in ds) { apView = ds.apview; renderAppointments(); return; }
  if ("cal" in ds) { const n = Number(ds.cal); calDate = n === 0 ? todayStr() : ymd(addDays(parseDay(calDate || todayStr()), n)); renderAppointments(); return; }
  if ("dayview" in ds) { apView = "day"; calDate = todayStr(); filters.doctor = ds.dayview || "all"; go("staff-appointments"); return; }
  if ("themeSet" in ds) { themePref = ds.themeSet; try { localStorage.setItem(THEME_KEY, themePref); } catch (err) {} applyTheme(); return; }
  if ("tab" in ds) { profileTab = ds.tab; renderProfile(); return; }
  if ("addPatient" in ds) { openPatientForm(); return; }
  if (el.id === "bk-next-day") { showNextDay(); return; }
  if (el.id === "ap-more") { apLimit += 40; renderAppointments(); return; }
  if (el.id === "ap-clear") { filters = { q: "", doctor: "all", status: "all", range: "all" }; apLimit = 40; renderAppointments(); return; }
  if (el.id === "signout") { clearSession(); go("login"); toast("Signed out."); }
});
[dlgBook, dlgPatient, dlgProfile].forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
dlgPatient.addEventListener("close", () => { if (returnToBooking) { const r = returnToBooking; returnToBooking = null; openBooking(r); } });
document.addEventListener("keydown", e => {
  const tab = e.target.closest && e.target.closest(".tab");
  if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { profileTab = profileTab === "overview" ? "visits" : "overview"; renderProfile(); $(`#tab-${profileTab}`).focus(); }
  if (e.key === "Escape") closeMenu();
});

const wizInput = e => {
  const f = e.target.closest && e.target.closest("#wiz-form");
  if (f && wiz) {
    if (e.target.name === "consent") wiz.consent = e.target.checked;
    else if (e.target.name in wiz.d) wiz.d[e.target.name] = e.target.value;
  }
};
document.addEventListener("input", wizInput);
document.addEventListener("change", wizInput);
document.addEventListener("submit", e => {
  if (e.target.id === "wiz-form") { e.preventDefault(); submitWizard(); }
});
$("#lg-form").addEventListener("submit", e => { e.preventDefault(); signIn($("#lg-email").value, $("#lg-pass").value); });
$("#bk-doctor").addEventListener("change", () => {
  const doc = doctorById($("#bk-doctor").value);
  const ds = $("#bk-date").value, t = todayStr();
  pickedTime = "";
  hideError("#bk-error");
  if (!doc) { renderSlots(); return; }
  ensureSchedule(!ds || ds < t ? t : ds, 42).catch(err => showError("#bk-error", err.message)).then(() => {
    if (!ds || ds < t || !freeSlots(doc, ds).length) { const nx = nextOpen(doc, ds); if (nx) $("#bk-date").value = nx.ds; }
    renderSlots();
  });
});
$("#bk-date").addEventListener("change", () => { pickedTime = ""; hideError("#bk-error"); renderSlots(); });
$("#bk-new-patient").addEventListener("click", () => {
  returnToBooking = { doctorId: $("#bk-doctor").value, date: $("#bk-date").value, time: pickedTime, type: $("#bk-type").value, reason: $("#bk-reason").value };
  dlgBook.close();
  openPatientForm();
});
$("#bk-form").addEventListener("submit", async e => {
  e.preventDefault();
  const pid = $("#bk-patient").value, did = $("#bk-doctor").value, ds = $("#bk-date").value, t = pickedTime;
  if (!pid) return showError("#bk-error", "Choose a patient, or add one with “New patient”.");
  if (!ds || ds < todayStr()) return showError("#bk-error", "Choose today or a later date.");
  if (!t) return showError("#bk-error", "Pick one of the open times.");
  if (isBooked(did, ds, t) || `${ds}T${t}` <= nowKey()) { pickedTime = ""; renderSlots(); return showError("#bk-error", "That time is no longer open. Pick another time."); }
  const submit = $("#bk-form button[type='submit']");
  submit.disabled = true;
  hideError("#bk-error");
  try {
    const raw = await api("/api/staff/appointments", { method: "POST", auth: true, body: { patient_id: Number(pid), doctor_id: did, date: ds, time: t, type: $("#bk-type").value, reason: $("#bk-reason").value.trim() || null } });
    const a = upsertAppt(raw);
    dlgBook.close();
    afterChange();
    const p = patientOf(a), d = docOf(a.doctorId);
    toast(sentence(`Booked ${p.name} with ${d.name}, ${fmtWhen(a.start)}`), () => { patchStatus(a.id, "cancelled").then(() => toast("Booking cancelled.")).catch(undoFail); });
  } catch (err) {
    if (err.silent) return;
    showError("#bk-error", err.message);
    if (err.status === 409) { pickedTime = ""; loadStaff().then(() => { if (dlgBook.open) renderSlots(); }).catch(() => {}); }
  } finally {
    submit.disabled = false;
  }
});
$("#pt-form").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#pt-name").value.trim(), dob = $("#pt-dob").value, phone = $("#pt-phone").value.trim(), email = $("#pt-email").value.trim(), card = $("#pt-card").value.trim();
  if (!name) return showError("#pt-error", "Enter the patient's full name.");
  if (dob && dob > todayStr()) return showError("#pt-error", "Date of birth can't be in the future.");
  if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) return showError("#pt-error", "Enter the phone number using digits, spaces or dashes, like 416-555-0100.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("#pt-error", "Enter a valid email address, like name@example.com.");
  const submit = $("#pt-form button[type='submit']");
  submit.disabled = true;
  hideError("#pt-error");
  try {
    const raw = await api("/api/staff/patients", { method: "POST", auth: true, body: { full_name: name, dob: dob || null, phone: phone || null, email: email || null, health_card: card || null } });
    const p = mapPatient(raw);
    staffGen++;
    state.patients.push(p);
    const back = returnToBooking;
    returnToBooking = null;
    dlgPatient.close();
    if (back) openBooking(Object.assign({}, back, { patientId: p.id }));
    else toast(`Added ${p.name} (${p.mrn}).`);
    afterChange();
  } catch (err) {
    if (!err.silent) showError("#pt-error", err.message);
  } finally {
    submit.disabled = false;
  }
});
$("#ap-q").addEventListener("input", e => { filters.q = e.target.value; apLimit = 40; renderAppointments(); });
$("#ap-doctor").addEventListener("change", e => { filters.doctor = e.target.value; apLimit = 40; renderAppointments(); });
$("#ap-status").addEventListener("change", e => { filters.status = e.target.value; apLimit = 40; renderAppointments(); });
$("#pt-q").addEventListener("input", e => { patientQuery = e.target.value; renderPatients(); });
$("#g-search").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); patientQuery = e.target.value; e.target.value = ""; go("staff-patients"); } });

document.addEventListener("pointerover", e => {
  const el = e.target.closest("[data-tip]");
  if (!el) return;
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  tip.style.left = `${Math.min(Math.max(r.left + r.width / 2, 110), window.innerWidth - 110)}px`;
  tip.style.top = `${Math.max(r.top, 44)}px`;
});
document.addEventListener("pointerout", e => { const el = e.target.closest("[data-tip]"); if (el && !el.contains(e.relatedTarget)) hideTip(); });
window.addEventListener("scroll", hideTip, { passive: true });
window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);

load();
hydrateIcons();
$("#ap-doctor").innerHTML = '<option value="all">All doctors</option>';
$("#bk-type").innerHTML = TYPES.map(t => `<option value="${t}">${t}</option>`).join("");
route();
