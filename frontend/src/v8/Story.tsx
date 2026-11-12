import { HoneyArt } from "../v9/Flora";
import { profileOf } from "../v9/honey";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { fa, rows } from "../api";
import { useApp, useData } from "../appContext";
import { HexMark } from "../components/Atelier";
import { EditorialPicture } from "../story/EditorialPicture";
import { BeeMark } from "../story/Bee";
import { Icon, type IconName } from "./icons";
import { SoftImage, bestVariant } from "./Shop";

const chapters: [string, string][] = [
  ["journey", "سفر یک قطره"],
  ["numbers", "به زبان عدد"],
  ["letter", "حرف ما"],
  ["colors", "رنگ‌ها و طعم‌ها"],
  ["truths", "عسل طبیعی"],
  ["ritual", "نگهداری"],
];

const journey: { n: string; title: string; text: string; pic: "bee" | "meadow" | "comb" }[] = [
  { n: "۰۱", title: "یک شکوفه", text: "همه‌چیز با گل شروع می‌شود. شهد، شیره‌ای شیرین است که گل می‌سازد تا گرده‌افشان‌ها را به سوی خودش بکشد.", pic: "bee" },
  { n: "۰۲", title: "صدها پرواز", text: "زنبور کارگر شهد را با زبان لوله‌ای‌اش می‌مکد و در «معدهٔ عسل» به کندو می‌برد؛ گاهی از چند کیلومتر دورتر.", pic: "meadow" },
  { n: "۰۳", title: "دست‌به‌دست در کندو", text: "در کندو، زنبورها شهد را میان خودشان می‌گردانند و آنزیم‌هایشان قندهای آن را آرام‌آرام تغییر می‌دهند.", pic: "comb" },
  { n: "۰۴", title: "باد بال‌ها", text: "با بال‌زدنِ بی‌وقفه، آب اضافهٔ شهد تبخیر می‌شود تا عسل غلیظ، معطر و ماندگار شود.", pic: "comb" },
  { n: "۰۵", title: "مُهرِ موم", text: "وقتی عسل رسید، زنبورها خانه‌های شش‌ضلعی را با درپوش موم می‌بندند. این همان نشانه‌ای است که می‌گوید عسل آمادهٔ برداشت است.", pic: "comb" },
];

const numbers: { value: number; prefix?: string; suffix?: string; display?: string; unit: string; text: string }[] = [
  { value: 2000000, prefix: "≈ ", unit: "گل", text: "برای تقریباً نیم کیلو عسل، زنبورهای یک کندو به حدود دو میلیون گل سر می‌زنند." },
  { value: 12, display: "۱/۱۲", unit: "قاشق چای‌خوری", text: "سهم تقریبی یک زنبور کارگر از عسل، در تمام عمر کوتاهش." },
  { value: 6, unit: "ضلع", text: "شش‌ضلعی، خانه‌هایی بدون فاصله با کمترین مصرف موم می‌سازد." },
  { value: 20, prefix: "≤ ", suffix: "٪", unit: "رطوبت", text: "عسل رسیده معمولاً حداکثر حدود ۲۰ درصد آب دارد؛ رازِ ماندگاری طولانی‌اش." },
];

const colors: { name: string; tone: string; a: string; b: string; notes: string; crystal: string }[] = [
  { name: "اقاقیا", tone: "بسیار روشن", a: "#fbefb8", b: "#e9cf6e", notes: "ملایم، گلی و لطیف", crystal: "دیر شکرک می‌زند" },
  { name: "گون", tone: "روشن تا طلایی", a: "#f6dc8c", b: "#d9a640", notes: "شیرینِ آرام با عطر کوهستان", crystal: "متوسط" },
  { name: "آویشن", tone: "کهربایی", a: "#efb85a", b: "#b9741f", notes: "معطر، گیاهی و کمی تند", crystal: "متوسط" },
  { name: "کُنار", tone: "کهربایی گرم", a: "#e3a24a", b: "#9a5a1a", notes: "پررنگ با ته‌مزهٔ کاراملی", crystal: "کند" },
  { name: "چندگیاه", tone: "متغیر", a: "#f2c76a", b: "#8c4f17", notes: "هر فصل، ترکیبی تازه از گل‌ها", crystal: "بسته به فصل" },
];

const truths: { myth: string; fact: string; icon: IconName; warn?: boolean }[] = [
  { myth: "عسلی که شکرک بزند، تقلبی است.", fact: "نه. بلوری‌شدن فرایندی طبیعی است و به نسبت قندها و دما بستگی دارد. بسیاری از عسل‌های طبیعی شکرک می‌زنند.", icon: "drop" },
  { myth: "با آتش‌زدن یا حل‌کردن در آب، اصل بودن معلوم می‌شود.", fact: "آزمایش‌های خانگی قابل اتکا نیستند. مطمئن‌ترین نشانه، برگهٔ آزمایش از آزمایشگاه معتبر است.", icon: "shield" },
  { myth: "عسل تیره‌تر، بهتر است.", fact: "رنگ عسل به گلِ منبع بستگی دارد، نه به کیفیت. هر رنگ طعم و کاربرد خودش را دارد.", icon: "leaf" },
  { myth: "برای روان شدن، عسل را داغ کنید.", fact: "حرارت زیاد عطر و بخشی از ترکیبات حساس عسل را از بین می‌برد. ظرف را چند دقیقه در آب ولرم بگذارید.", icon: "sun" },
  { myth: "عسل برای همهٔ سنین مناسب است.", fact: "عسل برای نوزادانِ کمتر از یک سال مناسب نیست. این توصیهٔ مهمِ پزشکان را جدی بگیرید.", icon: "heart", warn: true },
];

const ritual: { icon: IconName; title: string; text: string }[] = [
  { icon: "jar", title: "درِ ظرف بسته", text: "عسل رطوبت هوا را جذب می‌کند؛ بعد از هر بار مصرف، در را محکم ببندید." },
  { icon: "sun", title: "دور از نور و گرما", text: "در دمای اتاق و دور از آفتاب مستقیم نگه دارید. یخچال لازم نیست و شکرک را تند می‌کند." },
  { icon: "drop", title: "قاشق خشک", text: "قاشق خیس، آب وارد عسل می‌کند. همیشه با قاشق تمیز و خشک بردارید." },
  { icon: "leaf", title: "چای ولرم، نه جوش", text: "عسل را وقتی به چای اضافه کنید که کمی خنک شده؛ عطرش بهتر می‌ماند." },
];

/** Counts up once when it scrolls into view. Reduced motion shows the final value. */
function CountUp({ value, display, prefix = "", suffix = "" }: { value: number; display?: string; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null), [n, setN] = useState(0), [done, setDone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); setDone(true); return; }
    let frame = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now(), dur = 1600;
      const tick = (t: number) => { const p = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - p, 4); setN(Math.round(value * eased)); if (p < 1) frame = requestAnimationFrame(tick); else setDone(true); };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span ref={ref} className="count">{prefix}{display && done ? display : fa(n)}{suffix}</span>;
}

/** Scroll progress of an element through the viewport, written as a CSS variable. */
function useScrollVar(ref: RefObject<HTMLElement | null>, name: string, mode: "through" | "page" = "through") {
  useEffect(() => {
    let frame = 0;
    const write = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      let p: number;
      if (mode === "page") p = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
      else { const r = el.getBoundingClientRect(); p = (innerHeight * 0.62 - r.top) / Math.max(1, r.height); }
      el.style.setProperty(name, String(Math.max(0, Math.min(1, p))));
    };
    const on = () => { if (!frame) frame = requestAnimationFrame(write); };
    write();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(frame); };
  }, []);
}

function ChapterNav() {
  const [active, setActive] = useState("");
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    chapters.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  // Keep the active chapter centred by scrolling the chip bar only. Calling
  // scrollIntoView here also moved the page and fought the reader's swipe.
  useEffect(() => {
    const nav = bar.current, el = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !el) return;
    const a = el.getBoundingClientRect(), b = nav.getBoundingClientRect();
    const left = nav.scrollLeft + (a.left - b.left) - (b.width - a.width) / 2;
    nav.scrollTo({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);
  return (
    <nav className="story-chapters-nav" aria-label="فصل‌های داستان" ref={bar}>
      {chapters.map(([id, label], i) => (
        <a key={id} href={"#" + id} aria-current={active === id ? "true" : undefined}><small dir="ltr">{String(i + 1).padStart(2, "0")}</small>{label}</a>
      ))}
    </nav>
  );
}

export default function StoryPage() {
  const { assets } = useApp();
  const content = useData("content/story/");
  const products = useData("products/?sort=bestselling");
  const page = useRef<HTMLElement>(null), path = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0), [flipped, setFlipped] = useState<number | null>(null);
  useScrollVar(page, "--read", "page");
  useScrollVar(path, "--fill");
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setStep(Number((e.target as HTMLElement).dataset.step))), { rootMargin: "-40% 0px -45% 0px" });
    document.querySelectorAll("[data-step]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const story = content.data;
  const paragraphs: string[] = String(story?.body || "").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.includes("روایت نمایشی"));
  const custom = assets?.find((x: any) => x.key === "story-image");
  const customImage = custom?.image && !String(custom.image).split("/").pop()?.startsWith("demo-");
  const picks = rows(products.data).slice(0, 3);
  return (
    <main className="story-v8" ref={page}>
      <div className="story-progress" aria-hidden="true" />
      <section className="sv-cover">
        <div className="sv-cover-media">{customImage ? <img src={custom.image} alt={custom.alt || ""} /> : <EditorialPicture kind="meadow" alt="کندوها در دامنهٔ کوهستان؛ تصویر مفهومی" eager sizes="100vw" />}</div>
        <div className="sv-cover-shade" />
        <div className="sv-cover-copy wrap">
          <span className="sv-kicker" dir="ltr">THE ARKHAM STORY</span>
          <h1 tabIndex={-1}><span className="sv-line">از گل</span> <span className="sv-line">تا قاشق؛</span> <em className="sv-line">سفرِ یک قطره عسل.</em></h1>
          <p className="sv-lede">قصهٔ ما از کوهستان شروع می‌شود؛ جایی که هزاران زنبور هر روز پرواز می‌کنند تا چند قطره شهد را به خانه برسانند. چند دقیقه همراهمان باشید.</p>
          <a className="sv-scroll" href="#journey"><span className="sv-scroll-bee"><BeeMark /></span>شروع سفر</a>
        </div>
      </section>
      <ChapterNav />

      <section className="sv-journey wrap" id="journey" ref={path}>
        <header className="sv-head" data-reveal="heading">
          <span className="sv-index" dir="ltr">01</span>
          <h2>سفرِ یک قطره</h2>
          <p>پیش از آن‌که عسل به شیشه برسد، پنج ایستگاه را پشت سر می‌گذارد.</p>
        </header>
        <div className="sv-journey-grid">
          <div className="sv-journey-visual" aria-hidden="true">
            {(["bee", "meadow", "comb"] as const).map((k) => <div key={k} className={"sv-jv-frame" + (journey[step]?.pic === k ? " is-on" : "")}><EditorialPicture kind={k} alt="" /></div>)}
            <span className="sv-jv-count" dir="ltr">{String(step + 1).padStart(2, "0")} / 05</span>
          </div>
          <ol className="sv-steps">
            <span className="sv-path" aria-hidden="true"><i /></span>
            {journey.map((s, i) => (
              <li key={s.n} data-step={i} className={i <= step ? "is-lit" : ""}>
                <span className="sv-node" aria-hidden="true"><HexMark /></span>
                <span className="sv-step-n" dir="ltr">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sv-numbers" id="numbers">
        <div className="wrap">
          <header className="sv-head" data-reveal="heading"><span className="sv-index" dir="ltr">02</span><h2>عسل، به زبان عدد</h2><p>چند عدد که هر قاشق را ارزشمندتر می‌کند.</p></header>
          <div className="sv-number-grid">
            {numbers.map((x) => (
              <div className="sv-number" key={x.unit} data-reveal="card">
                <strong><CountUp value={x.value} display={x.display} prefix={x.prefix} suffix={x.suffix} /></strong>
                <span className="sv-unit">{x.unit}</span>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
          <small className="sv-note">اعداد تقریبی‌اند و در منابع زنبورداری رایج هستند؛ برای هر کندو و منطقه می‌توانند فرق کنند.</small>
        </div>
      </section>

      <section className="sv-letter wrap" id="letter">
        <header className="sv-head" data-reveal="heading"><span className="sv-index" dir="ltr">03</span><h2>{story?.title || "حرف ما"}</h2></header>
        <div className="sv-letter-grid">
          <figure className="sv-letter-photo" data-reveal="image"><EditorialPicture kind="bee" alt="زنبور روی شکوفه؛ تصویر مفهومی" /><figcaption dir="ltr">FIELD NOTE · ARKHAM</figcaption></figure>
          <div className="sv-letter-copy">
            {paragraphs[0] && <blockquote data-reveal="heading"><span aria-hidden="true">«</span>{paragraphs[0]}<span aria-hidden="true">»</span></blockquote>}
            {paragraphs.slice(1).map((p, i) => <p key={i} data-reveal="heading">{p}</p>)}
            {!paragraphs.length && <p>ارکام از یک باور ساده شروع شد: عسل خوب، حوصله می‌خواهد. حوصلهٔ زنبور، حوصلهٔ فصل‌ها و حوصلهٔ ما برای این‌که هر شیشه را درست به دستتان برسانیم.</p>}
            <span className="sv-sign">— ارکام <i><BeeMark /></i></span>
          </div>
        </div>
      </section>

      <section className="sv-colors" id="colors">
        <div className="wrap">
          <header className="sv-head" data-reveal="heading"><span className="sv-index" dir="ltr">04</span><h2>رنگ عسل، نقشهٔ گل‌هاست</h2><p>هر گل، رنگ و طعم خودش را به عسل می‌دهد. برای دیدن همه، بکشید.</p></header>
        </div>
        <div className="sv-color-rail" tabIndex={0} aria-label="راهنمای رنگ و طعم عسل‌ها">
          {colors.map((c, i) => (
            <article className="sv-color" key={c.name} style={{ "--a": c.a, "--b": c.b, "--i": i } as any}>
              <span className="sv-swatch" aria-hidden="true"><i /></span>
              <h3>{c.name}</h3>
              <dl>
                <div><dt>رنگ</dt><dd>{c.tone}</dd></div>
                <div><dt>طعم</dt><dd>{c.notes}</dd></div>
                <div><dt>شکرک</dt><dd>{c.crystal}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <small className="sv-note wrap">رنگ و طعم هر برداشت به فصل، منطقه و ترکیب گل‌ها بستگی دارد. این راهنما کلی است، نه مشخصات یک محصول خاص.</small>
      </section>

      <section className="sv-truths wrap" id="truths">
        <header className="sv-head" data-reveal="heading"><span className="sv-index" dir="ltr">05</span><h2>عسل طبیعی؛ باور یا واقعیت؟</h2><p>روی هر کارت بزنید تا واقعیت را ببینید.</p></header>
        <div className="sv-truth-grid">
          {truths.map((t, i) => (
            <button key={t.myth} className={"sv-truth" + (flipped === i ? " is-flipped" : "") + (t.warn ? " is-warn" : "")} aria-pressed={flipped === i} onClick={() => setFlipped(flipped === i ? null : i)} data-reveal="card">
              <span className="sv-truth-inner">
                <span className="sv-truth-face front"><small>باور رایج</small><strong>{t.myth}</strong><span className="sv-flip">دیدن واقعیت <Icon name="arrow" size={16} /></span></span>
                <span className="sv-truth-face back"><Icon name={t.icon} size={26} /><small>{t.warn ? "نکتهٔ مهم" : "واقعیت"}</small><span>{t.fact}</span></span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="sv-ritual" id="ritual">
        <div className="wrap">
          <header className="sv-head" data-reveal="heading"><span className="sv-index" dir="ltr">06</span><h2>چطور نگهش داریم؟</h2><p>عسل اگر درست نگه‌داری شود، سال‌ها طعمش را حفظ می‌کند.</p></header>
          <div className="sv-ritual-grid">{ritual.map((r) => <div className="sv-ritual-item" key={r.title} data-reveal="card"><span><Icon name={r.icon} size={26} /></span><h3>{r.title}</h3><p>{r.text}</p></div>)}</div>
        </div>
      </section>

      <section className="sv-finale wrap">
        <span className="sv-finale-hex" aria-hidden="true"><HexMark /></span>
        <h2 data-reveal="heading">حالا نوبت شماست<br /><em>که طعمِ خودتان را پیدا کنید.</em></h2>
        {picks.length > 0 && (
          <div className="sv-picks">
            {picks.map((p: any) => { const v = bestVariant(p); return (
              <Link className="sv-pick" key={p.id} to={"/products/" + p.slug} data-reveal="card">
                {p.images?.[0] ? <SoftImage src={p.images[0].image} alt={p.images[0].alt || p.name} /> : profileOf(p) ? <HoneyArt h={profileOf(p)!} name={p.name} /> : null}
                <span><strong>{p.name}</strong><small>{v ? "از " + fa(v.current_price) + " تومان" : ""}</small></span>
              </Link>
            ); })}
          </div>
        )}
        <div className="sv-finale-actions">
          <Link className="button gold" to="/products">رفتن به فروشگاه</Link>
          <Link className="text-button" to="/journal">خواندن مجلهٔ ارکام</Link>
        </div>
      </section>
    </main>
  );
}
