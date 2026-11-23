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

// 직접 그린 버진로드 장면(사진이 없을 때 첫 화면 배경)
function aisle() {
  const lerp = (a, b, t) => a + (b - a) * t;
  let s = `<defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DCE4"/><stop offset="1" stop-color="#FBEDF1"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1CFD9"/><stop offset="1" stop-color="#E9B9C6"/></linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7F9"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="500" fill="url(#wall)"/>
  <rect y="232" width="1200" height="268" fill="url(#floor)"/>`;
  // 빛(샹들리에)
  for (const [x, y, r] of [[600, 40, 120], [330, 60, 80], [870, 60, 80]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow)"/>`;
  for (const x of [330, 600, 870]) s += `<g fill="#FFFFFF" opacity=".9"><circle cx="${x}" cy="${x === 600 ? 46 : 64}" r="5"/><circle cx="${x - 14}" cy="${x === 600 ? 56 : 74}" r="3.5"/><circle cx="${x + 14}" cy="${x === 600 ? 56 : 74}" r="3.5"/></g>`;
  // 끝의 문(빛)과 꽃 아치
  s += `<path d="M512 232 V160 A88 92 0 0 1 688 160 V232 Z" fill="#FFF8FA"/><ellipse cx="600" cy="190" rx="70" ry="60" fill="url(#glow)"/>`;
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI - (i / 14) * Math.PI, x = 600 + Math.cos(a) * 100, y = 168 - Math.sin(a) * 104 + (i === 0 || i === 14 ? 60 : 0);
    s += leaf(x, y, 22, (i * 37) % 360, i % 2 ? C.leaf : C.leafDeep);
    s += i % 3 === 0 ? bloom(x, y, 15, C.rose, C.roseDeep) : blossom(x, y, 10, i % 3 === 1 ? C.blush : C.peach);
  }
  // 버진로드(흰 길)
  s += `<polygon points="566,232 634,232 900,500 300,500" fill="url(#road)"/>
    <polyline points="566,232 300,500" stroke="#EFD3DB" stroke-width="3" fill="none"/><polyline points="634,232 900,500" stroke="#EFD3DB" stroke-width="3" fill="none"/>`;
  // 양옆 꽃기둥(멀수록 작게)
  for (const t of [0.18, 0.38, 0.62, 0.92]) {
    for (const side of [-1, 1]) {
      const x = side < 0 ? lerp(540, 150, t) : lerp(660, 1050, t), y = lerp(236, 520, t), h = lerp(40, 190, t), r = lerp(9, 40, t);
      s += `<rect x="${(x - r * 0.22).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${(r * 0.44).toFixed(1)}" height="${h.toFixed(1)}" rx="${(r * 0.1).toFixed(1)}" fill="#FFFFFF" opacity=".95"/>`;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${(y - h).toFixed(1)}" rx="${(r * 0.9).toFixed(1)}" ry="${(r * 0.25).toFixed(1)}" fill="#FFFFFF"/>`;
      s += leaf(x - r * 0.4, y - h - r * 0.2, r * 1.3, 200, C.leaf) + leaf(x + r * 0.4, y - h - r * 0.2, r * 1.3, -20, C.leafDeep);
      s += bloom(x, y - h - r * 0.55, r * 0.75, C.rose, C.roseDeep) + blossom(x - r * 0.7, y - h - r * 0.25, r * 0.4, C.blush) + blossom(x + r * 0.7, y - h - r * 0.3, r * 0.42, C.peach);
    }
  }
  // 흩날린 꽃잎
  const petals = [[560, 300], [640, 340], [520, 400], [700, 430], [610, 470], [470, 460], [760, 380], [590, 380], [430, 350], [820, 470]];
  petals.forEach(([x, y], i) => { s += `<ellipse cx="${x}" cy="${y}" rx="${4 + (i % 3) * 2}" ry="${2.5 + (i % 2)}" transform="rotate(${i * 33} ${x} ${y})" fill="${[C.rose, C.blush, C.peach][i % 3]}" opacity=".85"/>`; });
  return s;
}

export function flowerSVG(kind, width = 600) {
  if (kind === "aisle") return `<svg viewBox="0 0 1200 500" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${aisle()}</svg>`;
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
