// 앱처럼 설치하기: 서비스 워커 등록 + '앱으로 설치' 버튼/안내
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
let deferred = null;

window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; show(); });

function show() {
  if (standalone) return;
  document.querySelectorAll("[data-install]").forEach((box) => {
    box.classList.remove("hidden");
    const btn = box.querySelector("button"), tip = box.querySelector("[data-tip]");
    if (deferred) {
      btn.classList.remove("hidden"); tip.textContent = "버튼을 누르면 휴대전화 홈 화면에 웨딩노트 아이콘이 생겨요.";
      btn.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; box.classList.add("hidden"); };
    } else if (isIOS) {
      btn.classList.add("hidden");
      tip.textContent = "Safari 아래쪽 공유 버튼(네모에 위 화살표) › '홈 화면에 추가'를 누르면 앱처럼 설치돼요.";
    } else {
      btn.classList.add("hidden");
      tip.textContent = "브라우저 메뉴(⋮) › '앱 설치' 또는 '홈 화면에 추가'를 누르면 앱처럼 설치돼요.";
    }
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show); else show();
