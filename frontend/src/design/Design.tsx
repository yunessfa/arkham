import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {api,rows} from '../api';
import {DESIGN_KEY,DEFAULT_DESIGN,palettes,themes,THEMES,readDesign,type PaletteId} from './registry';
const VISITOR_KEY='arkham-theme',PUBLISHED_KEY='arkham-theme-published';
function stored(key:string):PaletteId|null{try{const v=localStorage.getItem(key);return v&&(THEMES as readonly string[]).includes(v)?v as PaletteId:null}catch{return null}}
function store(key:string,v:string|null){try{v?localStorage.setItem(key,v):localStorage.removeItem(key)}catch{}}
const DesignContext=createContext<any>(null);
export function DesignProvider({children}:{children:ReactNode}){
 const [published,setPublishedState]=useState<PaletteId>(()=>stored(PUBLISHED_KEY)||DEFAULT_DESIGN),[preview,setPreview]=useState<PaletteId|null>(null),[visitor,setVisitor]=useState<PaletteId|null>(()=>stored(VISITOR_KEY));
 const setPublished=(id:PaletteId)=>{setPublishedState(id);store(PUBLISHED_KEY,id)};
 /** Visitor's own light/dark choice: remembered on this device only, never published. */
 const chooseTheme=(id:PaletteId|null)=>{setVisitor(id);store(VISITOR_KEY,id)};
 const reload=async()=>{const d=await api('content/');setPublished(readDesign(rows(d).find((x:any)=>x.key===DESIGN_KEY)?.settings));};
 useEffect(()=>{let alive=true;const load=()=>api('content/').then(d=>alive&&setPublished(readDesign(rows(d).find((x:any)=>x.key===DESIGN_KEY)?.settings))).catch(()=>{});load();const focus=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',focus);return()=>{alive=false;document.removeEventListener('visibilitychange',focus)}},[]);
 const active=preview||visitor||published;
 useEffect(()=>{const root=document.documentElement;root.dataset.design=active;document.querySelector('meta[name=theme-color]')?.setAttribute('content',active==='noir_hive'?'#0b0b0b':'#fbf4e5');return()=>{delete root.dataset.design}},[active]);
 return <DesignContext.Provider value={{active,published,preview,setPreview,visitor,chooseTheme,reload}}>{children}</DesignContext.Provider>
}
export const useDesign=()=>useContext(DesignContext);
export function PalettePicker(){const {active,preview,setPreview}=useDesign();return <div className="palette-picker"><div className="palette-options" role="group" aria-label="پیش‌نمایش رنگ‌بندی سایت">{palettes.map(p=><button key={p.id} aria-pressed={active===p.id} onClick={()=>setPreview(p.id)} title={p.note}><span className="palette-swatches" aria-hidden="true">{p.colors.map(c=><i key={c} style={{background:c}}/>)}</span><span>{p.name}</span></button>)}</div><p className="muted">این انتخاب فقط پیش‌نمایش شماست و تنظیمات عمومی فروشگاه را تغییر نمی‌دهد.{preview&&<button className="text-button" onClick={()=>setPreview(null)}>بازگشت به تم منتشرشده ←</button>}</p></div>}
export function DesignEditor({permissions}:{permissions:string[]}){
 const {published,setPreview,reload}=useDesign(),[choice,setChoice]=useState<PaletteId>(published),[record,setRecord]=useState<any>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>()=>setPreview(null),[]);
 useEffect(()=>{let alive=true;async function load(){try{let found:any=null,page=1,next=true;while(next){const d=await api('admin/content/?page='+page);found=rows(d).find((x:any)=>x.key===DESIGN_KEY);if(found||!d.next)break;page++;}if(alive){setRecord(found);setChoice(found?readDesign(found.settings):published);setLoaded(true)}}catch(e:any){if(alive)setError(e.message)}}load();return()=>{alive=false}},[]);
 const canSave=permissions?.includes(record?'store.change_sitecontent':'store.add_sitecontent');
 async function publish(){if(!loaded||!canSave)return;setBusy(true);setError('');setMessage('');try{const settings={schemaVersion:1,styleId:choice};const d=record?await api('admin/content/'+record.id+'/','PATCH',{settings,published:true}):await api('admin/content/','POST',{key:DESIGN_KEY,title:'طراحی ظاهر سایت',body:'',settings,published:true});setRecord(d);await reload();setPreview(null);setMessage('تم در سرور منتشر شد؛ بازدیدکنندگان جدید آن را می‌بینند. تب‌های باز با بازگشت به آن‌ها به‌روز می‌شوند.')}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section className="design-editor"><span className="eyebrow">ARKHAM / ART DIRECTION</span><h2>ظاهر و رنگ‌بندی سایت</h2><p>تم پیش‌فرض سایت را بین «گالری طلایی» (روشن) و «کندوی شب» (تیره) انتخاب کنید. بازدیدکننده‌ها می‌توانند با دکمهٔ روز/شب در سایت، تم دلخواهشان را روی دستگاه خودشان نگه دارند؛ انتخاب این‌جا پیش‌فرض همه است.</p>{error&&<p className="error" role="alert">{error}</p>}{!loaded&&!error&&<p role="status">در حال دریافت تنظیمات…</p>}<div className="design-choices">{themes.map(p=><label key={p.id}><input type="radio" name="site-design" value={p.id} checked={choice===p.id} onChange={()=>{setChoice(p.id);setPreview(p.id);setMessage('')}}/><span className="palette-swatches">{p.colors.map(c=><i key={c} style={{background:c}}/>)}</span><strong>{p.name}</strong><small dir="ltr">{p.en}</small><p>{p.note}</p></label>)}</div><div className="actions"><button className="gold" disabled={!loaded||!canSave||busy} onClick={publish}>{busy?'در حال انتشار…':'تأیید و انتشار تم برای همه'}</button><button disabled={busy} onClick={()=>{setPreview(null);setChoice(published)}}>لغو پیش‌نمایش</button></div>{loaded&&!canSave&&<p className="notice">برای انتشار به مجوز افزودن یا ویرایش محتوای سایت نیاز دارید.</p>}<p role="status">{message}</p></section>
}
