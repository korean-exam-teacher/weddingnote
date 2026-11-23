// 데이터 저장소 — Firebase(실제 서비스) 또는 체험 모드(이 브라우저에만 저장)
// 화면 코드는 이 파일의 함수만 사용하므로, 저장 방식이 달라도 화면은 같습니다.
import { firebaseConfig, KAKAO_PROVIDER_ID, DEMO_MODE } from "./firebase-config.js";

export const COLLECTIONS = ["tasks", "items", "payments", "events", "photos"];
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

let storePromise = null;
export function getStore() {
  if (!storePromise) storePromise = DEMO_MODE ? Promise.resolve(makeDemoStore()) : makeFirebaseStore();
  return storePromise;
}
export { DEMO_MODE };

// 추측하기 어려운 초대 코드(32자)
export function randomToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("").slice(0, 24) +
    Date.now().toString(36).slice(-6);
}

function emptyCouple(uid) {
  return { members: [uid], names: { a: "", b: "" }, weddingDate: "", venue: "", budgetTotal: 0, inviteToken: null };
}

/* ───────────────────────── Firebase ───────────────────────── */
async function makeFirebaseStore() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  await A.setPersistence(auth, A.browserLocalPersistence);
  const db = F.getFirestore(app);
  const provider = () => {
    const p = new A.OAuthProvider(KAKAO_PROVIDER_ID);
    // 최소 수집: 'openid'(회원 식별 번호)만 요청합니다. 닉네임·이메일·전화번호는 받지 않습니다.
    p.addScope("openid");
    return p;
  };
  const userDoc = (uid) => F.doc(db, "users", uid);
  const coupleDoc = (cid) => F.doc(db, "couples", cid);
  const col = (cid, name) => F.collection(db, "couples", cid, name);

  async function wipeCouple(cid, couple) {
    for (const name of COLLECTIONS) {
      const snap = await F.getDocs(col(cid, name));
      for (const d of snap.docs) await F.deleteDoc(d.ref);
    }
    if (couple && couple.inviteToken) {
      try { await F.deleteDoc(F.doc(db, "invites", couple.inviteToken)); } catch (e) { /* 이미 없음 */ }
    }
    await F.deleteDoc(coupleDoc(cid));
  }

  // 내 준비표에서 빠지기: 혼자면 준비표 전체 삭제, 둘이면 나만 빠짐
  async function leaveCouple(uid, cid) {
    let snap;
    try { snap = await F.getDoc(coupleDoc(cid)); } catch (e) { return; }
    if (!snap.exists()) return;
    const c = snap.data();
    if (c.members.length <= 1) await wipeCouple(cid, c);
    else await F.updateDoc(coupleDoc(cid), { members: F.arrayRemove(uid) });
  }

  async function createCouple(uid) {
    const ref = F.doc(F.collection(db, "couples"));
    await F.setDoc(ref, { ...emptyCouple(uid), createdAt: F.serverTimestamp() });
    return ref.id;
  }

  return {
    demo: false,
    onAuth(cb) {
      return A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid } : null));
    },
    async signIn() {
      try {
        await A.signInWithPopup(auth, provider());
      } catch (e) {
        if (e && e.code === "auth/popup-blocked") return A.signInWithRedirect(auth, provider());
        throw e;
      }
    },
    signOut() { return A.signOut(auth); },
    currentUid() { return auth.currentUser ? auth.currentUser.uid : null; },

    // 내 정보와 준비표를 불러오고, 없으면 새로 만듭니다.
    async loadMe() {
      const uid = auth.currentUser.uid;
      const us = await F.getDoc(userDoc(uid));
      let profile = us.exists() ? us.data() : null;
      let cid = profile && profile.coupleId;
      if (cid) {
        try {
          const cs = await F.getDoc(coupleDoc(cid));
          if (!cs.exists() || !cs.data().members.includes(uid)) cid = null;
        } catch (e) { cid = null; }
      }
      if (!cid) {
        cid = await createCouple(uid);
        profile = { displayName: (profile && profile.displayName) || "", coupleId: cid };
        await F.setDoc(userDoc(uid), { ...profile, createdAt: F.serverTimestamp() }, { merge: true });
      }
      return { uid, profile, cid };
    },
    updateProfile(data) { return F.setDoc(userDoc(auth.currentUser.uid), data, { merge: true }); },
    watchCouple(cid, cb) { return F.onSnapshot(coupleDoc(cid), (s) => s.exists() && cb(s.data())); },
    updateCouple(cid, data) { return F.updateDoc(coupleDoc(cid), data); },
    watch(cid, name, cb) {
      return F.onSnapshot(col(cid, name), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    },
    add(cid, name, data) { return F.addDoc(col(cid, name), { ...data, createdAt: Date.now(), by: auth.currentUser.uid }); },
    update(cid, name, id, data) { return F.updateDoc(F.doc(db, "couples", cid, name, id), data); },
    remove(cid, name, id) { return F.deleteDoc(F.doc(db, "couples", cid, name, id)); },

    // 초대 링크 만들기(7일 동안 유효, 한 번에 하나)
    async createInvite(cid, fromName) {
      const cs = await F.getDoc(coupleDoc(cid));
      const old = cs.exists() && cs.data().inviteToken;
      if (old) { try { await F.deleteDoc(F.doc(db, "invites", old)); } catch (e) { /* 무시 */ } }
      const token = randomToken();
      await F.setDoc(F.doc(db, "invites", token), {
        cid, createdBy: auth.currentUser.uid, fromName: (fromName || "").slice(0, 20),
        expiresAt: F.Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000)
      });
      await F.updateDoc(coupleDoc(cid), { inviteToken: token });
      return token;
    },
    async cancelInvite(cid, token) {
      await F.deleteDoc(F.doc(db, "invites", token));
      await F.updateDoc(coupleDoc(cid), { inviteToken: null });
    },
    async readInvite(token) {
      const s = await F.getDoc(F.doc(db, "invites", token));
      if (!s.exists()) return null;
      const d = s.data();
      return { cid: d.cid, fromName: d.fromName, expired: d.expiresAt.toMillis() < Date.now(), mine: d.createdBy === auth.currentUser.uid };
    },
    async acceptInvite(token) {
      const uid = auth.currentUser.uid;
      const inv = await this.readInvite(token);
      if (!inv || inv.expired) throw new Error("초대 링크가 만료되었거나 없어요.");
      const us = await F.getDoc(userDoc(uid));
      const oldCid = us.exists() && us.data().coupleId;
      if (oldCid && oldCid !== inv.cid) await leaveCouple(uid, oldCid);
      await F.updateDoc(coupleDoc(inv.cid), { members: F.arrayUnion(uid), joinToken: token });
      await F.setDoc(userDoc(uid), { coupleId: inv.cid, createdAt: F.serverTimestamp() }, { merge: true });
      await F.deleteDoc(F.doc(db, "invites", token));
      await F.updateDoc(coupleDoc(inv.cid), { inviteToken: null });
      return inv.cid;
    },
    async leave(cid) {
      const uid = auth.currentUser.uid;
      await leaveCouple(uid, cid);
      await F.setDoc(userDoc(uid), { coupleId: null }, { merge: true });
    },

    // 내 기록 모두 내려받기(열람권)
    async exportAll(cid) {
      const uid = auth.currentUser.uid;
      const out = { 내려받은때: new Date().toISOString(), 내정보: (await F.getDoc(userDoc(uid))).data() || {} };
      out.준비표 = (await F.getDoc(coupleDoc(cid))).data() || {};
      for (const name of COLLECTIONS) out[name] = (await F.getDocs(col(cid, name))).docs.map((d) => ({ id: d.id, ...d.data() }));
      return out;
    },

    // 회원 탈퇴: 준비표 기록 → 내 정보 → 로그인 계정 순서로 지웁니다.
    async deleteAccount(cid) {
      const user = auth.currentUser;
      try {
        await A.reauthenticateWithPopup(user, provider());
      } catch (e) {
        throw new Error(e && e.code === "auth/user-mismatch"
          ? "처음 로그인한 카카오 계정으로 다시 로그인해 주세요."
          : "본인 확인을 위해 카카오 로그인을 한 번 더 해 주세요.");
      }
      if (cid) await leaveCouple(user.uid, cid);
      await F.deleteDoc(userDoc(user.uid));
      await A.deleteUser(user);
    }
  };
}

/* ───────────────────────── 체험 모드 ───────────────────────── */
function makeDemoStore() {
  const KEY = "weddingnote-demo";
  const subs = new Set();
  let authCb = null;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장 불가 */ } subs.forEach((f) => f()); };
  const state = () => load() || { signedIn: false, profile: { displayName: "" }, couple: emptyCouple("demo"), tasks: [], items: [], payments: [], events: [], photos: [] };
  const id = () => Math.random().toString(36).slice(2, 10);
  const sub = (fn) => { subs.add(fn); fn(); return () => subs.delete(fn); };

  return {
    demo: true,
    onAuth(cb) { authCb = cb; cb(state().signedIn ? { uid: "demo" } : null); return () => {}; },
    async signIn() { const s = state(); s.signedIn = true; save(s); authCb && authCb({ uid: "demo" }); },
    async signOut() { const s = state(); s.signedIn = false; save(s); authCb && authCb(null); },
    currentUid() { return state().signedIn ? "demo" : null; },
    async loadMe() { const s = state(); save(s); return { uid: "demo", profile: s.profile, cid: "demo" }; },
    async updateProfile(data) { const s = state(); Object.assign(s.profile, data); save(s); },
    watchCouple(cid, cb) { return sub(() => cb(state().couple)); },
    async updateCouple(cid, data) { const s = state(); Object.assign(s.couple, data); save(s); },
    watch(cid, name, cb) { return sub(() => cb(state()[name] || [])); },
    async add(cid, name, data) { const s = state(); (s[name] = s[name] || []).push({ id: id(), ...data, createdAt: Date.now(), by: "demo" }); save(s); },
    async update(cid, name, docId, data) { const s = state(); const x = s[name].find((r) => r.id === docId); if (x) Object.assign(x, data); save(s); },
    async remove(cid, name, docId) { const s = state(); s[name] = s[name].filter((r) => r.id !== docId); save(s); },
    async createInvite(cid) { const t = randomToken(); const s = state(); s.couple.inviteToken = t; save(s); return t; },
    async cancelInvite() { const s = state(); s.couple.inviteToken = null; save(s); },
    async readInvite() { return { cid: "demo", fromName: "체험 사용자", expired: false, mine: false }; },
    async acceptInvite() { throw new Error("체험 모드에서는 초대를 수락할 수 없어요. Firebase 설정 후 사용해 주세요."); },
    async leave() {},
    async exportAll() { const s = state(); return { 내려받은때: new Date().toISOString(), 내정보: s.profile, 준비표: s.couple, tasks: s.tasks, items: s.items, payments: s.payments, events: s.events, photos: s.photos || [] }; },
    async deleteAccount() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } authCb && authCb(null); }
  };
}
