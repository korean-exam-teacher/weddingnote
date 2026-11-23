// ─────────────────────────────────────────────────────────────
// Firebase 설정 — 설정안내.md 3단계에서 복사한 값으로 바꾸세요.
// 이 값들은 웹사이트에 공개되어도 괜찮은 값입니다.
// (데이터 보호는 firestore.rules 보안 규칙이 맡습니다.)
//
// apiKey가 "여기에" 로 시작하면 '체험 모드'로 동작합니다.
// 체험 모드: 로그인 없이, 지금 쓰는 브라우저에만 저장됩니다.
// ─────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyCG60zwugkbe0sOj512lf-sO0O3P3a4YFU",
  authDomain: "weddingnote-9c109.firebaseapp.com",
  projectId: "weddingnote-9c109",
  storageBucket: "weddingnote-9c109.firebasestorage.app",
  messagingSenderId: "749750155331",
  appId: "1:749750155331:web:a46fb3930e2b751fa4bcf6"
};

// Firebase 콘솔 > Authentication > 로그인 방법 > OpenID Connect 에서
// 제공업체 ID를 'kakao'로 만들면 아래 값('oidc.kakao')을 그대로 두면 됩니다.
export const KAKAO_PROVIDER_ID = "oidc.kakao";

export const DEMO_MODE = firebaseConfig.apiKey.startsWith("여기에");
