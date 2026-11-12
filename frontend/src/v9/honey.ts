/** Honey profile helpers shared by cards, product pages, the finder and signup. */
import { api, rows } from "../api";

export type Crystal = "fast" | "medium" | "slow";
export type HoneyProfile = {
  flower: string; latin?: string; kind: string; flower_hex: string; plant: string;
  region: string; season: string; color: string; hex: [string, string];
  taste: string[]; sweet: number; aroma: number; crystal: Crystal; temper: string;
  purposes: string[]; needs: string[]; rarity: number; pack?: string;
};

export const profileOf = (p: any): HoneyProfile | null => {
  const h = p?.specifications?._honey;
  return h && typeof h === "object" && Array.isArray(h.hex) ? h : null;
};

/** Visible specification rows (internal keys start with "_"). */
export const visibleSpecs = (p: any) => Object.entries(p?.specifications || {}).filter(([k]) => !k.startsWith("_"));

export const PURPOSES: [string, string, string][] = [
  ["daily", "صبحانه و مصرف روزانه", "jar"],
  ["gift", "هدیه دادن", "gift"],
  ["wellness", "خواص درمانی و دارویی", "leaf"],
  ["kids", "برای بچه‌ها", "heart"],
  ["tea", "کنار چای و دمنوش", "drop"],
];
export const TASTES: [string, string, string][] = [
  ["mild", "ملایم و لطیف", "شیرینی آرام، بدون تندی"],
  ["floral", "گلی و عطرآگین", "بوی شکوفه و گل بهاری"],
  ["herbal", "گیاهی و معطر", "عطر آویشن و گیاهان کوهی"],
  ["bold", "قوی و خاص", "تند، تلخ‌مایه یا ادویه‌ای"],
  ["fruity", "میوه‌ای و ملس", "ته‌مزهٔ مرکبات و میوه"],
];
export const NEEDS: [string, string][] = [
  ["respiratory", "سرفه و گلو"], ["digestion", "گوارش و معده"], ["immunity", "تقویت ایمنی"],
  ["energy", "انرژی و نشاط"], ["sleep", "آرامش و خواب"], ["anemia", "کم‌خونی و رنگ‌پریدگی"],
  ["skin", "پوست و زیبایی"], ["liver", "کبد و پاکسازی"], ["women", "سلامت بانوان"],
  ["memory", "تمرکز و حافظه"], ["sugar", "قند خون (با نظر پزشک)"],
];
export const COLORS: [string, string, string, string][] = [
  ["light", "روشن و طلایی", "#fbe7a0", "#e3b552"],
  ["amber", "کهربایی", "#efb85a", "#b9741f"],
  ["dark", "تیره و پررنگ", "#c9772a", "#5e3410"],
];
export const WEIGHTS: [string, string][] = [["", "فرقی نمی‌کند"], ["500", "نیم کیلو"], ["650", "شیشهٔ ۶۵۰ گرمی"], ["1000", "یک کیلو"]];
export const BUDGETS: [string, string, string][] = [
  ["", "مهم نیست", ""],
  ["low", "اقتصادی", "تا ۷۰۰ هزار تومان"],
  ["mid", "متوسط", "۷۰۰ هزار تا ۱/۲ میلیون"],
  ["high", "بدون محدودیت", "بیش از ۱/۲ میلیون"],
];
export const needLabel = (k: string) => NEEDS.find((n) => n[0] === k)?.[1] || k;
export const purposeLabel = (k: string) => PURPOSES.find((n) => n[0] === k)?.[1] || k;
export const CRYSTAL_LABEL: Record<string, string> = { fast: "زود شکرک می‌زند", medium: "شکرک متوسط", slow: "دیر شکرک می‌زند" };

export type Answers = { purposes: string[]; tastes: string[]; needs: string[]; colors: string[]; weight: string; budget: string };
export const emptyAnswers = (): Answers => ({ purposes: [], tastes: [], needs: [], colors: [], weight: "", budget: "" });

const TASTE_WORDS: Record<string, RegExp> = {
  mild: /ملایم|لطیف|نرم|آرام|شیرین|کره|همه‌پسند|روان/,
  floral: /گلی|عطرآگین|معطر|گل/,
  herbal: /گیاهی|معطر|بادیان|منتول|خنک/,
  bold: /تند|قوی|تلخ|ادویه|وحشی|عمیق|پیچیده|خاکی|خاص/,
  fruity: /میوه|ملس|مرکبات|ترش|کارامل/,
};
const colorBand = (h: HoneyProfile) => (/روشن|زرد|طلایی/.test(h.color) && !/تیره/.test(h.color) ? "light" : /تیره|قهوه|سرخ/.test(h.color) ? "dark" : "amber");

export const variantFor = (p: any, weight: string) => {
  const vs = (p.variants || []).filter((v: any) => v.active !== false);
  const exact = weight ? vs.find((v: any) => String(v.weight_g) === weight) : null;
  return exact || [...vs].sort((a: any, b: any) => Number(a.current_price) - Number(b.current_price))[0];
};
const inBudget = (price: number, b: string) => !b || (b === "low" ? price <= 700000 : b === "mid" ? price > 600000 && price <= 1250000 : price > 1100000);

export type Pick = { product: any; profile: HoneyProfile; score: number; reasons: string[]; variant: any };

/** Transparent, rule-based scoring: every point comes with a reason we can show. */
export function recommend(products: any[], a: Answers): Pick[] {
  const out: Pick[] = [];
  for (const p of products) {
    const h = profileOf(p);
    if (!h) continue;
    const v = variantFor(p, a.weight);
    let score = 0;
    const reasons: string[] = [];
    const tasteText = h.taste.join(" ");
    for (const k of a.purposes) if (h.purposes.includes(k)) { score += 3; reasons.push(purposeLabel(k)); }
    if (a.purposes.includes("gift")) score += h.rarity - 1;
    if (a.purposes.includes("kids") && h.sweet >= 4 && h.aroma <= 4) score += 2;
    if (a.purposes.includes("kids") && h.sweet <= 2) score -= 3;
    for (const k of a.tastes) if (TASTE_WORDS[k]?.test(tasteText) || (k === "mild" && h.sweet >= 4 && h.aroma <= 3) || (k === "bold" && h.aroma >= 5 && h.sweet <= 3)) { score += 3; reasons.push("طعم " + h.taste[0]); }
    if (a.tastes.length && !a.tastes.includes("bold") && h.sweet <= 2) score -= 2;
    for (const k of a.needs) if (h.needs.includes(k)) { score += 4; reasons.push(needLabel(k)); }
    if (a.needs.includes("sugar") && h.crystal === "slow") score += 2;
    if (a.colors.length) { if (a.colors.includes(colorBand(h))) { score += 2; reasons.push("رنگ " + h.color); } else score -= 1; }
    if (a.weight) { if (v && String(v.weight_g) === a.weight) score += 2; else score -= 2; }
    const price = Number(v?.current_price || 0);
    if (a.budget) { if (inBudget(price, a.budget)) score += 2; else score -= 4; }
    const available = (p.variants || []).some((x: any) => x.available > 0);
    if (!available) score -= 6;
    out.push({ product: p, profile: h, score, reasons: [...new Set(reasons)].slice(0, 3), variant: v });
  }
  return out.sort((x, y) => y.score - x.score || (y.product.featured ? 1 : 0) - (x.product.featured ? 1 : 0));
}

/** All published honeys (the API pages at 24). */
let cache: Promise<any[]> | null = null;
export function allProducts(): Promise<any[]> {
  if (!cache) cache = (async () => {
    let list: any[] = [], path: string | null = "products/";
    for (let i = 0; path && i < 10; i++) {
      const d: any = await api(path);
      list = list.concat(rows(d));
      path = d.next ? String(d.next).replace(/^.*?\/api\/v1\//, "") : null;
    }
    return list;
  })().catch((e) => { cache = null; throw e; });
  return cache;
}
