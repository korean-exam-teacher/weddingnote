// 결혼준비 도우미 화면
import { getStore, COLLECTIONS } from "./store.js";
import { esc, won, parseWon, ddayLabel, fmtDate, toast, friendlyError } from "./common.js";

const $ = (id) => document.getElementById(id);
const store = await getStore();
if (store.demo) $("demo").classList.remove("hidden");

const S = { cid: null, profile: {}, couple: {}, tasks: [], items: [], payments: [], events: [], photos: [], guests: [], gifts: [], dayplan: [], shopping: [], notes: [], filter: "all", gf: "all", gif: "all", noteQ: "" };
const unsubs = [];

// ── 로그인 확인 ──
let started = false;
store.onAuth(async (u) => {
  if (!u) { location.replace("login.html"); return; }
  if (started) return;
  started = true;
  try { await start(); } catch (e) {
    if (String((e && e.code) || "").includes("permission-denied") && !store.demo) {
      // 허락 목록(firestore.rules)에 아직 없는 계정
      $("loading").innerHTML = `<div style="max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:12px;align-items:center">
        <b style="font-size:18px;color:var(--ink)">아직 사용 허락이 되지 않은 계정이에요</b>
        <span>이 사이트는 정해진 두 사람만 쓸 수 있어요. 처음 쓰는 거라면 아래 회원 번호를 관리자에게 보내 주세요.</span>
        <code style="font-size:15px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 14px;user-select:all">${esc(u.uid)}</code>
        <button type="button" class="btn btn-line btn-sm" id="out">로그아웃</button></div>`;
      $("out").addEventListener("click", async () => { await store.signOut(); location.replace("index.html"); });
    } else $("loading").textContent = friendlyError(e);
  }
});

async function start() {
  const me = await store.loadMe();
  S.cid = me.cid; S.profile = me.profile || {};
  unsubs.forEach((f) => f()); unsubs.length = 0;
  unsubs.push(store.watchCouple(S.cid, (c) => { S.couple = c; renderAll(); }));
  for (const name of COLLECTIONS) unsubs.push(store.watch(S.cid, name, (list) => { S[name] = list; renderAll(); }));
  $("loading").classList.add("hidden");
  $("app").classList.remove("hidden");
  if (store.demo) $("meVia").textContent = "체험 모드";
  const h = location.hash.slice(1);
  if (h) show(h);
}

// ── 메뉴 ──
function show(view) {
  if (!document.querySelector(`[data-section="${view}"]`)) return;
  document.querySelectorAll("[data-section]").forEach((s) => s.classList.toggle("hidden", s.dataset.section !== view));
  document.querySelectorAll("#tabs button").forEach((b) => b.toggleAttribute("aria-current", b.dataset.view === view));
  document.querySelector("#tabs [aria-current]")?.setAttribute("aria-current", "page");
  history.replaceState(null, "", "#" + view);
  window.scrollTo(0, 0);
}
document.getElementById("tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.view); });
document.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) show(g.dataset.go); });
$("logout").addEventListener("click", async () => { await store.signOut(); location.replace("index.html"); });

// ── 계산 ──
const names = () => ({ a: (S.couple.names && S.couple.names.a) || "신랑", b: (S.couple.names && S.couple.names.b) || "신부" });
// 각 결제의 신랑·신부 몫. 예전 기록({amount, payer})도 알맞게 나눠 읽습니다.
function shares(p) {
  if (p.amountA != null || p.amountB != null) return { a: p.amountA || 0, b: p.amountB || 0 };
  const amt = p.amount || 0, n = names();
  if (p.payer === n.a) return { a: amt, b: 0 };
  if (p.payer === n.b) return { a: 0, b: amt };
  return { a: amt / 2, b: amt / 2 };
}
const amountOf = (p) => { const x = shares(p); return x.a + x.b; };
const paidOf = (itemId) => S.payments.filter((p) => p.itemId === itemId && p.done).reduce((s, p) => s + amountOf(p), 0);
const totalOf = (it) => (it.contract || 0) + (it.extra || 0);
const today = () => new Date().toISOString().slice(0, 10);

function statusTag(it) {
  const t = totalOf(it), p = paidOf(it.id);
  if (t > 0 && p >= t) return '<span class="tag tag-ok">결제 완료</span>';
  if (p > 0) return '<span class="tag tag-info">진행 중</span>';
  if (it.budget && t > it.budget) return '<span class="tag tag-warn">예산 초과</span>';
  return '<span class="tag" style="background:var(--line2);color:#4A5163">결제 전</span>';
}

// ── 그리기 ──
function renderAll() {
  renderMe(); renderHero(); renderSummary(); renderTasks(); renderItems(); renderPayments(); renderEvents(); renderTogether(); renderPhotos(); renderGuests(); renderGifts(); renderDayplan(); renderShopping(); renderNotes(); fillInfoForm();
}

function renderMe() {
  const n = S.profile.displayName || "";
  $("meName").textContent = n || "이름을 정해 주세요";
  $("meInitial").textContent = n ? n.slice(0, 1) : "나";
  const { a, b } = names();
  const opts = ["함께", a, b].map((x) => `<option>${esc(x)}</option>`).join("");
  $("lblA").textContent = `${a}이(가) 낸 금액`; $("lblB").textContent = `${b}이(가) 낸 금액`;
  for (const [id, n] of [["thA", a], ["thB", b], ["thA2", a], ["thB2", b]]) $(id).textContent = n;
  for (const id of ["ownerSelect"]) {
    const sel = $(id), v = sel.value; sel.innerHTML = opts; if (v) sel.value = v;
  }
}

function renderSummary() {
  const { a, b } = names();
  const c = S.couple;
  $("coupleLine").textContent = `${a} ♥ ${b}의 준비표`;
  const left = S.tasks.filter((t) => !t.done).length;
  $("headline").textContent = S.tasks.length ? (left ? `남은 할 일이 ${left}개예요` : "할 일을 모두 마쳤어요") : "준비를 시작해 볼까요?";
  const done = S.tasks.length - left;
  const pct = S.tasks.length ? Math.round((done / S.tasks.length) * 100) : 0;
  const expected = S.items.reduce((s, it) => s + totalOf(it), 0);
  const paid = S.payments.filter((p) => p.done).reduce((s, p) => s + amountOf(p), 0);
  const nextPay = S.payments.filter((p) => !p.done).sort((x, y) => (x.date || "9").localeCompare(y.date || "9"))[0];
  const itemName = (id) => (S.items.find((i) => i.id === id) || {}).name || "항목";
  $("stats").innerHTML = `
    <div class="stat"><span class="label">예식일까지</span><span class="value" style="color:var(--accent)">${esc(ddayLabel(c.weddingDate))}</span><span class="sub">${c.weddingDate ? esc(fmtDate(c.weddingDate)) : '<button type="button" class="btn-ghost" data-go="mine" style="padding:0;color:var(--accent)">예식일 입력하기</button>'}${c.venue ? " · " + esc(c.venue) : ""}</span></div>
    <div class="stat"><span class="label">체크리스트</span><span class="value">${done} / ${S.tasks.length}</span><div class="bar"><span style="width:${pct}%"></span></div></div>
    <div class="stat"><span class="label">총 예산</span><span class="value">${c.budgetTotal ? esc(won(c.budgetTotal)) : "미정"}</span><span class="sub">계약·추가금 합계 ${esc(won(expected))}${c.budgetTotal && expected > c.budgetTotal ? ' · <b style="color:var(--warn)">예산 초과</b>' : ""}</span></div>
    <div class="stat"><span class="label">남은 금액</span><span class="value">${esc(won(Math.max(0, expected - paid)))}</span><span class="sub">${nextPay ? "다음 결제: " + esc(itemName(nextPay.itemId)) + " " + esc(nextPay.kind || "") : "예정된 결제 없음"}</span></div>`;

  const todo = S.tasks.filter((t) => !t.done).slice(0, 5);
  $("sumTasks").innerHTML = todo.length ? todo.map(taskRow).join("") : '<p class="empty">남은 할 일이 없어요.</p>';

  const t = today();
  const ups = [
    ...S.events.filter((e) => e.date >= t).map((e) => ({ date: e.date, title: e.title, sub: [e.time, e.place].filter(Boolean).join(" · ") })),
    ...S.payments.filter((p) => !p.done && p.date).map((p) => ({ date: p.date, title: `${itemName(p.itemId)} ${p.kind || ""} 결제`, sub: won(amountOf(p)) }))
  ].sort((x, y) => x.date.localeCompare(y.date)).slice(0, 5);
  $("sumUpcoming").innerHTML = ups.length ? ups.map((u) => `<div class="event"><span class="d">${esc(fmtDate(u.date).replace(/ \(.\)/, ""))}</span><span style="display:flex;flex-direction:column"><b style="font-size:15px">${esc(u.title)}</b><span style="font-size:13px;color:var(--muted)">${esc(u.sub)}</span></span></div>`).join("") : '<p class="empty">다가오는 일정이 없어요.</p>';
}

function taskRow(t) {
  return `<div class="task ${t.done ? "done" : ""}">
    <input type="checkbox" ${t.done ? "checked" : ""} data-toggle="${esc(t.id)}" aria-label="${esc(t.title)} 완료">
    <div class="t"><span class="title">${esc(t.title)}</span><span class="meta">${esc(t.cat)} · ${esc(t.when)} · 담당 ${esc(t.owner)}</span></div>
    <button type="button" class="btn-ghost" data-edit-task="${esc(t.id)}">수정</button>
    <button type="button" class="btn-ghost" data-del="tasks:${esc(t.id)}" aria-label="${esc(t.title)} 삭제">삭제</button>
  </div>`;
}

const WHEN_ORDER = ["10~12개월 전", "6~9개월 전", "3~5개월 전", "1~2개월 전", "마지막 2주", "시기 미정"];
function renderTasks() {
  const list = S.tasks
    .filter((t) => S.filter === "all" || (S.filter === "done" ? t.done : !t.done))
    .sort((x, y) => WHEN_ORDER.indexOf(x.when) - WHEN_ORDER.indexOf(y.when) || (x.createdAt || 0) - (y.createdAt || 0));
  $("taskList").innerHTML = list.map(taskRow).join("") || (S.tasks.length ? '<p class="empty">해당하는 항목이 없어요.</p>' : "");
  $("seedBox").classList.toggle("hidden", S.tasks.length > 0);
}

function renderItems() {
  let tb = 0, tc = 0, te = 0, tp = 0;
  $("itemRows").innerHTML = S.items.slice().sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0)).map((it) => {
    const p = paidOf(it.id); tb += it.budget || 0; tc += it.contract || 0; te += it.extra || 0; tp += p;
    return `<tr><td><b>${esc(it.name)}</b>${it.memo ? `<div style="font-size:13px;color:var(--muted)">${esc(it.memo)}</div>` : ""}</td>
      <td class="num">${esc(won(it.budget))}</td><td class="num">${esc(won(it.contract))}</td><td class="num">${esc(won(it.extra))}</td>
      <td class="num">${esc(won(p))}</td><td class="num"><b>${esc(won(Math.max(0, totalOf(it) - p)))}</b></td><td>${statusTag(it)}</td>
      <td style="white-space:nowrap"><button type="button" class="btn-ghost" data-edit-item="${esc(it.id)}">수정</button><button type="button" class="btn-ghost" data-del="items:${esc(it.id)}" aria-label="${esc(it.name)} 삭제">삭제</button></td></tr>`;
  }).join("") || '<tr><td colspan="8" class="empty">아직 항목이 없어요. 위에서 예식장, 스드메 같은 항목을 추가해 보세요.</td></tr>';
  $("itemFoot").innerHTML = S.items.length ? `<tr><td>합계</td><td class="num">${esc(won(tb))}</td><td class="num">${esc(won(tc))}</td><td class="num">${esc(won(te))}</td><td class="num">${esc(won(tp))}</td><td class="num">${esc(won(Math.max(0, tc + te - tp)))}</td><td colspan="2"></td></tr>` : "";
  const sel = $("payItem"), v = sel.value;
  sel.innerHTML = S.items.map((it) => `<option value="${esc(it.id)}">${esc(it.name)}</option>`).join("");
  if (v) sel.value = v;
  $("payNeedItem").classList.toggle("hidden", S.items.length > 0);
}

function renderPayments() {
  const itemName = (id) => (S.items.find((i) => i.id === id) || {}).name || "(지운 항목)";
  $("payRows").innerHTML = S.payments.slice().sort((x, y) => (y.date || "").localeCompare(x.date || "")).map((p) => `<tr>
    <td>${p.date ? esc(fmtDate(p.date)) : "-"}</td><td>${esc(itemName(p.itemId))}</td><td>${esc(p.kind)}</td><td class="num"><b>${esc(won(amountOf(p)))}</b></td>
    <td class="num">${esc(won(shares(p).a))}</td><td class="num">${esc(won(shares(p).b))}</td><td>${p.done ? '<span class="tag tag-ok">완료</span>' : '<span class="tag tag-warn">예정</span>'}</td><td>${esc(p.memo)}</td>
    <td style="white-space:nowrap"><button type="button" class="btn-ghost" data-edit-pay="${esc(p.id)}">수정</button><button type="button" class="btn-ghost" data-del="payments:${esc(p.id)}" aria-label="결제 기록 삭제">삭제</button></td></tr>`).join("")
    || '<tr><td colspan="9" class="empty">아직 결제 기록이 없어요.</td></tr>';
  renderSplit();
}

function renderEvents() {
  $("eventList").innerHTML = S.events.slice().sort((x, y) => (x.date + (x.time || "")).localeCompare(y.date + (y.time || ""))).map((e) => `
    <div class="event" style="${e.date < today() ? "opacity:.6" : ""}"><span class="d">${esc(fmtDate(e.date).replace(/ \(.\)/, ""))}</span>
      <span style="display:flex;flex-direction:column;flex:1;min-width:0"><b style="font-size:15px">${esc(e.title)}</b><span style="font-size:13px;color:var(--muted)">${esc([e.time, e.place].filter(Boolean).join(" · "))}</span></span>
      <button type="button" class="btn-ghost" data-edit-event="${esc(e.id)}">수정</button><button type="button" class="btn-ghost" data-del="events:${esc(e.id)}" aria-label="${esc(e.title)} 삭제">삭제</button></div>`).join("")
    || '<p class="empty">아직 일정이 없어요.</p>';
}

function renderTogether() {
  const n = (S.couple.members || []).length;
  $("memberLine").textContent = n >= 2 ? "파트너와 준비표가 연결되어 있어요. 두 사람이 고친 내용은 서로의 화면에 바로 반영돼요." : "아직 혼자 쓰고 있어요.";
  $("inviteBox").classList.toggle("hidden", n >= 2);
  $("leaveBox").classList.toggle("hidden", n < 2);
  const tok = S.couple.inviteToken;
  $("linkBox").classList.toggle("hidden", !tok);
  $("makeInvite").textContent = tok ? "새 링크로 바꾸기" : "초대 링크 만들기";
  if (tok) $("inviteLink").value = new URL("invite.html?t=" + tok, location.href).href;
}

let infoFilled = false;
function fillInfoForm() {
  if (infoFilled && document.activeElement && $("infoForm").contains(document.activeElement)) return;
  const f = $("infoForm").elements, c = S.couple;
  f.displayName.value = S.profile.displayName || "";
  f.a.value = (c.names && c.names.a) || ""; f.b.value = (c.names && c.names.b) || "";
  f.weddingDate.value = c.weddingDate || ""; f.venue.value = c.venue || "";
  f.ceremonyTime.value = c.ceremonyTime || ""; f.hall.value = c.hall || ""; f.venueAddr.value = c.venueAddr || "";
  f.budgetTotal.value = c.budgetTotal ? c.budgetTotal.toLocaleString("ko-KR") : "";
  infoFilled = true;
}

// ── 공통 폼 처리 ──
function bindForm(formId, col, toData, fromDoc) {
  const form = $(formId);
  const submitBtn = form.querySelector('[type="submit"]');
  const cancel = form.querySelector("[data-cancel]");
  const reset = () => { form.reset(); form.elements.id.value = ""; submitBtn.textContent = "추가"; cancel.classList.add("hidden"); };
  cancel.addEventListener("click", reset);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = toData(form.elements);
    if (!data) return;
    const id = form.elements.id.value;
    try {
      if (id) await store.update(S.cid, col, id, data); else await store.add(S.cid, col, data);
      reset(); toast(id ? "고쳤어요" : "추가했어요");
    } catch (err) { toast(friendlyError(err)); }
  });
  return (doc) => {
    fromDoc(form.elements, doc); form.elements.id.value = doc.id;
    submitBtn.textContent = "고치기"; cancel.classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    form.querySelector("input:not([type=hidden]),select").focus();
  };
}
const clip = (s, n) => String(s || "").trim().slice(0, n);

const editTask = bindForm("taskForm", "tasks",
  (f) => ({ title: clip(f.title.value, 80), cat: f.cat.value, when: f.when.value, owner: f.owner.value, ...(f.id.value ? {} : { done: false }) }),
  (f, d) => { f.title.value = d.title; f.cat.value = d.cat; f.when.value = d.when; f.owner.value = d.owner; });
const editItem = bindForm("itemForm", "items",
  (f) => ({ name: clip(f.name.value, 40), budget: parseWon(f.budget.value), contract: parseWon(f.contract.value), extra: parseWon(f.extra.value), memo: clip(f.memo.value, 100) }),
  (f, d) => { f.name.value = d.name; f.budget.value = d.budget || ""; f.contract.value = d.contract || ""; f.extra.value = d.extra || ""; f.memo.value = d.memo || ""; });
const editPay = bindForm("payForm", "payments",
  (f) => {
    if (!f.itemId.value) { toast("먼저 예산 항목을 추가해 주세요"); return null; }
    const a = parseWon(f.amountA.value), b = parseWon(f.amountB.value);
    if (a + b <= 0) { toast("낸 금액을 한 칸 이상 적어 주세요"); return null; }
    return { itemId: f.itemId.value, kind: f.kind.value, amountA: a, amountB: b, amount: a + b, date: f.date.value, done: f.done.value === "1", memo: clip(f.memo.value, 100) };
  },
  (f, d) => { const x = shares(d); f.itemId.value = d.itemId; f.kind.value = d.kind; f.amountA.value = x.a || ""; f.amountB.value = x.b || ""; f.date.value = d.date || ""; f.done.value = d.done ? "1" : "0"; f.memo.value = d.memo || ""; });
const editEvent = bindForm("eventForm", "events",
  (f) => ({ date: f.date.value, time: f.time.value, title: clip(f.title.value, 60), place: clip(f.place.value, 60) }),
  (f, d) => { f.date.value = d.date; f.time.value = d.time || ""; f.title.value = d.title; f.place.value = d.place || ""; });

// ── 목록 안의 버튼 ──
document.getElementById("main").addEventListener("click", async (e) => {
  const t = e.target;
  const find = (col, id) => S[col].find((x) => x.id === id);
  if (t.dataset.editTask) return editTask(find("tasks", t.dataset.editTask));
  if (t.dataset.editItem) return editItem(find("items", t.dataset.editItem));
  if (t.dataset.editPay) return editPay(find("payments", t.dataset.editPay));
  if (t.dataset.editEvent) return editEvent(find("events", t.dataset.editEvent));
  if (t.dataset.del) {
    const [col, id] = t.dataset.del.split(":");
    if (col === "items" && S.payments.some((p) => p.itemId === id) && !confirm("이 항목의 결제 기록도 함께 지울까요?")) return;
    try {
      await store.remove(S.cid, col, id);
      if (col === "items") for (const p of S.payments.filter((p) => p.itemId === id)) await store.remove(S.cid, "payments", p.id);
      toast("지웠어요");
    } catch (err) { toast(friendlyError(err)); }
  }
});
document.getElementById("main").addEventListener("change", async (e) => {
  const id = e.target.dataset.toggle;
  if (!id) return;
  try { await store.update(S.cid, "tasks", id, { done: e.target.checked }); } catch (err) { toast(friendlyError(err)); }
});
$("taskFilters").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  S.filter = b.dataset.f;
  $("taskFilters").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  renderTasks();
});

// 기본 체크리스트
const SEED = [
  ["예산 정하기", "가족", "10~12개월 전"], ["양가 인사드리기", "가족", "10~12개월 전"], ["예식장 투어·계약", "예식장", "10~12개월 전"],
  ["스튜디오·드레스·메이크업 비교·계약", "스드메", "6~9개월 전"], ["신혼여행지 정하고 예약하기", "신혼여행", "6~9개월 전"], ["상견례", "가족", "6~9개월 전"],
  ["웨딩 촬영", "스드메", "3~5개월 전"], ["예물·예복 준비", "예물·예복", "3~5개월 전"], ["신혼집·혼수 알아보기", "신혼집", "3~5개월 전"],
  ["하객 명단 정리", "청첩장", "1~2개월 전"], ["청첩장 제작·발송", "청첩장", "1~2개월 전"], ["드레스 가봉", "스드메", "1~2개월 전"], ["사회·축가 부탁하기", "예식장", "1~2개월 전"],
  ["잔금 정리", "기타", "마지막 2주"], ["식순·하객 수 최종 확인", "예식장", "마지막 2주"], ["당일 준비물 챙기기", "기타", "마지막 2주"]
];
$("seed").addEventListener("click", async () => {
  $("seed").disabled = true;
  try { for (const [title, cat, when] of SEED) await store.add(S.cid, "tasks", { title, cat, when, owner: "함께", done: false }); toast("기본 체크리스트를 불러왔어요"); }
  catch (err) { toast(friendlyError(err)); }
  $("seed").disabled = false;
});

// ── 기본 정보 ──
$("infoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target.elements;
  try {
    await store.updateProfile({ displayName: clip(f.displayName.value, 20) });
    S.profile.displayName = clip(f.displayName.value, 20);
    await store.updateCouple(S.cid, { names: { a: clip(f.a.value, 20), b: clip(f.b.value, 20) }, weddingDate: f.weddingDate.value, ceremonyTime: f.ceremonyTime.value, venue: clip(f.venue.value, 40), hall: clip(f.hall.value, 30), venueAddr: clip(f.venueAddr.value, 80), budgetTotal: parseWon(f.budgetTotal.value) });
    renderMe(); toast("저장했어요");
  } catch (err) { toast(friendlyError(err)); }
});

// ── 함께 관리 ──
$("makeInvite").addEventListener("click", async () => {
  if (store.demo) { toast("체험 모드에서는 초대 링크가 작동하지 않아요"); }
  try { await store.createInvite(S.cid, S.profile.displayName || names().a); toast("초대 링크를 만들었어요"); } catch (err) { toast(friendlyError(err)); }
});
$("copyLink").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("inviteLink").value); toast("복사했어요. 카카오톡으로 보내 주세요"); }
  catch (e) { $("inviteLink").select(); toast("링크를 길게 눌러 복사해 주세요"); }
});
$("cancelInvite").addEventListener("click", async () => {
  try { await store.cancelInvite(S.cid, S.couple.inviteToken); toast("초대를 취소했어요"); } catch (err) { toast(friendlyError(err)); }
});
$("leave").addEventListener("click", async () => {
  if (!confirm("정말 연결을 끊을까요? 이 준비표를 더 볼 수 없게 돼요.")) return;
  try { await store.leave(S.cid); location.reload(); } catch (err) { toast(friendlyError(err)); }
});

// ── 내려받기·탈퇴 ──
$("export").addEventListener("click", async () => {
  try {
    const data = await store.exportAll(S.cid);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `weddingnote-my-data-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (err) { toast(friendlyError(err)); }
});
$("delOk").addEventListener("change", (e) => { $("del").disabled = !e.target.checked; });
$("del").addEventListener("click", async () => {
  if (!confirm("탈퇴하면 기록을 되돌릴 수 없어요. 계속할까요?")) return;
  $("del").disabled = true;
  try {
    unsubs.forEach((f) => f()); unsubs.length = 0;
    await store.deleteAccount(S.cid);
    alert("탈퇴가 끝났어요. 그동안 이용해 주셔서 고마워요.");
    location.replace("index.html");
  } catch (err) { toast(friendlyError(err)); $("del").disabled = false; }
});


// ── 첫 화면(대표 사진·D-day) ──
function heroDate(c) {
  if (!c.weddingDate) return "예식일을 '내 정보'에서 입력해 주세요";
  const d = new Date(c.weddingDate + "T00:00:00");
  let t = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
  if (c.ceremonyTime) { const [h, m] = c.ceremonyTime.split(":").map(Number); t += ` ${h < 12 ? "오전" : "오후"} ${((h + 11) % 12) + 1}시${m ? " " + m + "분" : ""}`; }
  return t;
}
function coverPhoto() {
  return S.photos.find((p) => p.id === S.couple.coverPhotoId) || S.photos.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0];
}
function renderHero() {
  const c = S.couple, { a, b } = names();
  const may = c.weddingDate && c.weddingDate.slice(5, 7) === "05";
  $("heroBadge").textContent = may ? "5월의 신랑 신부" : "우리의 결혼식";
  $("heroDday").textContent = ddayLabel(c.weddingDate);
  $("heroNames").textContent = `${a} ♥ ${b}`;
  $("heroMeta").textContent = [heroDate(c), [c.venue, c.hall].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  const p = coverPhoto(), card = $("heroCard");
  if (p && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.data)) {
    card.classList.add("photo"); card.style.backgroundImage = `url("${p.data}")`;
  } else { card.classList.remove("photo"); card.style.backgroundImage = ""; }
}

// ── 우리 사진 ──
function renderPhotos() {
  const cover = coverPhoto();
  $("photoGrid").innerHTML = S.photos.filter((p) => typeof p.data === "string" && p.data.startsWith("data:image/")).sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0)).map((p) => `
    <figure class="photo-item ${cover && cover.id === p.id ? "cover" : ""}" style="margin:0">
      <img src="${esc(p.data)}" alt="${esc(p.caption || "우리 사진")}" loading="lazy">
      ${p.caption ? `<figcaption class="cap">${esc(p.caption)}</figcaption>` : ""}
      <div class="acts">
        ${cover && cover.id === p.id ? '<button type="button" disabled>대표 사진</button>' : `<button type="button" data-cover="${esc(p.id)}">대표로</button>`}
        <button type="button" data-delphoto="${esc(p.id)}" aria-label="사진 삭제">삭제</button>
      </div>
    </figure>`).join("") || '<p class="empty">아직 올린 사진이 없어요.</p>';
}

// 사진을 긴 변 1600px 이하 JPEG로 줄이고, 저장 한도(약 1MB) 안에 들어오게 화질을 맞춥니다.
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      let max = 1600, out = "";
      for (let tries = 0; tries < 6; tries++) {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        out = cv.toDataURL("image/jpeg", tries < 3 ? 0.82 - tries * 0.1 : 0.6);
        if (out.length < 900000) break;
        if (tries >= 2) max = Math.round(max * 0.8);
      }
      URL.revokeObjectURL(url);
      out.length < 900000 ? resolve({ data: out }) : reject(new Error("사진이 너무 커요. 다른 사진으로 해 주세요."));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("사진을 읽을 수 없어요.")); };
    img.src = url;
  });
}
$("photoInput").addEventListener("change", async (e) => {
  const files = [...e.target.files].filter((f) => f.type.startsWith("image/")).slice(0, 10);
  if (!files.length) return;
  if (S.photos.length + files.length > 30) { toast("사진은 30장까지 올릴 수 있어요"); return; }
  toast(`사진 ${files.length}장을 올리는 중이에요…`);
  try {
    for (const f of files) {
      const { data } = await shrink(f);
      await store.add(S.cid, "photos", { data, caption: clip($("photoCap").value, 30) });
    }
    $("photoCap").value = ""; toast("사진을 올렸어요");
  } catch (err) { toast(friendlyError(err)); }
  e.target.value = "";
});
$("photoGrid").addEventListener("click", async (e) => {
  const t = e.target;
  try {
    if (t.dataset.cover) { await store.updateCouple(S.cid, { coverPhotoId: t.dataset.cover }); toast("대표 사진으로 정했어요"); }
    if (t.dataset.delphoto) {
      if (!confirm("이 사진을 지울까요?")) return;
      await store.remove(S.cid, "photos", t.dataset.delphoto);
      if (S.couple.coverPhotoId === t.dataset.delphoto) await store.updateCouple(S.cid, { coverPhotoId: null });
      toast("지웠어요");
    }
  } catch (err) { toast(friendlyError(err)); }
});


// ── 누가 얼마 냈나 ──
function renderSplit() {
  const { a, b } = names();
  const done = S.payments.filter((p) => p.done), plan = S.payments.filter((p) => !p.done);
  const sum = (list, k) => list.reduce((s, p) => s + shares(p)[k], 0);
  const A = sum(done, "a"), B = sum(done, "b"), T = A + B;
  const pa = T ? Math.round((A / T) * 100) : 0, pb = T ? 100 - pa : 0;
  const diff = Math.abs(A - B), more = A > B ? a : b;
  $("splitStats").innerHTML = `
    <div class="stat" style="background:var(--accent-tint)"><span class="label">${esc(a)}이(가) 낸 돈</span><span class="value">${esc(won(A))}</span><span class="sub">전체의 ${pa}%${sum(plan, "a") ? " · 예정 " + esc(won(sum(plan, "a"))) : ""}</span></div>
    <div class="stat" style="background:var(--sage-tint)"><span class="label">${esc(b)}이(가) 낸 돈</span><span class="value">${esc(won(B))}</span><span class="sub">전체의 ${pb}%${sum(plan, "b") ? " · 예정 " + esc(won(sum(plan, "b"))) : ""}</span></div>
    <div class="stat"><span class="label">함께 낸 돈 합계</span><span class="value">${esc(won(T))}</span><span class="sub">${T ? (diff ? `${esc(more)}이(가) ${esc(won(diff))} 더 냈어요` : "똑같이 냈어요") : "아직 결제 완료 기록이 없어요"}</span></div>`;
  $("splitBar").innerHTML = T ? `<div class="bar" style="height:14px;display:flex;background:#D8E6D9" role="img" aria-label="${esc(a)} ${pa}%, ${esc(b)} ${pb}%"><span style="width:${pa}%;border-radius:999px 0 0 999px"></span></div>
    <div class="row between" style="font-size:13px;color:var(--muted);margin-top:4px"><span>${esc(a)} ${pa}%</span><span>${esc(b)} ${pb}%</span></div>` : "";
  const itemName = (id) => (S.items.find((i) => i.id === id) || {}).name || "(지운 항목)";
  const by = {};
  for (const p of done) { const k = p.itemId; by[k] = by[k] || { a: 0, b: 0 }; const x = shares(p); by[k].a += x.a; by[k].b += x.b; }
  $("splitRows").innerHTML = Object.entries(by).map(([id, v]) => {
    const t = v.a + v.b, r = t ? Math.round((v.a / t) * 100) : 0;
    return `<tr><td><b>${esc(itemName(id))}</b></td><td class="num">${esc(won(v.a))}</td><td class="num">${esc(won(v.b))}</td><td class="num"><b>${esc(won(t))}</b></td>
      <td style="min-width:140px"><div class="bar" style="display:flex;background:#D8E6D9"><span style="width:${r}%"></span></div><span style="font-size:12px;color:var(--muted)">${r} : ${100 - r}</span></td></tr>`;
  }).join("") || '<tr><td colspan="5" class="empty">결제 완료 기록이 생기면 항목별로 나눠 보여 줘요.</td></tr>';
}


// ══════════ 새 메뉴 ══════════
const sideName = (k) => (k === "b" ? names().b : names().a) + "측";
const sideTag = (k) => `<span class="tag ${k === "b" ? "side-b" : "side-a"}">${esc(sideName(k))}</span>`;
function sideLabels() {
  document.querySelectorAll(".sideA").forEach((el) => (el.textContent = sideName("a")));
  document.querySelectorAll(".sideB").forEach((el) => (el.textContent = sideName("b")));
}
function filterBar(id, key, rerender) {
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S[key] = b.dataset.f;
    $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    rerender();
  });
}
const num = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));

// ── 하객 명단 ──
function renderGuests() {
  sideLabels();
  const G = S.guests;
  const live = G.filter((g) => g.attend !== "불참");
  const cnt = (list) => list.reduce((s, g) => s + (g.count || 0), 0);
  const sent = G.filter((g) => g.invite && g.invite !== "아직").length;
  $("guestStats").innerHTML = `
    <div class="stat"><span class="label">예상 하객 수 (식권)</span><span class="value">${cnt(live)}명</span><span class="sub">불참으로 표시한 분은 빼고 셌어요</span></div>
    <div class="stat"><span class="label">${esc(sideName("a"))}</span><span class="value">${cnt(live.filter((g) => g.side !== "b"))}명</span><span class="sub">명단 ${G.filter((g) => g.side !== "b").length}건</span></div>
    <div class="stat"><span class="label">${esc(sideName("b"))}</span><span class="value">${cnt(live.filter((g) => g.side === "b"))}명</span><span class="sub">명단 ${G.filter((g) => g.side === "b").length}건</span></div>
    <div class="stat"><span class="label">청첩장 보냄</span><span class="value">${sent} / ${G.length}</span><div class="bar"><span style="width:${G.length ? Math.round((sent / G.length) * 100) : 0}%"></span></div></div>`;
  const f = S.gf;
  const rows = G.filter((g) => f === "all" || (f === "notsent" ? (!g.invite || g.invite === "아직") : (f === "b" ? g.side === "b" : g.side !== "b")))
    .sort((x, y) => (x.side || "a").localeCompare(y.side || "a") || (x.group || "").localeCompare(y.group || "") || (x.name || "").localeCompare(y.name || "", "ko"));
  $("guestRows").innerHTML = rows.map((g) => `<tr>
    <td><b>${esc(g.name)}</b></td><td>${sideTag(g.side)}</td><td>${esc(g.group)}</td><td class="num">${esc(g.count ?? 1)}</td>
    <td><label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" class="mini-check" data-gsent="${esc(g.id)}" ${g.invite && g.invite !== "아직" ? "checked" : ""} aria-label="${esc(g.name)} 청첩장 보냄">${esc(g.invite && g.invite !== "아직" ? g.invite : "아직")}</label></td>
    <td>${g.attend === "참석" ? '<span class="tag tag-ok">참석</span>' : g.attend === "불참" ? '<span class="tag" style="background:var(--line2);color:#4A5163">불참</span>' : '<span class="tag tag-warn">미정</span>'}</td>
    <td>${esc(g.memo)}</td>
    <td style="white-space:nowrap"><button type="button" class="btn-ghost" data-edit-guest="${esc(g.id)}">수정</button><button type="button" class="btn-ghost" data-del="guests:${esc(g.id)}" aria-label="${esc(g.name)} 삭제">삭제</button></td></tr>`).join("")
    || `<tr><td colspan="8" class="empty">${G.length ? "해당하는 분이 없어요." : "아직 명단이 없어요. 위에서 한 분씩 추가해 보세요."}</td></tr>`;
  $("guestNames").innerHTML = G.map((g) => `<option value="${esc(g.name)}">`).join("");
}
const editGuest = bindForm("guestForm", "guests",
  (f) => ({ name: clip(f.name.value, 30), side: f.side.value === "b" ? "b" : "a", group: f.group.value, count: num(f.count.value, 50), invite: f.invite.value, attend: f.attend.value, memo: clip(f.memo.value, 60) }),
  (f, d) => { f.name.value = d.name; f.side.value = d.side || "a"; f.group.value = d.group; f.count.value = d.count ?? 1; f.invite.value = d.invite || "아직"; f.attend.value = d.attend || "미정"; f.memo.value = d.memo || ""; });
filterBar("guestFilters", "gf", renderGuests);

// ── 축의금 ──
function renderGifts() {
  const L = S.gifts, sum = (list) => list.reduce((s, x) => s + (x.amount || 0), 0);
  const done = L.filter((x) => x.thanked).length;
  $("giftStats").innerHTML = `
    <div class="stat"><span class="label">축의금 합계</span><span class="value">${esc(won(sum(L)))}</span><span class="sub">${L.length}건</span></div>
    <div class="stat"><span class="label">${esc(sideName("a"))}</span><span class="value">${esc(won(sum(L.filter((x) => x.side !== "b"))))}</span><span class="sub">${L.filter((x) => x.side !== "b").length}건</span></div>
    <div class="stat"><span class="label">${esc(sideName("b"))}</span><span class="value">${esc(won(sum(L.filter((x) => x.side === "b"))))}</span><span class="sub">${L.filter((x) => x.side === "b").length}건</span></div>
    <div class="stat"><span class="label">감사 인사</span><span class="value">${done} / ${L.length}</span><div class="bar"><span style="width:${L.length ? Math.round((done / L.length) * 100) : 0}%"></span></div></div>`;
  const f = S.gif;
  const rows = L.filter((x) => f === "all" || (f === "todo" ? !x.thanked : (f === "b" ? x.side === "b" : x.side !== "b")))
    .sort((x, y) => (x.name || "").localeCompare(y.name || "", "ko"));
  $("giftRows").innerHTML = rows.map((x) => `<tr>
    <td><b>${esc(x.name)}</b></td><td>${sideTag(x.side)}</td><td class="num"><b>${esc(won(x.amount))}</b></td><td>${esc(x.method)}</td>
    <td><label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" class="mini-check" data-thank="${esc(x.id)}" ${x.thanked ? "checked" : ""} aria-label="${esc(x.name)} 감사 인사 완료">${x.thanked ? "했어요" : "아직"}</label></td>
    <td>${esc(x.memo)}</td>
    <td style="white-space:nowrap"><button type="button" class="btn-ghost" data-edit-gift="${esc(x.id)}">수정</button><button type="button" class="btn-ghost" data-del="gifts:${esc(x.id)}" aria-label="${esc(x.name)} 기록 삭제">삭제</button></td></tr>`).join("")
    || `<tr><td colspan="7" class="empty">${L.length ? "해당하는 기록이 없어요." : "결혼식 뒤 받은 축의금을 적어 두면 감사 인사까지 한 번에 챙길 수 있어요."}</td></tr>`;
}
const editGift = bindForm("giftForm", "gifts",
  (f) => ({ name: clip(f.name.value, 30), side: f.side.value === "b" ? "b" : "a", amount: parseWon(f.amount.value), method: f.method.value, thanked: f.thanked.value === "1", memo: clip(f.memo.value, 60) }),
  (f, d) => { f.name.value = d.name; f.side.value = d.side || "a"; f.amount.value = d.amount || ""; f.method.value = d.method || "현금"; f.thanked.value = d.thanked ? "1" : "0"; f.memo.value = d.memo || ""; });
filterBar("giftFilters", "gif", renderGifts);
// 하객 이름을 고르면 어느 쪽인지 자동으로 맞춤
$("giftForm").elements.name.addEventListener("change", (e) => {
  const g = S.guests.find((x) => x.name === e.target.value); if (g) $("giftForm").elements.side.value = g.side || "a";
});

// ── 당일 시간표 ──
function renderDayplan() {
  const c = S.couple, { a, b } = names();
  $("dayplanDate").textContent = c.weddingDate ? heroDate(c) : "";
  $("ownerList").innerHTML = ["함께", a, b, "신랑 어머니", "신부 어머니", "들러리", "플래너", "사회자"].map((x) => `<option value="${esc(x)}">`).join("");
  const L = S.dayplan.slice().sort((x, y) => (x.time || "").localeCompare(y.time || ""));
  $("dayList").innerHTML = L.map((p) => `<div class="plan ${p.done ? "done" : ""}">
      <input type="checkbox" class="mini-check" data-dpdone="${esc(p.id)}" ${p.done ? "checked" : ""} aria-label="${esc(p.title)} 완료">
      <span class="tm">${esc(p.time)}</span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column"><b class="tt" style="font-size:15px">${esc(p.title)}</b>
        <span style="font-size:13px;color:var(--muted)">${esc([p.owner && "챙길 사람: " + p.owner, p.place, p.memo].filter(Boolean).join(" · "))}</span></span>
      <button type="button" class="btn-ghost" data-edit-dp="${esc(p.id)}">수정</button><button type="button" class="btn-ghost" data-del="dayplan:${esc(p.id)}" aria-label="${esc(p.title)} 삭제">삭제</button></div>`).join("");
  $("daySeedBox").classList.toggle("hidden", L.length > 0);
}
const editDay = bindForm("dayForm", "dayplan",
  (f) => ({ time: f.time.value, title: clip(f.title.value, 50), owner: clip(f.owner.value, 20), place: clip(f.place.value, 30), memo: clip(f.memo.value, 60), ...(f.id.value ? {} : { done: false }) }),
  (f, d) => { f.time.value = d.time; f.title.value = d.title; f.owner.value = d.owner || ""; f.place.value = d.place || ""; f.memo.value = d.memo || ""; });
$("daySeed").addEventListener("click", async () => {
  const base = S.couple.ceremonyTime || "12:00";
  const [h, m] = base.split(":").map(Number), start = h * 60 + m;
  const at = (off) => { const t = (start + off + 1440) % 1440; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
  const { a, b } = names();
  const SEED = [[-270, "헤어·메이크업 시작", b], [-180, "신랑 헤어·메이크업", a], [-100, "예식장 도착·소지품 맡기기", "함께"], [-90, "신부 대기실 입장·스냅 촬영", b],
    [-60, "하객 맞이 시작", a], [-45, "축의대 담당에게 장부·봉투 전달", "함께"], [-20, "사회자·축가와 마지막 확인", a], [0, "본식 시작", "함께"],
    [40, "단체 사진 촬영", "함께"], [60, "폐백", "함께"], [90, "피로연 하객 인사", "함께"], [130, "축의금·방명록 회수, 소지품 확인", "함께"]];
  $("daySeed").disabled = true;
  try { for (const [off, title, owner] of SEED) await store.add(S.cid, "dayplan", { time: at(off), title, owner, place: "", memo: "", done: false }); toast(`예식 ${base} 기준으로 불러왔어요`); }
  catch (err) { toast(friendlyError(err)); }
  $("daySeed").disabled = false;
});

// ── 혼수·신혼집 ──
const safeUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(u || "") ? u : "";
function renderShopping() {
  const L = S.shopping, groups = {};
  for (const x of L) (groups[x.item] = groups[x.item] || []).push(x);
  let bought = 0, planned = 0;
  const html = Object.entries(groups).sort((p, q) => p[0].localeCompare(q[0], "ko")).map(([item, opts]) => {
    const live = opts.filter((o) => o.status !== "안 사기로");
    const done = opts.filter((o) => o.status === "구매 완료");
    const priced = live.filter((o) => o.price > 0);
    const min = priced.length ? Math.min(...priced.map((o) => o.price)) : 0;
    if (done.length) bought += done.reduce((s, o) => s + (o.price || 0), 0); else planned += min;
    const head = done.length ? '<span class="tag tag-ok">구매 완료</span>' : (min ? `<span style="font-size:14px">최저 <b>${esc(won(min))}</b></span>` : "");
    return `<div class="shop-group"><header><b>${esc(item)} <span style="font-weight:400;font-size:13px;color:var(--muted)">${esc(opts[0].cat || "")} · 후보 ${opts.length}개</span></b>${head}</header>
      ${opts.slice().sort((x, y) => (x.price || 9e15) - (y.price || 9e15)).map((o) => {
        const u = safeUrl(o.url);
        return `<div class="shop-opt" style="${o.status === "안 사기로" ? "opacity:.5" : ""}">
          <span>${esc(o.option || "(후보 이름 없음)")}${u ? ` <a href="${esc(u)}" target="_blank" rel="noopener noreferrer">링크</a>` : ""}${o.memo ? ` <span style="font-size:13px;color:var(--muted)">· ${esc(o.memo)}</span>` : ""}</span>
          <span class="tag ${o.status === "구매 완료" ? "tag-ok" : o.status === "살 것" ? "tag-info" : o.status === "안 사기로" ? "" : "tag-warn"}">${esc(o.status)}</span>
          ${!done.length && min && o.price === min && o.status !== "안 사기로" ? '<span class="best">최저가</span>' : ""}
          <span class="pr">${o.price ? esc(won(o.price)) : "가격 미정"}</span>
          <button type="button" class="btn-ghost" data-edit-shop="${esc(o.id)}">수정</button><button type="button" class="btn-ghost" data-del="shopping:${esc(o.id)}" aria-label="${esc(item)} 후보 삭제">삭제</button></div>`;
      }).join("")}</div>`;
  }).join("");
  $("shopList").innerHTML = html || '<p class="empty">사고 싶은 것을 적어 보세요. 같은 품목에 후보를 여러 개 넣으면 가격을 비교해 줘요.</p>';
  $("shopItems").innerHTML = Object.keys(groups).map((k) => `<option value="${esc(k)}">`).join("");
  $("shopStats").innerHTML = `
    <div class="stat"><span class="label">이미 산 것</span><span class="value">${esc(won(bought))}</span><span class="sub">'구매 완료' 합계</span></div>
    <div class="stat"><span class="label">앞으로 살 것 (최저가 기준)</span><span class="value">${esc(won(planned))}</span><span class="sub">아직 안 산 품목의 가장 싼 후보 합계</span></div>
    <div class="stat"><span class="label">품목 수</span><span class="value">${Object.keys(groups).length}개</span><span class="sub">후보 ${L.length}개</span></div>`;
}
const editShop = bindForm("shopForm", "shopping",
  (f) => {
    const url = (f.url.value || "").trim();
    if (url && !safeUrl(url)) { toast("링크는 https:// 로 시작하는 주소만 넣을 수 있어요"); return null; }
    return { item: clip(f.thing.value, 30), cat: f.cat.value, option: clip(f.option.value, 50), price: parseWon(f.price.value), status: f.status.value, url: url.slice(0, 300), memo: clip(f.memo.value, 60) };
  },
  (f, d) => { f.thing.value = d.item; f.cat.value = d.cat || "가전"; f.option.value = d.option || ""; f.price.value = d.price || ""; f.status.value = d.status || "비교 중"; f.url.value = d.url || ""; f.memo.value = d.memo || ""; });

// ── 결정 기록 ──
function renderNotes() {
  const q = (S.noteQ || "").trim();
  const L = S.notes.filter((n) => !q || (n.topic + " " + n.decision + " " + (n.reason || "")).includes(q))
    .sort((x, y) => (y.date || "").localeCompare(x.date || "") || (y.createdAt || 0) - (x.createdAt || 0));
  $("noteList").innerHTML = L.map((n) => `<article class="note">
      <span class="tp">${esc(n.topic)} · ${n.date ? esc(fmtDate(n.date)) : ""}</span>
      <b style="font-size:16px">${esc(n.decision)}</b>
      ${n.reason ? `<span style="font-size:14px;color:#4A5163">이유: ${esc(n.reason)}</span>` : ""}
      <span class="row" style="justify-content:flex-end"><button type="button" class="btn-ghost" data-edit-note="${esc(n.id)}">수정</button><button type="button" class="btn-ghost" data-del="notes:${esc(n.id)}" aria-label="결정 기록 삭제">삭제</button></span></article>`).join("")
    || `<p class="empty">${S.notes.length ? "찾는 기록이 없어요." : "아직 남긴 결정이 없어요."}</p>`;
  const f = $("noteForm").elements; if (!f.date.value && !f.id.value) f.date.value = today();
}
const editNote = bindForm("noteForm", "notes",
  (f) => ({ date: f.date.value || today(), topic: clip(f.topic.value, 30), decision: clip(f.decision.value, 100), reason: clip(f.reason.value, 200) }),
  (f, d) => { f.date.value = d.date || ""; f.topic.value = d.topic; f.decision.value = d.decision; f.reason.value = d.reason || ""; });
$("noteSearch").addEventListener("input", (e) => { S.noteQ = e.target.value; renderNotes(); });

// ── 새 메뉴 목록 안의 버튼·체크 ──
document.getElementById("main").addEventListener("click", (e) => {
  const t = e.target, find = (col, id) => S[col].find((x) => x.id === id);
  if (t.dataset.editGuest) editGuest(find("guests", t.dataset.editGuest));
  if (t.dataset.editGift) editGift(find("gifts", t.dataset.editGift));
  if (t.dataset.editDp) editDay(find("dayplan", t.dataset.editDp));
  if (t.dataset.editShop) editShop(find("shopping", t.dataset.editShop));
  if (t.dataset.editNote) editNote(find("notes", t.dataset.editNote));
});
document.getElementById("main").addEventListener("change", async (e) => {
  const d = e.target.dataset;
  try {
    if (d.gsent) {
      const g = S.guests.find((x) => x.id === d.gsent);
      await store.update(S.cid, "guests", d.gsent, { invite: e.target.checked ? (g && g.invite && g.invite !== "아직" ? g.invite : "모바일") : "아직" });
    }
    if (d.thank) await store.update(S.cid, "gifts", d.thank, { thanked: e.target.checked });
    if (d.dpdone) await store.update(S.cid, "dayplan", d.dpdone, { done: e.target.checked });
  } catch (err) { toast(friendlyError(err)); }
});
