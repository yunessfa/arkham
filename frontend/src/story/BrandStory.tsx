import {Link} from 'react-router-dom';
import {HoneyPattern,BotanicalDecoration} from '../components/Atelier';
import {EditorialPicture} from './EditorialPicture';
import {StoryOrnament} from './StoryHome';
/** Dedicated article layout, never shares Home's fixed navigation class. */
export default function BrandStory({content,asset}:{content:any;asset?:any}){
 const paragraphs=String(content.body||'').split(/\n\s*\n/).filter(p=>p.trim());
 const customImage=asset?.image&&!String(asset.image).split('/').pop()?.startsWith('demo-');
 return <article className="brand-story-content">
  <section className="brand-story-opening"><div className="brand-story-cover">{customImage?<img src={asset.image} alt={asset.alt||content.title} width="1264" height="848" decoding="async"/>:<EditorialPicture kind="meadow" alt="کندو در دامنهٔ کوهستان؛ تصویر مفهومی تولیدشده با هوش مصنوعی" eager sizes="(max-width: 760px) 100vw, 60vw"/>}<span className="editorial-image-label" dir="ltr">ARKHAM / A NATURE STUDY</span></div><div className="brand-story-intro"><span className="eyebrow" dir="ltr">THE ARKHAM STORY</span><h2>{content.title}</h2>{paragraphs[0]&&<p>{paragraphs[0]}</p>}<a className="text-button" href="#brand-notes">روایت را بخوانید ↓</a><StoryOrnament kind="flower"/></div></section>
  <div className="brand-story-index" aria-hidden="true"><span dir="ltr">NATURE · TIME · WONDER</span><i/><span>یادداشت‌هایی برای کمی مکث</span></div>
  <div className="brand-story-notes" id="brand-notes">{paragraphs.slice(1).map((text,i)=><section className={'brand-story-note note-'+(i%3)} key={i}><div className="brand-note-side"><span className="brand-note-number" dir="ltr">{String(i+1).padStart(2,'0')}</span><span dir="ltr">FIELD NOTE</span><BotanicalDecoration/></div><div className="brand-note-body"><h3>یادداشت {new Intl.NumberFormat('fa-IR').format(i+1)}</h3><p>{text}</p></div>{i===1&&<div className="brand-note-photo"><EditorialPicture kind="bee" alt="مطالعه تصویری زنبور و گل؛ تصویر مفهومی تولیدشده"/></div>}</section>)}</div>
  <section className="brand-story-close"><HoneyPattern/><StoryOrnament kind="seal"/><span className="eyebrow" dir="ltr">THE STORY CONTINUES</span><h2>کمی از این روایت،<br/>برای لحظه‌های شما.</h2><Link className="button gold" to="/products">کشف مجموعهٔ ارکام ←</Link><Link className="text-button" to="/journal">ورق زدن مجله ↗</Link></section>
 </article>
}
