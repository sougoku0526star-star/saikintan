// フォトブックを「印刷 → PDFで保存」用の自己完結HTMLに変換する。
// 別ウィンドウに書き出して印刷ダイアログを開く。画像は同一オリジン
// (/api/images/*) なのでCookie付きで読め、外部URLもそのまま読める。
import type { BookPhoto, Spread } from "@/lib/photobook";

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function gridHtml(photos: BookPhoto[]): string {
  const n = photos.length;
  const cell = (p: BookPhoto, span = false) =>
    `<div class="cell${span ? " span2" : ""}"><img src="${esc(p.src)}" alt="${esc(p.label)}"/></div>`;
  if (n === 1) return `<div class="grid g1">${cell(photos[0])}</div>`;
  if (n === 2) return `<div class="grid g2">${photos.map((p) => cell(p)).join("")}</div>`;
  if (n === 3)
    return `<div class="grid g4">${cell(photos[0], true)}${cell(photos[1])}${cell(photos[2])}</div>`;
  return `<div class="grid g4">${photos.map((p) => cell(p)).join("")}</div>`;
}

function spreadHtml(s: Spread): string {
  return `<section class="page">
    <div class="head"><span class="date">${esc(s.dateLabel)}</span><span class="tag">MEMORY</span></div>
    <div class="photos">${gridHtml(s.photos)}</div>
    <div class="comment">
      <img class="mascot" src="/gohankun/gohankun-${s.mascot}.png" alt="ごはんくん"/>
      <div class="bubble">${esc(s.comment)}</div>
    </div>
  </section>`;
}

export function buildPrintHtml(book: {
  title: string;
  periodLabel: string;
  photoCount: number;
  dayCount: number;
  spreads: Spread[];
}): string {
  const cover = `<section class="page cover">
    <img class="cover-mascot" src="/gohankun/gohankun-proud.png" alt="ごはんくん"/>
    <p class="kicker">SINGAPORE DIARY</p>
    <h1>『${esc(book.title)}』</h1>
    <p class="period">${esc(book.periodLabel)}</p>
    <p class="sub">${book.photoCount}枚のごはんと思い出 ・ ${book.dayCount}日</p>
  </section>`;

  const pages = book.spreads.map(spreadHtml).join("");

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"/>
<title>${esc(book.title)}</title>
<style>
  @page { size: 150mm 150mm; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: "Zen Maru Gothic","Hiragino Sans",system-ui,sans-serif; color: #3D312A; background:#ECE3D6; }
  .page {
    width: 150mm; height: 150mm; padding: 9mm; background: #FAF8F5;
    display: flex; flex-direction: column; page-break-after: always; overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }
  /* 表紙 */
  .cover { align-items: center; justify-content: center; text-align: center;
    background: linear-gradient(135deg,#FFFCF6,#FAF8F5); }
  .cover-mascot { width: 34mm; height: 34mm; object-fit: contain; }
  .kicker { letter-spacing: .3em; color: #D2795A; font-size: 9pt; margin: 6mm 0 2mm; }
  .cover h1 { font-size: 17pt; font-weight: 600; margin: 0 4mm; line-height: 1.5; }
  .period { margin-top: 5mm; background:#fff; border-radius:999px; padding: 2mm 6mm; font-size: 11pt; color:#3D312Acc; }
  .sub { margin-top: 4mm; font-size: 9pt; color: #3D312A99; }
  /* 見開き */
  .head { display:flex; justify-content: space-between; align-items:center; }
  .date { font-size: 10pt; color:#3D312A99; }
  .tag { font-size: 7pt; letter-spacing:.2em; color:#D2795A99; }
  .photos { flex: 1; min-height: 0; padding: 3mm 0; }
  .grid { display:grid; gap: 2.5mm; width:100%; height:100%; }
  .g1 { grid-template-columns: 1fr; }
  .g2 { grid-template-columns: 1fr 1fr; }
  .g4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .span2 { grid-column: span 2; }
  .cell { overflow: hidden; border-radius: 4mm; background:#eee; box-shadow: 0 1mm 2mm rgba(61,49,42,.12); }
  .cell img { width:100%; height:100%; object-fit: cover; display:block; }
  /* コメント */
  .comment { display:flex; align-items:flex-end; gap: 2.5mm; }
  .mascot { width: 13mm; height: 13mm; object-fit: contain; flex: none; }
  .bubble { flex:1; background:#FFFCF6; border:0.3mm solid rgba(61,49,42,.08);
    border-radius: 4mm; border-bottom-left-radius: 1mm; padding: 2.5mm 3mm; font-size: 8.5pt; line-height: 1.6; }
  @media screen { body { padding: 16px; display:flex; flex-direction:column; align-items:center; gap:16px; }
    .page { box-shadow: 0 8px 24px rgba(0,0,0,.18); } }
</style></head>
<body>
  ${cover}
  ${pages}
  <script>
    (function(){
      var imgs = Array.prototype.slice.call(document.images);
      var left = imgs.length;
      function go(){ setTimeout(function(){ window.focus(); window.print(); }, 250); }
      if (!left) return go();
      imgs.forEach(function(im){
        if (im.complete) { if(--left===0) go(); }
        else { im.addEventListener('load', function(){ if(--left===0) go(); });
               im.addEventListener('error', function(){ if(--left===0) go(); }); }
      });
    })();
  </script>
</body></html>`;
}
