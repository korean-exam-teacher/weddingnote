// 5월의 꽃 장식 — 직접 그린 SVG(장미·작약 느낌의 꽃, 작은 꽃잎, 잎사귀)
// 사용법: <div data-flowers="corner-left"></div> 처럼 두면 자동으로 그려집니다.

const C = { rose: "#E7849A", roseDeep: "#C2475F", peach: "#F4A98C", coral: "#E8806A", blush: "#F7C9D2", leaf: "#8DAE8E", leafDeep: "#6E8F72", center: "#F2C46D" };

// 겹꽃(장미·작약 느낌): 겹친 원으로 꽃잎을 표현
function bloom(x, y, r, main, deep) {
  let s = `<g transform="translate(${x} ${y})">`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += `<ellipse cx="${(Math.cos(a) * r * 0.55).toFixed(1)}" cy="${(Math.sin(a) * r * 0.55).toFixed(1)}" rx="${(r * 0.62).toFixed(1)}" ry="${(r * 0.5).toFixed(1)}" transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(Math.cos(a) * r * 0.55).toFixed(1)} ${(Math.sin(a) * r * 0.55).toFixed(1)})" fill="${main}" opacity=".92"/>`;
  }
  s += `<circle r="${(r * 0.62).toFixed(1)}" fill="${deep}" opacity=".55"/>`;
  s += `<path d="M${(-r * 0.3).toFixed(1)} 0 a${(r * 0.3).toFixed(1)} ${(r * 0.3).toFixed(1)} 0 1 1 ${(r * 0.35).toFixed(1)} ${(r * 0.25).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${(r * 0.08).toFixed(1)}" stroke-linecap="round"/>`;
  return s + "</g>";
}
// 다섯 잎 작은 꽃
function blossom(x, y, r, color) {
  let s = `<g transform="translate(${x} ${y})">`;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${(Math.cos(a) * r * 0.6).toFixed(1)}" cy="${(Math.sin(a) * r * 0.6).toFixed(1)}" r="${(r * 0.5).toFixed(1)}" fill="${color}"/>`;
  }
  return s + `<circle r="${(r * 0.32).toFixed(1)}" fill="${C.center}"/></g>`;
}
function leaf(x, y, len, angle, color) {
  return `<path transform="translate(${x} ${y}) rotate(${angle})" d="M0 0 C ${len * 0.35} ${-len * 0.28}, ${len * 0.75} ${-len * 0.22}, ${len} 0 C ${len * 0.75} ${len * 0.22}, ${len * 0.35} ${len * 0.28}, 0 0 Z" fill="${color}"/>
    <path transform="translate(${x} ${y}) rotate(${angle})" d="M2 0 L ${len * 0.9} 0" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>`;
}

// 모서리 꽃다발(가로 260 × 세로 220)
function cornerBouquet() {
  return [
    leaf(70, 120, 90, -150, C.leaf), leaf(95, 95, 80, -110, C.leafDeep), leaf(140, 120, 85, -20, C.leaf),
    leaf(110, 150, 75, 40, C.leafDeep), leaf(60, 160, 70, 160, C.leaf), leaf(170, 80, 60, -60, C.leaf),
    bloom(110, 120, 42, C.rose, C.roseDeep), bloom(175, 140, 30, C.peach, C.coral), bloom(62, 92, 26, C.blush, C.rose),
    blossom(150, 62, 13, C.blush), blossom(205, 105, 11, C.rose), blossom(40, 140, 10, C.peach), blossom(130, 182, 10, C.blush),
    `<circle cx="190" cy="70" r="4" fill="${C.rose}"/><circle cx="25" cy="110" r="3.5" fill="${C.coral}"/><circle cx="215" cy="160" r="3" fill="${C.blush}"/>`
  ].join("");
}
// 가로 꽃줄(세로 60)
function garland(width) {
  let s = "";
  const n = Math.max(4, Math.round(width / 70));
  for (let i = 0; i < n; i++) {
    const x = 20 + (i * (width - 40)) / (n - 1), y = 30 + (i % 2 ? 6 : -4);
    s += leaf(x - 4, y, 26, i % 2 ? 200 : 160, C.leaf) + leaf(x + 4, y, 24, i % 2 ? -20 : 20, C.leafDeep);
    s += i % 3 === 0 ? bloom(x, y, 13, C.rose, C.roseDeep) : blossom(x, y, 9, i % 3 === 1 ? C.peach : C.blush);
  }
  return s;
}

export function flowerSVG(kind, width = 600) {
  if (kind === "garland") return `<svg viewBox="0 0 ${width} 60" width="100%" height="60" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${garland(width)}</svg>`;
  const flip = kind === "corner-right" ? ` transform="translate(260 0) scale(-1 1)"` : "";
  return `<svg viewBox="0 0 260 220" aria-hidden="true" focusable="false"><g${flip}>${cornerBouquet()}</g></svg>`;
}

export function decorate(root = document) {
  root.querySelectorAll("[data-flowers]").forEach((el) => {
    if (el.dataset.drawn) return;
    el.innerHTML = flowerSVG(el.dataset.flowers, Number(el.dataset.width) || 600);
    el.dataset.drawn = "1";
  });
}
decorate();
