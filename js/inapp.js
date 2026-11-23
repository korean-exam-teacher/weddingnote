// 카카오톡·인스타그램 등 앱 안의 브라우저(인앱 브라우저)에서는 로그인 창이 제대로 열리지 않습니다.
// 카카오톡이면 휴대전화의 기본 브라우저로 자동으로 다시 열고, 그 밖의 앱이면 안내를 보여 줍니다.
(function () {
  var ua = navigator.userAgent || "";
  if (/KAKAOTALK/i.test(ua)) {
    location.replace("kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href));
    return;
  }
  if (!/Instagram|FBAN|FBAV|NAVER\(inapp|Line\/|DaumApps|everytimeApp/i.test(ua)) return;
  var ios = /iPhone|iPad|iPod/i.test(ua);
  function show() {
    var box = document.createElement("div");
    box.setAttribute("role", "alert");
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:100;background:#2B2430;color:#fff;border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.55";
    box.innerHTML = "<b>다른 브라우저로 열어 주세요</b><br>지금 화면은 앱 안의 브라우저라 로그인이 안 될 수 있어요. " +
      (ios ? "오른쪽 아래(또는 위) 메뉴에서 <b>Safari로 열기</b>를 눌러 주세요." : "오른쪽 위 메뉴(⋮)에서 <b>다른 브라우저로 열기</b>를 눌러 주세요.") +
      "<br><button type='button' style='margin-top:8px;min-height:40px;padding:6px 14px;border:0;border-radius:10px;background:#fff;color:#2B2430;font:inherit;font-weight:700'>주소 복사</button>";
    box.querySelector("button").onclick = function () {
      try { navigator.clipboard.writeText(location.href); this.textContent = "복사했어요"; } catch (e) { prompt("주소를 길게 눌러 복사해 주세요", location.href); }
    };
    document.body.appendChild(box);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show); else show();
})();
