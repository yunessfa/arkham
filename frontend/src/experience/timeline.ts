/** Scroll coordinates shared by the DOM and one persistent R3F canvas. */
export type ExperienceState = { progress: number; active: boolean; reduced: boolean; product: number; hasGift?: boolean };
export const chapters = ['آغاز', 'داستان', 'مجموعه', 'جزئیات', 'بسته‌بندی', 'انتخاب آگاهانه', 'کشف ارکام'];
export const clamp = (n:number, lo=0, hi=1) => Math.max(lo, Math.min(hi,n));
export const smooth = (n:number) => {const x=clamp(n);return x*x*(3-2*x)};
export function chapterOpacity(progress:number,index:number) {return 1-smooth((Math.abs(progress-index)-.22)/.43)}
export const palettes = ['#fff6e5','#eaf0df','#f4e5c8','#182c23','#eee0c4','#e7eddf','#15291f'];
export function mixHex(a:string,b:string,t:number) {return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}

export function luminance(hex:string){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
export function foreground(bg:string){const l=luminance(bg),dark='#2a1d15',light='#fff6e5';const d=(l+.05)/(luminance(dark)+.05),w=(luminance(light)+.05)/(l+.05);if(Math.max(d,w)>=4.5)return d>=w?dark:light;return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff'}
