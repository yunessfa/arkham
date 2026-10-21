from pathlib import Path
p=Path('frontend/src/main.tsx');s=p.read_text().replace('import "./style.css";','import "./style.css";\nimport ScrollExperience from "./ScrollExperience";')
s=s.replace('function Home() {','function Home() {\n  const {assets} = useApp();\n  const storyImage = assets?.find((a:any) => a.key === "story-image");\n  const editorial = assets?.find((a:any) => a.key === "editorial-image");')
s=s.replace('<div className="story-monogram" aria-hidden="true">\n              <img src={crest} alt="" />\n            </div>','''<div className={storyImage ? "story-photograph editorial-frame" : "story-monogram"} data-drift>
              <img src={storyImage?.image || crest} alt={storyImage?.alt || "نشان آرکهام"} loading="lazy" />
              {storyImage && <span className="photo-caption">تصویرسازی دمو · طبیعت الهام‌بخش ما</span>}
            </div>''')
s=s.replace('''      {benefits && (
        <section className="section wrap">''','''      {editorial && <section className="editorial-break editorial-frame" data-drift>
        <img src={editorial.image} alt={editorial.alt} loading="lazy" />
        <div className="wrap"><span className="eyebrow">THE ART OF SLOW LIVING</span><h2>گاهی، شیرینی در مکث‌کردن است.</h2><p>یک لحظه برای خودتان. یک طعم برای به‌خاطر سپردن.</p><Link className="button gold" to="/journal">در مجله قدم بزنید ←</Link></div>
      </section>}
      {benefits && (
        <section className="section wrap">''')
s=s.replace('''          <p className="prose">{benefits.body}</p>
        </section>''','''          <p className="prose">{benefits.body}</p>
          {Array.isArray(benefits.settings?.items) && <div className="benefits-grid">{benefits.settings.items.map((item:any,i:number)=><article className="benefit-card" key={item.title}><span className="benefit-number">۰{i+1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>}
        </section>''')
s=s.replace('function ArticleCard({ a }: { a: any }) {\n  return (','function ArticleCard({ a }: { a: any }) {\n  const {assets} = useApp();\n  const image = assets?.find((x:any)=>x.key === "article-"+a.slug);\n  return (')
s=s.replace('''    <article className="article-card">
      <span''','''    <article className="article-card">
      {image && <Link className="article-image editorial-frame" to={"/journal/"+a.slug} data-drift><img src={image.image} alt={image.alt} loading="lazy" /></Link>}
      <span''')
s=s.replace('function ArticlePage() {\n  const { slug }','function ArticlePage() {\n  const {assets} = useApp();\n  const { slug }')
s=s.replace('''          <article className="prose narrow">
            <p className="muted">''','''          <article className="prose narrow">
            {assets?.find((x:any)=>x.key === "article-"+a.slug) && <div className="article-cover editorial-frame" data-drift><img src={assets.find((x:any)=>x.key === "article-"+a.slug).image} alt="تصویر نمایشی مجله، تولیدشده با هوش مصنوعی" /></div>}
            <p className="muted">''')
s=s.replace('<p>{a.body}</p>','{a.body.split(/\\n\\n+/).map((text:string,i:number)=><p key={i}>{text}</p>)}')
s=s.replace('function ContentPage() {\n  const { key }','function ContentPage() {\n  const {assets} = useApp();\n  const { key }')
s=s.replace('''              <h2>{d.title}</h2>
              <p>{d.body}</p>''','''              {key === "story" && assets?.find((x:any)=>x.key === "story-image") && <div className="content-cover editorial-frame" data-drift><img src={assets.find((x:any)=>x.key === "story-image").image} alt="چشم‌انداز الهام‌بخش — تصویر دمو تولیدشده با هوش مصنوعی" /></div>}
              <h2>{d.title}</h2>
              {d.body.split(/\\n\\n+/).map((text:string,i:number)=><p key={i}>{text}</p>)}
              {Array.isArray(d.settings?.sections) && <div className="faq-list">{d.settings.sections.map((item:any)=><details key={item.title}><summary>{item.title}</summary><p>{item.body}</p></details>)}</div>}''')
s=s.replace('''      <Header />
      {bootError''','''      <ScrollExperience />
      <Header />
      {session?.demo_mode && <aside className="demo-notice"><span>DEMO</span> نسخه نمایشی — تصاویر و قیمت‌ها نمونه‌اند؛ پرداخت واقعی نیست.</aside>}
      {bootError''')
# Provide the management entry only to authenticated staff.
s=s.replace('''          <Link to={session?.authenticated ? "/account" : "/login"}>''','''          {session?.user?.is_staff && <Link to="/manage" className="manage-shortcut">مدیریت</Link>}
          <Link to={session?.authenticated ? "/account" : "/login"}>''')
p.write_text(s)
