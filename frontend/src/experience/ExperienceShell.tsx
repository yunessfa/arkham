import React,{useEffect,useRef,useState,Suspense,lazy,Component} from 'react';
import {Link} from 'react-router-dom';
import {fa,money} from '../api';
import crest from '../assets/arkham-crest.webp';
import fallbackImage from '../assets/brand-fallback.webp';
import BotanicalLayer from './BotanicalLayer';
import {chapters,chapterOpacity,clamp,mixHex,foreground,palettes,type ExperienceState} from './timeline';
import './experience.css';
const PersistentScene=lazy(()=>import('../Scene'));
class SceneBoundary extends Component<any,{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?this.props.fallback:this.props.children}}
function usePreferences(){const [simple,set]=useState(()=>matchMedia('(prefers-reduced-motion: reduce), (max-height: 620px)').matches);useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce), (max-height: 620px)');const change=()=>set(q.matches);q.addEventListener('change',change);return()=>q.removeEventListener('change',change)},[]);return simple}
function concise(s:string='',n=180){const text=s.replace('نمونه نمایشی؛ تصویر تولیدشده با هوش مصنوعی و قیمت غیرواقعی. ','').split('\n\n').slice(-2).join(' ');return text.length<=n?text:text.slice(0,n).replace(/\s+\S*$/,'')+'…'}
export default function ExperienceShell({products,blocks,assets,add,loading,error}:{products:any[];blocks:any[];assets:any[];add:(id:number)=>Promise<any>;loading:boolean;error:string}){
 const simple=usePreferences(),track=useRef<HTMLDivElement>(null),panels=useRef<(HTMLElement|null)[]>([]),world=useRef<HTMLDivElement>(null);
 const state=useRef<ExperienceState>({progress:0,active:true,reduced:simple,product:0});
 const [chapter,setChapter]=useState(0),[productIndex,setProduct]=useState(0),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false);
 const selected=products[productIndex%Math.max(products.length,1)],variant=selected?.variants?.find((v:any)=>v.active!==false&&v.available>0)||selected?.variants?.[0];
 const hero=blocks.find(b=>b.key==='hero'),story=blocks.find(b=>b.key==='story'),benefits=blocks.find(b=>b.key==='benefits');
 const storySettings=blocks.find(b=>b.key==='experience')?.settings||{};
 const gift=products.find(p=>p.category?.slug?.includes('gift')||/هدیه|gift/i.test(p.name));
 const [webgl]=useState(()=>{try{return !!document.createElement('canvas').getContext('webgl2')}catch{return false}});
 const photo=selected?.images?.[0]?.image;
 const fallback=<div className="fallback-scene cinematic-fallback"><img src={photo||fallbackImage} alt={photo?selected.name+' — تصویر منتشرشده محصول':'تصویرسازی دوبعدی شیشه عسل با نشان ارکام'}/><span>نمای دوبعدی · تمام امکانات خرید در دسترس است</span></div>;
 state.current.reduced=simple;state.current.product=productIndex;state.current.hasGift=!!gift;
 const productCount=useRef(0);productCount.current=Math.min(products.length,6);const selectionSegment=useRef(-1);
 useEffect(()=>{
  const node=track.current!;let raf=0;let previous=-1;
  const update=()=>{raf=0;const rect=node.getBoundingClientRect();state.current.active=rect.bottom>0&&rect.top<innerHeight&&!document.hidden;
   const p=simple?0:clamp(-rect.top/Math.max(1,node.offsetHeight-innerHeight))*6;state.current.progress=p;
   if(!simple&&p>=1.65&&p<2.4&&productCount.current){const segment=Math.min(productCount.current-1,Math.floor(clamp((p-1.65)/.75)*productCount.current));if(selectionSegment.current!==segment){selectionSegment.current=segment;setProduct(segment)}}
   const at=Math.round(p);if(previous!==at){previous=at;setChapter(at)}
   const a=Math.floor(p),t=p-a;
   const bg=mixHex(palettes[a],palettes[Math.min(6,a+1)],t);if(world.current){world.current.style.setProperty('--world-bg',bg);world.current.style.color=foreground(bg)}
   node.style.setProperty('--chapter-progress',String(p/6));
   panels.current.forEach((el,i)=>{if(!el)return;el.style.opacity=simple?'1':String(chapterOpacity(p,i));el.style.transform=simple?'none':`translate3d(${(p-i)*-28}px,${(p-i)*-65}px,0)`;});
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(update)};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);document.addEventListener('visibilitychange',schedule);
  const ro=new ResizeObserver(schedule);ro.observe(node);update();
  return()=>{removeEventListener('scroll',schedule);removeEventListener('resize',schedule);document.removeEventListener('visibilitychange',schedule);ro.disconnect();cancelAnimationFrame(raf);state.current.active=false};
 },[simple]);
 const go=(i:number)=>{if(simple){document.getElementById(`chapter-${i}`)?.scrollIntoView({behavior:'auto'});return}const el=track.current!;window.scrollTo({top:scrollY+el.getBoundingClientRect().top+(el.offsetHeight-innerHeight)*i/6,behavior:'smooth'})};
 const content=[
  <><span className="eyebrow">ARKHAM / HONEY ATELIER</span><h1>{hero?.title||<>طبیعت، در<br/><em>ناب‌ترین</em> شکل خود</>}</h1><p>{hero?.body||'ارکام؛ مکثی شیرین، در میان هیاهوی روز. روایت طعم‌ها، رنگ‌ها و لحظه‌هایی که به یاد می‌مانند.'}</p><div className="actions"><Link className="button gold" to="/products">مشاهده محصولات <span>↙</span></Link><Link className="text-button" to="/pages/story">داستان ارکام ←</Link></div><span className="chapter-whisper">از دنیای کندو، برای لحظه‌های شما</span></>,
  <><span className="eyebrow">01 / ROOTED IN NATURE</span><h2>{storySettings.storyTitle||'هر طعم،\nآغاز یک روایت.'}</h2><p>{storySettings.storyBody||concise(story?.body)||'از نظم کندو تا سکوت یک صبح آرام؛ دنیای ارکام دعوتی است به دیدن جزئیات و انتخاب با حوصله.'}</p><Link className="text-button" to="/pages/story">داستان ارکام را بخوانید ←</Link><span className="chapter-whisper">طبیعت، الهامِ طراحی ماست.</span></>,
  <><span className="eyebrow">02 / THE HONEY COLLECTION</span><h2>{selected?.name||'طعمِ انتخاب شما'}</h2>{selected?<><p>{concise(selected.description)}</p><div className="showcase-meta"><span>{selected.category?.name}</span><span>{variant?fa(variant.weight_g)+' گرم':'گونه‌ای منتشر نشده'}</span></div><div className="showcase-price">{variant?money(variant.current_price):'قیمت منتشر نشده'}<small>{variant?.available>0?'موجود برای سفارش':'فعلاً ناموجود'}</small></div><div className="actions"><button className="gold" disabled={!variant||variant.available<1||busy} onClick={async()=>{setBusy(true);try{await add(variant.id)}finally{setBusy(false)}}}>{busy?'در حال افزودن…':'افزودن به سبد خرید'}</button><Link className="text-button" to={'/products/'+selected.slug}>جزئیات محصول ←</Link></div><div className="product-switcher" role="group" aria-label="انتخاب محصول نمایشی">{products.slice(0,6).map((p,i)=><button key={p.id} aria-pressed={productIndex===i} onClick={()=>setProduct(i)} aria-label={'نمایش '+p.name}>{p.images?.[0]?<img src={p.images[0].image} alt="" loading="lazy"/>:fa(i+1)}</button>)}</div></>:<p role="status">{error|| (loading?'در حال دریافت محصولات…':'محصولات پس از انتشار در فروشگاه، اینجا نمایش داده می‌شوند.')}</p>}</>,
  <><span className="eyebrow">03 / A CLOSER LOOK</span><h2>{storySettings.detailTitle||'زیبایی،\nدر جزئیات است.'}</h2><p>{storySettings.detailBody||'گردش نور روی شیشه، عمقِ کهربایی و خطوطی الهام‌گرفته از کندو. با ادامه اسکرول، طراحی بسته‌بندی را از زاویه‌ای دیگر ببینید.'}</p><div className="detail-index"><span>۰۱ <small>نور و شیشه</small></span><span>۰۲ <small>رنگ و بافت</small></span><span>۰۳ <small>نشان ارکام</small></span></div><span className="chapter-whisper">تصویرسازی سه‌بعدی برند؛ نه گواه کیفیت محصول</span></>,
  <><span className="eyebrow">04 / MADE TO BE GIVEN</span><h2>{storySettings.packagingTitle||'یک هدیه،\nچند لحظه شیرین.'}</h2><p>{gift?concise(gift.description):'وزن‌ها و شیوه بسته‌بندی هر محصول را در فروشگاه ببینید. انتخابی هماهنگ با سلیقه شما، بدون شلوغی اضافه.'}</p>{gift?.images?.[0]&&<Link className="gift-preview" to={'/products/'+gift.slug}><img src={gift.images[0].image} alt={gift.images[0].alt||gift.name} loading="lazy"/><span>{gift.name}<small>مشاهده بسته‌بندی و جزئیات ←</small></span></Link>}<Link className="text-button" to={gift?'/products/'+gift.slug:'/products'}>انتخاب بسته‌بندی ←</Link></>,
  <><span className="eyebrow">05 / CHOOSE WITH CONFIDENCE</span><h2>{benefits?.title||'انتخاب خوب،\nاز شناخت آغاز می‌شود.'}</h2><div className="promise-lines">{(Array.isArray(benefits?.settings?.items)?benefits.settings.items:[{title:'اطلاعات روشن',body:'وزن، قیمت و موجودی منتشرشده را پیش از سفارش ببینید.'},{title:'انتخاب با حوصله',body:'محصولات را مقایسه کنید و جزئیات هر انتخاب را بخوانید.'},{title:'مسیر مشخص',body:'سبد، سفارش‌ها و پیام‌های پشتیبانی در حساب شما در دسترس‌اند.'}]).slice(0,3).map((b:any,i:number)=><div key={b.title}><span>{fa(i+1).padStart(2,'۰')}</span><div><h3>{b.title}</h3><p>{b.body}</p></div></div>)}</div></>,
  <><span className="eyebrow">06 / YOUR NEXT SWEET MOMENT</span><h2>{storySettings.finalTitle||'لحظه بعدی را\nشیرین‌تر انتخاب کنید.'}</h2><p>{storySettings.finalBody||'مجموعه ارکام را کشف کنید؛ از اولین نگاه تا انتخابی که به سبد شما می‌رسد.'}</p><div className="actions"><Link className="button gold" to="/products">خرید عسل ارکام ↙</Link><Link className="text-button" to="/contact">گفت‌وگو با ارکام ←</Link></div><a href="#collection" className="experience-skip">دیدن مجموعه و مجله ↓</a></>
 ];
 return <div ref={track} className={`experience-track${simple?' experience-simple':''}`} data-chapter={chapter} data-testid="experience">
  <div ref={world} className={`experience-viewport ${!simple&&(chapter===3||chapter===6)?'world-dark':''}`}>
   <BotanicalLayer/>
   <div className="world-orbit orbit-one" aria-hidden="true"/><div className="world-orbit orbit-two" aria-hidden="true"/>
   <div className="world-scene" aria-hidden="true">{!webgl||failed||simple?fallback:<SceneBoundary fallback={fallback}><Suspense fallback={fallback}><PersistentScene logoUrl={assets?.find(a=>a.key==='logo-dark')?.image||crest} onFailure={()=>setFailed(true)} experience={state}/></Suspense></SceneBoundary>}<p className="world-caption">ARKHAM · تصویرسازی برند، نه مدل محصول واقعی</p></div>
   <div className="story-panels">{content.map((children,i)=>{const active=simple||chapter===i;return <section key={i} id={'chapter-'+i} ref={el=>{panels.current[i]=el}} className={`story-panel ${i===0?'hero':''}`} aria-hidden={active?undefined:true} inert={active?undefined:true} aria-label={chapters[i]}>{children}</section>})}</div>
   {!simple&&<><div className="experience-topline"><span>THE ARKHAM EXPERIENCE</span><a href="#collection">رفتن به فروشگاه و مجله ↓</a></div><nav className="scene-navigation" aria-label="فصل‌های روایت ارکام">{chapters.map((name,i)=><button key={name} onClick={()=>go(i)} aria-label={'فصل '+fa(i+1)+'، '+name} aria-current={chapter===i?'step':undefined}><span className="scene-dot"/><span className="scene-label">{name}</span></button>)}</nav><div className="experience-bottom"><span>{fa(chapter+1).padStart(2,'۰')} <i/> {fa(7).padStart(2,'۰')}</span><span>برای ادامه روایت، اسکرول کنید <b>↓</b></span><button onClick={()=>go(Math.min(chapter+1,6))} aria-label="فصل بعد">↓</button></div></>}
  </div>
 </div>
}
