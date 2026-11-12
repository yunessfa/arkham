import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, fa } from "../api";
import { useApp } from "../appContext";
import { HexMark } from "../components/Atelier";
import { BeeMark } from "../story/Bee";
import { Icon, type IconName } from "../v8/icons";
import { weightLabel } from "../v8/Shop";
import { Flower, HoneyArt } from "./Flora";
import { allProducts, BUDGETS, COLORS, emptyAnswers, NEEDS, PURPOSES, recommend, TASTES, WEIGHTS, type Answers, type Pick } from "./honey";
import beeComb from "./assets/bee-comb.webp";

type Step = { key: keyof Answers; title: string; hint: string; multi: boolean; max?: number };
export const STEPS: Step[] = [
  { key: "purposes", title: "عسل را برای چه کاری می‌خواهید؟", hint: "تا دو گزینه انتخاب کنید.", multi: true, max: 2 },
  { key: "tastes", title: "چه طعمی را دوست دارید؟", hint: "هر چند تا که دوست دارید.", multi: true },
  { key: "needs", title: "نیاز یا دغدغهٔ خاصی دارید؟", hint: "اختیاری؛ بر پایهٔ طب سنتی پیشنهاد می‌دهیم.", multi: true, max: 3 },
  { key: "colors", title: "چه رنگی را ترجیح می‌دهید؟", hint: "رنگ عسل از گل منبعش می‌آید، نه از کیفیتش.", multi: true },
  { key: "weight", title: "چه وزنی می‌خواهید؟", hint: "قیمت‌ها را بر اساس همین وزن مقایسه می‌کنیم.", multi: false },
  { key: "budget", title: "بودجه‌تان چقدر است؟", hint: "برای وزنی که انتخاب کردید.", multi: false },
];

function options(key: keyof Answers): { value: string; label: string; note?: string; icon?: IconName; swatch?: [string, string] }[] {
  switch (key) {
    case "purposes": return PURPOSES.map(([value, label, icon]) => ({ value, label, icon: icon as IconName }));
    case "tastes": return TASTES.map(([value, label, note]) => ({ value, label, note }));
    case "needs": return NEEDS.map(([value, label]) => ({ value, label }));
    case "colors": return COLORS.map(([value, label, a, b]) => ({ value, label, swatch: [a, b] }));
    case "weight": return WEIGHTS.map(([value, label]) => ({ value, label }));
    case "budget": return BUDGETS.map(([value, label, note]) => ({ value, label, note }));
  }
}

/** One question with tappable cards. Shared by the finder and signup. */
export function Question({ step, answers, onChange }: { step: Step; answers: Answers; onChange: (a: Answers) => void }) {
  const value = answers[step.key];
  const chosen = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  const toggle = (v: string) => {
    if (!Array.isArray(value)) return onChange({ ...answers, [step.key]: v });
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v].slice(-(step.max || 99));
    onChange({ ...answers, [step.key]: next });
  };
  const opts = options(step.key);
  return (
    <fieldset className={"q-options q-" + step.key}>
      <legend className="visually-hidden">{step.title}</legend>
      {opts.map((o) => (
        <button type="button" key={o.value} className="q-option" aria-pressed={chosen(o.value)} onClick={() => toggle(o.value)}>
          {o.swatch ? <span className="q-swatch" style={{ "--a": o.swatch[0], "--b": o.swatch[1] } as any} aria-hidden="true" /> : o.icon ? <span className="q-icon"><Icon name={o.icon} size={20} /></span> : null}
          <span className="q-text"><strong>{o.label}</strong>{o.note && <small>{o.note}</small>}</span>
          <span className="q-check" aria-hidden="true"><Icon name="check" size={16} /></span>
        </button>
      ))}
      {step.key === "needs" && value.includes("sugar") && <p className="q-caution">همهٔ عسل‌ها قند دارند. عسل‌های دیررس فروکتوز بیشتری دارند، اما اگر دیابت دارید نوع و مقدار مصرف را با پزشک خود تنظیم کنید.</p>}
    </fieldset>
  );
}

function ResultCard({ pick, top = false, weight }: { pick: Pick; top?: boolean; weight: string }) {
  const { add } = useApp();
  const { product: p, profile: h, variant: v } = pick;
  const out = !v || v.available < 1;
  return (
    <article className={"f-result" + (top ? " is-top" : "")}>
      <Link to={"/products/" + p.slug} className="f-result-media" aria-label={p.name}>
        {p.images?.[0] ? <img src={p.images[0].image} alt="" loading="lazy" /> : <HoneyArt h={h} name={p.name} />}
        {top && <span className="f-badge"><BeeMark /> بهترین انتخاب برای شما</span>}
      </Link>
      <div className="f-result-body">
        <span className="f-kicker">گل {h.flower} · {h.region}</span>
        <h3><Link to={"/products/" + p.slug}>{p.name}</Link></h3>
        {top && <p className="f-plant">{h.plant}</p>}
        {pick.reasons.length > 0 && <ul className="f-reasons">{pick.reasons.map((r) => <li key={r}><Icon name="check" size={14} />{r}</li>)}</ul>}
        <div className="f-taste">{h.taste.map((t) => <span key={t}>{t}</span>)}</div>
        <div className="f-buy">
          <div><small>{v ? weightLabel(v.weight_g) : ""}{weight && v && String(v.weight_g) !== weight ? " (نزدیک‌ترین وزن)" : ""}</small><strong>{v ? fa(v.current_price) : "—"} <small>تومان</small></strong></div>
          {out ? <span className="f-out">فعلاً ناموجود</span> : <button className="gold" onClick={() => add(v.id)}>افزودن به سبد</button>}
          <Link className="text-button" to={"/products/" + p.slug}>جزئیات و گل<Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    </article>
  );
}

export default function HoneyFinder() {
  const { session } = useApp();
  const [answers, setAnswers] = useState<Answers>(() => { try { return { ...emptyAnswers(), ...JSON.parse(sessionStorage.getItem("arkham-finder") || "{}") }; } catch { return emptyAnswers(); } });
  const [step, setStep] = useState(-1);
  const [products, setProducts] = useState<any[] | null>(null), [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { allProducts().then(setProducts).catch((e) => setError(e.message)); }, []);
  useEffect(() => { try { sessionStorage.setItem("arkham-finder", JSON.stringify(answers)); } catch {} }, [answers]);
  // Signed-in visitors start from the taste they saved at signup.
  useEffect(() => { if (session?.authenticated) api("accounts/profile/").then((d) => { const pr = d?.preferences; if (pr && Object.keys(pr).length) setAnswers((a) => (a.purposes.length || a.tastes.length ? a : { ...emptyAnswers(), ...pr })); }).catch(() => {}); }, [session?.authenticated]);
  useEffect(() => { if (step >= 0) top.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [step]);
  const picks = useMemo(() => (products ? recommend(products, answers) : []), [products, answers]);
  const done = step >= STEPS.length;
  const current = STEPS[step];
  async function save() {
    try { await api("accounts/profile/", "POST", { preferences: answers }); setSaved("سلیقهٔ شما در حساب ذخیره شد."); } catch (e: any) { setSaved(e.message); }
  }
  return (
    <main className="page finder-page" ref={top as any}>
      {step < 0 && (
        <section className="finder-intro">
          <div className="fi-media"><img src={beeComb} alt="زنبور عسل روی شان عسل" /><span className="fi-shade" /></div>
          <div className="fi-copy wrap">
            <span className="fi-kicker" dir="ltr">ARKHAM · HONEY FINDER</span>
            <h1 tabIndex={-1}>عسل‌یاب ارکام</h1>
            <p>شش سؤال کوتاه؛ دربارهٔ کاربرد، طعم، رنگ، وزن و بودجه. از میان {products ? fa(products.length) : "همهٔ"} عسل ارکام، آن‌هایی را پیدا می‌کنیم که برای شما ساخته شده‌اند و نشانتان می‌دهیم از کدام گل آمده‌اند.</p>
            <div className="fi-flowers" aria-hidden="true">{["spike", "blossom", "umbel", "pea", "globe"].map((k, i) => <Flower key={k} kind={k} color={["#a77cc9", "#fffdf4", "#f0d35b", "#f2c94c", "#7f8fd8"][i]} seed={k} />)}</div>
            <button className="gold fi-start" onClick={() => setStep(0)}>شروع کنیم<Icon name="arrow" size={18} /></button>
            <small className="muted">حدود یک دقیقه وقت می‌گیرد.</small>
          </div>
        </section>
      )}
      {step >= 0 && !done && current && (
        <section className="finder-step wrap" key={step}>
          <div className="fq-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="پیشرفت پرسش‌ها">
            {STEPS.map((_, i) => <i key={i} className={i <= step ? "on" : ""} />)}
          </div>
          <span className="fq-count">سؤال {fa(step + 1)} از {fa(STEPS.length)}</span>
          <h2 tabIndex={-1}>{current.title}</h2>
          <p className="muted">{current.hint}</p>
          <Question step={current} answers={answers} onChange={setAnswers} />
          <div className="fq-actions">
            <button className="gold" onClick={() => setStep(step + 1)}>{step === STEPS.length - 1 ? "دیدن پیشنهادها" : "بعدی"}</button>
            <button className="text-button" onClick={() => setStep(step - 1)}>{step === 0 ? "بازگشت" : "سؤال قبلی"}</button>
          </div>
        </section>
      )}
      {done && (
        <section className="finder-results wrap">
          <header className="fr-head">
            <span className="fr-hex" aria-hidden="true"><HexMark /></span>
            <span className="fi-kicker" dir="ltr">YOUR HONEY</span>
            <h2 tabIndex={-1}>این عسل‌ها برای شما انتخاب شدند</h2>
            <p className="muted">بر پایهٔ پاسخ‌هایتان، از بیشترین تطابق به کمترین.</p>
          </header>
          {error && <p className="error" role="alert">{error}</p>}
          {!products && !error && <p role="status">در حال گشتن میان کندوها…</p>}
          {products && picks.length > 0 && (
            <>
              <ResultCard pick={picks[0]} top weight={answers.weight} />
              <div className="f-more">{picks.slice(1, 5).map((x) => <ResultCard key={x.product.id} pick={x} weight={answers.weight} />)}</div>
            </>
          )}
          <div className="fr-actions">
            <button className="text-button" onClick={() => setStep(0)}><Icon name="back" size={16} />تغییر پاسخ‌ها</button>
            <button className="text-button" onClick={() => { setAnswers(emptyAnswers()); setStep(0); }}>از نو</button>
            {session?.authenticated ? <button className="text-button" onClick={save}><Icon name="heart" size={16} />ذخیرهٔ سلیقه در حسابم</button> : <Link className="text-button" to="/login?next=/welcome">با ثبت‌نام، سلیقه‌تان را نگه دارید</Link>}
            <Link className="text-button" to="/products">همهٔ عسل‌ها</Link>
          </div>
          {saved && <p className="success" role="status">{saved}</p>}
          <p className="fr-note">پیشنهادها بر پایهٔ طعم، کاربرد و طب سنتی است و جایگزین توصیهٔ پزشک نیست. عسل برای کودکان زیر یک سال مناسب نیست.</p>
        </section>
      )}
    </main>
  );
}
