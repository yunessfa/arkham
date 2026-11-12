export const DESIGN_KEY = 'site-design';
export const palettes = [
  {id:'golden_gallery',name:'گالری طلایی',en:'GOLDEN GALLERY',note:'عاجی، طلایی کهنه و قهوه‌ای طبیعی',colors:['#fbf4e5','#ead9b8','#a56b31','#433323']},
  {id:'botanical_ivory',name:'باغِ روشن',en:'BOTANICAL IVORY',note:'عاجی، سبز مریم‌گلی و طلایی ملایم',colors:['#f6f7ed','#e0e7d5','#66764e','#354638']},
  {id:'rose_nectar',name:'شهدِ شکوفه',en:'ROSE NECTAR',note:'کرم، رز خاکی و آجریِ آرام',colors:['#fcf4ec','#eedbd0','#a76751','#513b33']},
  {id:'mineral_sand',name:'شن و آفتاب',en:'MINERAL SAND',note:'سفید گرم، ماسه‌ای و سبز زیتونی',colors:['#faf8f1','#e6e0cf','#837447','#414536']},
  {id:'noir_hive',name:'کندوِ شب',en:'NOIR HIVE',note:'مشکی، طلاییِ زنبوری و درخشش عسلی برای قالب دوم ارکام',colors:['#0b0b0b','#fbd46d','#ffc24b','#fff9c0']},
] as const;
/** The two site themes offered to visitors and in the panel. Others stay valid for old data. */
export const THEMES=['golden_gallery','noir_hive'] as const;
export const themes=palettes.filter(p=>(THEMES as readonly string[]).includes(p.id));
export type PaletteId = typeof palettes[number]['id'];
export const DEFAULT_DESIGN:PaletteId='noir_hive';
export function readDesign(value:unknown):PaletteId {
  if(!value || typeof value!=='object' || Array.isArray(value))return DEFAULT_DESIGN;
  const v=value as Record<string,unknown>;
  if(v.schemaVersion!==1 || Object.keys(v).some(k=>!['schemaVersion','styleId'].includes(k)))return DEFAULT_DESIGN;
  return palettes.some(p=>p.id===v.styleId)?v.styleId as PaletteId:DEFAULT_DESIGN;
}
export const clamp01=(n:number)=>Math.min(1,Math.max(0,Number.isFinite(n)?n:0));
export function railProgress(top:number,height:number,viewport:number){return clamp01(-top/Math.max(1,height-viewport));}
export function beeTarget(rect:{left:number;right:number;top:number;width:number;height:number},width:number,height:number){
  // RTL: the line ends on the left, so the bee lands just past the last word, clear of title icons.
  return {x:Math.max(36,Math.min(width-(width<900?52:40),rect.left-22)),y:Math.max(90,Math.min(height-50,rect.top+Math.min(26,rect.height*.2)))};
}
