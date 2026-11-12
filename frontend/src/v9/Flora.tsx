/**
 * Botanical illustrations for every honey source, drawn as parametric SVG so
 * one component covers thirty flowers in both themes. `kind` is the flower's
 * shape family (spike, umbel, pea…) and `color` its petal colour.
 */
import { useId, type ReactNode } from "react";
import { BeeMark } from "../story/Bee";
import type { HoneyProfile } from "./honey";

const rng = (seed: string) => { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const P = (n: number) => n.toFixed(1);

function Leaf({ x, y, a, l = 26, w = 9, fill = "var(--fl-leaf)" }: { x: number; y: number; a: number; l?: number; w?: number; fill?: string }) {
  return <path d={`M0 0Q${P(w)} ${P(-l * 0.45)} 0 ${P(-l)}Q${P(-w)} ${P(-l * 0.45)} 0 0Z`} transform={`translate(${P(x)} ${P(y)}) rotate(${P(a)})`} fill={fill} stroke="var(--fl-leaf-edge)" strokeWidth=".7" />;
}
function Petals({ x, y, n, r, w, color, rot = 0, edge = "var(--fl-edge)" }: { x: number; y: number; n: number; r: number; w: number; color: string; rot?: number; edge?: string }) {
  return <g transform={`translate(${P(x)} ${P(y)}) rotate(${P(rot)})`}>{Array.from({ length: n }, (_, i) => <ellipse key={i} cx="0" cy={P(-r / 2)} rx={P(w)} ry={P(r / 2)} transform={`rotate(${P((360 / n) * i)})`} fill={color} stroke={edge} strokeWidth=".6" />)}</g>;
}
const Dot = ({ x, y, r, c }: { x: number; y: number; r: number; c: string }) => <circle cx={P(x)} cy={P(y)} r={P(r)} fill={c} />;

/** Head drawings, centred near (100, 80) on a 200 × 240 board. */
function Head({ kind, c, seed }: { kind: string; c: string; seed: string }): ReactNode {
  const r = rng(seed + kind);
  switch (kind) {
    case "spike": {
      const spikes = [[100, 112, 0], [82, 128, -14], [119, 132, 15]];
      return spikes.map(([sx, sy, a], k) => (
        <g key={k} transform={`rotate(${a} ${sx} ${sy})`}>
          <path d={`M${sx} ${sy}V${sy - 78 + k * 10}`} stroke="var(--fl-stem)" strokeWidth="1.4" />
          {Array.from({ length: 9 - k }, (_, i) => { const y = sy - 12 - i * 8, side = i % 2 ? 1 : -1; return <g key={i}><Petals x={sx + side * 3.5} y={y} n={4} r={7 - i * .35} w={2.6} color={c} rot={side * 20} /><Dot x={sx + side * 3.5} y={y} r={1.1} c="var(--fl-heart)" /></g>; })}
        </g>
      ));
    }
    case "star": return <g>{[[100, 70], [78, 88], [122, 86], [92, 104], [113, 108], [70, 66], [130, 64]].map(([x, y], i) => <g key={i}><path d={`M100 132Q${(100 + x) / 2} ${y + 30} ${x} ${y}`} stroke="var(--fl-stem)" strokeWidth="1" fill="none" /><Petals x={x} y={y} n={5} r={11} w={3.2} color={c} rot={r() * 70} /><Dot x={x} y={y} r={2.4} c="var(--fl-heart)" /></g>)}</g>;
    case "pea": return <g><path d="M100 140V40" stroke="var(--fl-stem)" strokeWidth="1.5" />{Array.from({ length: 9 }, (_, i) => { const y = 132 - i * 10.5, s = i % 2 ? 1 : -1, x = 100 + s * (9 - i * .5); return <g key={i} transform={`translate(${P(x)} ${P(y)}) rotate(${s * 35})`}><path d="M0 0C-7 -2 -8 -12 0 -13C8 -12 7 -2 0 0Z" fill={c} stroke="var(--fl-edge)" strokeWidth=".6" /><path d="M0 0C-3 4 3 4 0 0" fill={c} stroke="var(--fl-edge)" strokeWidth=".6" /></g>; })}</g>;
    case "feather": return <g>{[-26, -9, 9, 26].map((a, k) => <g key={k} transform={`rotate(${a} 100 140)`}><path d="M100 140Q96 90 100 40" stroke="var(--fl-stem)" strokeWidth="1" fill="none" />{Array.from({ length: 22 }, (_, i) => <Dot key={i} x={100 + (r() - .5) * 8} y={132 - i * 4.2} r={1.6 + r() * 1.2} c={c} />)}</g>)}</g>;
    case "umbel": {
      const top = 64, rays = 11;
      return <g>{Array.from({ length: rays }, (_, i) => { const t = (i / (rays - 1)) * Math.PI, x = 100 + Math.cos(t) * 46, y = top + 6 - Math.sin(t) * 22; return <g key={i}><path d={`M100 116Q${P((100 + x) / 2)} ${P(y + 22)} ${P(x)} ${P(y)}`} stroke="var(--fl-stem)" strokeWidth=".9" fill="none" />{Array.from({ length: 6 }, (_, j) => { const a = (j / 6) * Math.PI * 2; return <Dot key={j} x={x + Math.cos(a) * 4.6} y={y + Math.sin(a) * 3} r={2.3} c={c} />; })}<Dot x={x} y={y} r={1.6} c="var(--fl-heart)" /></g>; })}</g>;
    }
    case "globe": return <g>{[[100, 70, 24], [70, 98, 15], [130, 100, 16]].map(([x, y, R], k) => <g key={k}><path d={`M100 140Q${(100 + x) / 2} ${y + 30} ${x} ${y + R}`} stroke="var(--fl-stem)" strokeWidth="1.2" fill="none" /><circle cx={x} cy={y} r={R} fill={c} opacity=".35" />{Array.from({ length: 34 }, (_, i) => { const a = i * 2.4, d = R * Math.sqrt((i + .5) / 34); return <g key={i}><Dot x={x + Math.cos(a) * d} y={y + Math.sin(a) * d} r={2.1} c={c} /><Dot x={x + Math.cos(a) * d} y={y + Math.sin(a) * d - .6} r={.7} c="var(--fl-light)" /></g>; })}</g>)}</g>;
    case "cup": return <g>{[[100, 66], [80, 84], [120, 82], [92, 100], [112, 102]].map(([x, y], i) => <g key={i}><path d={`M100 140Q${(100 + x) / 2} ${y + 26} ${x} ${y + 6}`} stroke="var(--fl-stem)" strokeWidth="1" fill="none" /><path d={`M${x - 11} ${y + 2}Q${x} ${y + 16} ${x + 11} ${y + 2}Q${x} ${y - 6} ${x - 11} ${y + 2}Z`} fill="var(--fl-leaf)" stroke="var(--fl-leaf-edge)" strokeWidth=".6" /><path d={`M${x - 5} ${y}Q${x} ${y + 7} ${x + 5} ${y}`} fill={c} stroke="var(--fl-edge)" strokeWidth=".6" /><Dot x={x} y={y - 2} r={2} c="var(--fl-heart)" /></g>)}</g>;
    case "clover": return <g>{[[100, 64], [76, 90], [124, 92]].map(([x, y], k) => <g key={k}><path d={`M100 140Q${(100 + x) / 2} ${y + 34} ${x} ${y + 14}`} stroke="var(--fl-stem)" strokeWidth="1.2" fill="none" />{Array.from({ length: 16 }, (_, i) => { const a = i * 2.4, d = 13 * Math.sqrt((i + .5) / 16); return <Petals key={i} x={x + Math.cos(a) * d} y={y + Math.sin(a) * d} n={2} r={7} w={2.2} color={c} rot={a * 57} />; })}</g>)}</g>;
    case "crocus": return <g><path d="M100 150V96" stroke="var(--fl-stem)" strokeWidth="2" />{[-70, -38, -6, 26, 58, 90].map((a, i) => <ellipse key={i} cx="100" cy="68" rx="11" ry="30" transform={`rotate(${a * .45} 100 98)`} fill={c} stroke="var(--fl-edge)" strokeWidth=".8" opacity={i % 2 ? .85 : 1} />)}{[-14, 0, 14].map((a) => <path key={a} d="M100 92Q100 70 100 50" transform={`rotate(${a} 100 92)`} stroke="#c8261d" strokeWidth="2.6" strokeLinecap="round" fill="none" />)}<Dot x={100} y={84} r={3} c="#f2c230" /></g>;
    case "raceme": return <g><path d="M100 140Q112 96 96 54" stroke="var(--fl-stem)" strokeWidth="1.4" fill="none" />{[[96, 58], [104, 76], [92, 92], [110, 108]].map(([x, y], k) => <g key={k}><path d={`M${x} ${y}Q${x + 14} ${y + 6} ${x + 18} ${y + 22}`} stroke="var(--fl-stem)" strokeWidth=".9" fill="none" />{Array.from({ length: 6 }, (_, i) => <g key={i}><circle cx={x + 6 + i * 2.4} cy={y + 4 + i * 3.4} r={3.4 - i * .25} fill={c} stroke="var(--fl-edge)" strokeWidth=".5" /><Dot x={x + 6 + i * 2.4} y={y + 5 + i * 3.4} r={.9} c="#c87d14" /></g>)}</g>)}</g>;
    case "nigella": return <g><path d="M100 150V96" stroke="var(--fl-stem)" strokeWidth="1.6" />{Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * 360; return <path key={i} d="M0 0Q8 -10 4 -34" transform={`translate(100 82) rotate(${a})`} stroke="var(--fl-leaf)" strokeWidth=".9" fill="none" />; })}<Petals x={100} y={82} n={5} r={34} w={10} color={c} rot={18} /><circle cx="100" cy="82" r="8" fill="#5f7d3a" />{Array.from({ length: 5 }, (_, i) => <path key={i} d="M0 -6Q4 -16 0 -22" transform={`translate(100 82) rotate(${i * 72})`} stroke="#4c6430" strokeWidth="1.4" fill="none" />)}</g>;
    case "catkin": return <g>{[[100, 54, 0], [80, 72, -16], [121, 70, 18]].map(([x, y, a], k) => <g key={k} transform={`rotate(${a} ${x} ${y + 40})`}><path d={`M100 140Q${x} ${y + 60} ${x} ${y + 40}`} stroke="var(--fl-stem)" strokeWidth="1" fill="none" /><rect x={x - 5.5} y={y - 4} width="11" height="46" rx="5.5" fill={c} opacity=".45" />{Array.from({ length: 26 }, (_, i) => <Dot key={i} x={x + ((i % 3) - 1) * 3.4} y={y + (i / 26) * 42} r={1.8} c={c} />)}</g>)}</g>;
    case "blossom": return <g>{[[100, 74, 1], [70, 100, .62], [131, 98, .55]].map(([x, y, s], k) => <g key={k}><path d={`M100 140Q${(100 + x) / 2} ${y + 30} ${x} ${y + 10 * s}`} stroke="var(--fl-stem)" strokeWidth="1.2" fill="none" /><Petals x={x} y={y} n={5} r={30 * s} w={9 * s} color={c} rot={r() * 60} />{Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <g key={i}><path d={`M${x} ${y}L${P(x + Math.cos(a) * 10 * s)} ${P(y + Math.sin(a) * 10 * s)}`} stroke="#d9b13a" strokeWidth=".7" /><Dot x={x + Math.cos(a) * 10 * s} y={y + Math.sin(a) * 10 * s} r={1.4 * s} c="#e7b923" /></g>; })}<Dot x={x} y={y} r={3 * s} c="#9fb24a" /></g>)}</g>;
    case "puff": return <g>{[[100, 70], [76, 92], [124, 94]].map(([x, y], k) => <g key={k}><path d={`M100 140Q${(100 + x) / 2} ${y + 30} ${x} ${y + 10}`} stroke="var(--fl-stem)" strokeWidth="1.1" fill="none" />{Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2, L = 15 + r() * 4; return <g key={i}><path d={`M${x} ${y}L${P(x + Math.cos(a) * L)} ${P(y + Math.sin(a) * L)}`} stroke={c} strokeWidth=".8" /><Dot x={x + Math.cos(a) * L} y={y + Math.sin(a) * L} r={1.1} c="#e9cf6e" /></g>; })}<circle cx={x} cy={y + 2} r="4.5" fill="#8a9a6a" /></g>)}</g>;
    case "tuft": return <g>{[[100, 70], [78, 90], [122, 88], [96, 104]].map(([x, y], k) => <g key={k}><path d={`M100 140Q${(100 + x) / 2} ${y + 28} ${x} ${y + 8}`} stroke="var(--fl-stem)" strokeWidth="1" fill="none" />{Array.from({ length: 18 }, (_, i) => { const a = i * 2.4, d = 11 * Math.sqrt((i + .5) / 18); return <Dot key={i} x={x + Math.cos(a) * d} y={y + Math.sin(a) * d} r={2.6} c={c} />; })}</g>)}</g>;
    case "meadow": default: return <g transform="translate(0 6)"><g transform="translate(-30 10) scale(.72)" style={{ transformOrigin: "100px 140px" }}><Head kind="spike" c="#a77cc9" seed={seed} /></g><g transform="translate(30 4) scale(.7)" style={{ transformOrigin: "100px 140px" }}><Head kind="umbel" c="#f4f1e6" seed={seed} /></g><g transform="translate(0 -6) scale(.8)" style={{ transformOrigin: "100px 140px" }}><Head kind="blossom" c={c} seed={seed} /></g></g>;
  }
}

/** A full plant: stem, leaves and the head for this flower family. */
export function Flower({ kind, color, seed = "", className = "" }: { kind: string; color: string; seed?: string; className?: string }) {
  const leafy = !["crocus", "nigella"].includes(kind);
  return (
    <svg className={"flora " + className} viewBox="0 0 200 240" aria-hidden="true">
      {kind === "crocus" ? [-18, -7, 7, 18].map((a) => <path key={a} d="M100 240Q100 170 100 110" transform={`rotate(${a} 100 240)`} stroke="var(--fl-leaf)" strokeWidth="2.4" fill="none" strokeLinecap="round" />) : <path d="M100 240C96 210 104 170 100 136" stroke="var(--fl-stem)" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {leafy && <><Leaf x={99} y={206} a={-52} l={34} w={10} /><Leaf x={101} y={184} a={48} l={30} w={9} /><Leaf x={99} y={160} a={-40} l={24} w={7} /></>}
      <Head kind={kind} c={color} seed={seed} />
    </svg>
  );
}

/** Product artwork used until real photos are uploaded: jar, flower and honey colour. */
export function HoneyArt({ h, name, className = "" }: { h: HoneyProfile; name: string; className?: string }) {
  const id = "ha" + useId().replace(/:/g, "");
  const short = name.replace(/^عسل\s*/, "");
  return (
    <svg className={"honey-art " + className} viewBox="0 0 400 400" role="img" aria-label={name + "، تصویرسازی گل " + h.flower}>
      <defs>
        <radialGradient id={id + "bg"} cx="62%" cy="38%" r="75%"><stop offset="0" stopColor={h.hex[0]} stopOpacity=".32" /><stop offset=".55" stopColor="var(--art-bg)" stopOpacity="1" /><stop offset="1" stopColor="var(--art-bg-2)" /></radialGradient>
        <linearGradient id={id + "honey"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={h.hex[0]} /><stop offset="1" stopColor={h.hex[1]} /></linearGradient>
        <linearGradient id={id + "glass"} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset=".18" stopColor="#fff" stopOpacity=".05" /><stop offset=".8" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".16" /></linearGradient>
        <pattern id={id + "hex"} width="28" height="48.5" patternUnits="userSpaceOnUse" patternTransform="scale(1.1)"><path d="M14 0 28 8.1v16.2L14 32.4 0 24.3V8.1zM14 32.4v16.1" fill="none" stroke="var(--art-line)" strokeWidth=".8" /></pattern>
        <clipPath id={id + "jar"}><path d="M150 150h100q18 0 18 18v150q0 22-22 22H154q-22 0-22-22V168q0-18 18-18z" /></clipPath>
      </defs>
      <rect width="400" height="400" fill={`url(#${id}bg)`} />
      <rect width="400" height="400" fill={`url(#${id}hex)`} opacity=".7" />
      <g transform="translate(-6 46) scale(1.42)"><Flower kind={h.kind} color={h.flower_hex} seed={name} className="art-flower" /></g>
      <ellipse cx="200" cy="344" rx="92" ry="10" fill="#000" opacity=".28" />
      <g>
        <rect x="140" y="118" width="120" height="30" rx="7" fill="var(--art-lid)" />
        <rect x="140" y="118" width="120" height="8" rx="4" fill="#fff" opacity=".18" />
        <path d="M150 150h100q18 0 18 18v150q0 22-22 22H154q-22 0-22-22V168q0-18 18-18z" fill="#fff" opacity=".07" stroke="var(--art-glass)" strokeWidth="1.5" />
        <g clipPath={`url(#${id}jar)`}>
          <rect x="120" y="172" width="160" height="180" fill={`url(#${id}honey)`} />
          <path d="M120 176q20-8 40 0t40 0 40 0 40 0v-8H120z" fill={h.hex[0]} opacity=".9" />
          <rect x="120" y="150" width="160" height="200" fill={`url(#${id}glass)`} />
        </g>
        <rect x="146" y="222" width="108" height="74" rx="6" fill="var(--art-label)" stroke="var(--art-label-edge)" strokeWidth="1" />
        <path d="M200 230l7 4v8l-7 4-7-4v-8z" fill="none" stroke="var(--art-label-ink)" strokeWidth="1" />
        <text x="200" y="263" textAnchor="middle" fontSize="8.5" letterSpacing="2.4" fill="var(--art-label-ink)" fontFamily="Georgia,serif">ARKHAM</text>
        <text x="200" y="284" textAnchor="middle" fontSize={short.length > 9 ? 12 : 14} fontWeight="700" fill="var(--art-label-ink)" fontFamily="Vazirmatn,sans-serif" direction="rtl">{short}</text>
      </g>
    </svg>
  );
}

/** Product image, or the illustrated artwork when no photo has been uploaded. */
export function ProductVisual({ product, h, children }: { product: any; h: HoneyProfile | null; children?: ReactNode }) {
  if (product.images?.[0] || !h) return <>{children}</>;
  return <HoneyArt h={h} name={product.name} />;
}

/** The flower this honey comes from, with a bee that flies in and drinks. */
export function FlowerScene({ h, label }: { h: HoneyProfile; label: string }) {
  return (
    <div className="flower-scene" style={{ "--honey-a": h.hex[0], "--honey-b": h.hex[1] } as any}>
      <span className="flower-scene-glow" aria-hidden="true" />
      <Flower kind={h.kind} color={h.flower_hex} seed={label} className="flower-scene-plant" />
      <span className="flower-scene-bee" aria-hidden="true"><span><BeeMark /></span></span>
      <span className="flower-scene-pollen" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ "--i": i } as any} />)}</span>
    </div>
  );
}
