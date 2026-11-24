const sky  = document.getElementById('sky');
const orb  = document.getElementById('orb');
const glow = document.getElementById('glow');
const dots = document.getElementById('dots');
const bar  = document.getElementById('bar');
const now  = document.getElementById('now');
const dctx = dots.getContext('2d');

// [시각, 하늘 위색, 하늘 아래색]
const K = [
  [0,  '#0b1026', '#1a1f4b'],
  [5,  '#2a2a5e', '#d77a8a'],
  [7,  '#ffb88c', '#ffe3c2'],
  [12, '#7ec8f5', '#e6f6ff'],
  [17, '#ffb36b', '#ff7e7e'],
  [19, '#6a4c93', '#2c2a63'],
  [24, '#0b1026', '#1a1f4b'],
];

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function skyColors(h) {
  let i = 0;
  while (i < K.length - 2 && h >= K[i + 1][0]) i++;
  const [h0, t0, b0] = K[i], [h1, t1, b1] = K[i + 1];
  const t = (h - h0) / (h1 - h0);
  return [mix(hex(t0), hex(t1), t), mix(hex(b0), hex(b1), t)];
}

// ---------- 시간 ----------
let previewH = null;      // 바를 눌렀을 때의 시각
let previewStart = 0;     // 누른 순간
const PREVIEW_MS = 5000;

// 지금 "목표" 시각 (소수 시간). 바를 누른 뒤 5초 동안은 그 시각부터 흘러감
function targetHour() {
  const t = Date.now();
  if (previewH !== null && t - previewStart < PREVIEW_MS) {
    return (previewH + (t - previewStart) / 3600000) % 24;
  }
  previewH = null;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 + d.getMilliseconds() / 3600000;
}

// ---------- 하단 바 ----------
const stops = Array.from({ length: 25 }, (_, h) =>
  `rgb(${skyColors(h)[0]}) ${(h / 24) * 100}%`);
bar.style.background = `linear-gradient(to right, ${stops.join(',')})`;

bar.addEventListener('click', e => {
  previewH = (e.clientX / innerWidth) * 24;
  previewStart = Date.now();
});

// ---------- 점 타이포 시계 ----------
const off = document.createElement('canvas');
const octx = off.getContext('2d', { willReadFrequently: true });
let lastStr = '';

function sizeDots() {
  const s = Math.min(innerWidth, innerHeight) * 0.22;
  const dpr = devicePixelRatio || 1;
  dots.width = off.width = Math.round(s * dpr);
  dots.height = off.height = Math.round(s * dpr);
  lastStr = ''; // 다시 그리기
}

function drawDots(str) {
  const S = dots.width;
  octx.clearRect(0, 0, S, S);
  octx.font = `700 ${S * 0.15}px "Helvetica Neue", Arial, sans-serif`;
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.fillStyle = '#000';
  octx.fillText(str, S / 2, S / 2);

  const data = octx.getImageData(0, 0, S, S).data;
  const gap = Math.max(2, Math.round(S * 0.014));

  dctx.clearRect(0, 0, S, S);
  dctx.fillStyle = '#000';
  for (let y = 0; y < S; y += gap) {
    for (let x = 0; x < S; x += gap) {
      if (data[(y * S + x) * 4 + 3] > 128) {
        dctx.beginPath();
        dctx.arc(x, y, gap * 0.4, 0, Math.PI * 2);
        dctx.fill();
      }
    }
  }
}

addEventListener('resize', sizeDots);
sizeDots();

// ---------- 매 프레임 ----------
let shown = null; // 화면에 보이는 시각 (목표를 향해 부드럽게 따라감)
const pad = n => String(Math.floor(n)).padStart(2, '0');

function frame() {
  const target = targetHour();
  if (shown === null) shown = target;

  let diff = target - shown;
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;
  shown = (shown + diff * 0.08 + 24) % 24;

  // 하늘
  const [top, bot] = skyColors(shown);
  sky.style.background = `linear-gradient(rgb(${top}), rgb(${bot}))`;

  // 해(6~18시) / 달(18~6시)
  const isDay = shown >= 6 && shown < 18;
  const t = isDay ? (shown - 6) / 12 : ((shown + 6) % 24) / 12;
  orb.style.left = t * 100 + 'vw';
  orb.style.top = 60 - Math.sin(t * Math.PI) * 45 + 'vh';
  glow.style.background =
  'radial-gradient(circle, #ffffff 30%, rgba(255,255,255,0.6) 60%, transparent 72%)';

  now.style.left = (shown / 24) * 100 + '%';

  // 점 시계 (목표 시각 기준, 값이 바뀔 때만 다시 그림)
  const h = Math.floor(target);
  const m = Math.floor((target % 1) * 60);
  const s = Math.floor((target * 3600) % 60);
  const str = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (str !== lastStr) {
    lastStr = str;
    drawDots(str);
  }

  requestAnimationFrame(frame);
}
frame();