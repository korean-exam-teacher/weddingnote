// 여러 화면에서 함께 쓰는 도구

// 사용자가 입력한 글자는 반드시 이 함수를 거쳐 화면에 넣습니다(스크립트 삽입 방지).
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function won(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("ko-KR") + "원";
}

// "1,200,000" "120만" 같은 입력을 숫자로
export function parseWon(s) {
  if (typeof s === "number") return s;
  const t = String(s || "").replace(/[,\s원]/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)만$/);
  if (m) return Math.round(parseFloat(m[1]) * 10000);
  const n = parseInt(t, 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

export function dday(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d - today) / 86400000);
}

export function ddayLabel(dateStr) {
  const n = dday(dateStr);
  if (n === null) return "날짜 미정";
  if (n === 0) return "D-DAY";
  return n > 0 ? "D-" + n : "D+" + -n;
}

export function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`;
}

let toastTimer = null;
export function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

export const BRAND_MARK = '<span class="brand-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true"><circle cx="9" cy="12" r="5"></circle><circle cx="15" cy="12" r="5"></circle></svg></span>';

export const KAKAO_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 5.9L6.4 20l3.5-2.3c.7.1 1.4.2 2.1.2 5 0 9-3.1 9-7s-4-7-9-7z"></path></svg>';

export function friendlyError(e) {
  const code = (e && e.code) || "";
  if (code.includes("popup-closed")) return "로그인 창이 닫혔어요. 다시 시도해 주세요.";
  if (code.includes("permission-denied")) return "권한이 없어요. 다시 로그인해 주세요.";
  if (code.includes("network")) return "인터넷 연결을 확인해 주세요.";
  if (code.includes("unauthorized-domain")) return "이 주소가 Firebase 승인 도메인에 등록되지 않았어요(설정안내 4단계).";
  if (code.includes("operation-not-allowed")) return "Firebase에서 카카오(OpenID Connect) 로그인이 켜져 있지 않아요(설정안내 3단계).";
  return (e && e.message) || "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.";
}
