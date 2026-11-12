import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, date, fa, money, rows, statuses } from "../api";
import { useApp, useData } from "../appContext";
import { HexMark } from "../components/Atelier";
import { BeeMark } from "../story/Bee";
import { Icon } from "../v8/icons";
import { HoneyLoader } from "../v8/Shop";
import { AddressForm } from "../v8/Checkout";
import { HoneyArt } from "./Flora";
import { Question, STEPS } from "./Finder";
import { allProducts, BUDGETS, COLORS, emptyAnswers, needLabel, purposeLabel, recommend, TASTES, type Answers } from "./honey";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/welcome") ? n : "/account");

function useProfile() {
  const [profile, setProfile] = useState<any>(null), [error, setError] = useState("");
  const load = () => api("accounts/profile/").then(setProfile).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  return { profile, setProfile, error, reload: load };
}

function Guard({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  if (!session) return <main className="page wrap"><HoneyLoader /></main>;
  if (!session.authenticated) return <Navigate to={"/login?next=" + encodeURIComponent(location.pathname + location.search)} replace />;
  return <>{children}</>;
}

const WSTEPS = ["دربارهٔ شما", "کاربرد و طعم", "نیاز و رنگ", "آدرس ارسال", "تمام"];

function Personal({ profile, onSaved }: { profile: any; onSaved: (p: any) => void }) {
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [month, day] = (profile.birthday || "-").split("-");
  return (
    <form className="w-form" onSubmit={async (e) => {
      e.preventDefault(); setErr(""); setBusy(true);
      const d = new FormData(e.currentTarget);
      const m = String(d.get("month") || ""), dd = String(d.get("day") || "");
      try {
        const p = await api("accounts/profile/", "POST", {
          first_name: String(d.get("first_name") || "").trim(), last_name: String(d.get("last_name") || "").trim(),
          phone: toLatin(String(d.get("phone") || "")), email: String(d.get("email") || "").trim(),
          birthday: m && dd ? m.padStart(2, "0") + "-" + dd.padStart(2, "0") : "", marketing: d.get("marketing") === "on",
        });
        onSaved(p);
      } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
    }}>
      <div className="form-two">
        <label className="field"><span>نام</span><input name="first_name" defaultValue={profile.first_name} required minLength={2} maxLength={100} autoComplete="given-name" /></label>
        <label className="field"><span>نام خانوادگی</span><input name="last_name" defaultValue={profile.last_name} maxLength={150} autoComplete="family-name" /></label>
        <label className="field"><span>شمارهٔ موبایل</span><input name="phone" defaultValue={profile.phone} required type="tel" inputMode="numeric" dir="ltr" placeholder="09121234567" autoComplete="tel" /></label>
        <label className="field"><span>ایمیل <small className="muted">(اختیاری)</small></span><input name="email" type="email" defaultValue={profile.email} dir="ltr" autoComplete="email" /></label>
      </div>
      <fieldset className="w-birthday"><legend>روز تولد <small className="muted">(اختیاری؛ برای هدیهٔ تولد)</small></legend>
        <select name="day" defaultValue={day ? String(Number(day)) : ""} aria-label="روز"><option value="">روز</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{fa(i + 1)}</option>)}</select>
        <select name="month" defaultValue={month ? String(Number(month)) : ""} aria-label="ماه"><option value="">ماه</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
      </fieldset>
      <label className="check w-check"><input type="checkbox" name="marketing" defaultChecked={profile.marketing} />خبر برداشت‌های تازه و تخفیف‌ها را برایم بفرستید.</label>
      <button className="gold wide" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره و ادامه"}</button>
      {err && <p className="error" role="alert">{err}</p>}
    </form>
  );
}

function TastePart({ keys, answers, setAnswers }: { keys: (keyof Answers)[]; answers: Answers; setAnswers: (a: Answers) => void }) {
  return <>{STEPS.filter((s) => keys.includes(s.key)).map((s) => <div className="w-q" key={s.key}><h3>{s.title}</h3><p className="muted small">{s.hint}</p><Question step={s} answers={answers} onChange={setAnswers} /></div>)}</>;
}

export function Welcome() { return <Guard><WelcomeBody /></Guard>; }

function WelcomeBody() {
  const { refresh } = useApp();
  const nav = useNavigate(), [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { profile, setProfile, error } = useProfile();
  const [step, setStep] = useState(Number(params.get("step") || 0));
  const [answers, setAnswers] = useState<Answers>(emptyAnswers());
  const [products, setProducts] = useState<any[]>([]), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { if (profile?.preferences) setAnswers({ ...emptyAnswers(), ...profile.preferences }); }, [profile === null]);
  useEffect(() => { allProducts().then(setProducts).catch(() => {}); }, []);
  useEffect(() => { scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  const picks = useMemo(() => recommend(products, answers).slice(0, 3), [products, answers]);
  async function saveTaste(last = false) {
    setBusy(true); setErr("");
    try { const p = await api("accounts/profile/", "POST", { preferences: answers, ...(last ? { complete: true } : {}) }); setProfile(p); setStep(step + 1); if (last) refresh(); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  if (error) return <main className="page wrap"><p className="error">{error}</p></main>;
  if (!profile) return <main className="page wrap"><HoneyLoader /></main>;
  return (
    <main className="page wrap welcome-page">
      <header className="w-head">
        <span className="w-bee" aria-hidden="true"><BeeMark /></span>
        <span className="w-kicker" dir="ltr">WELCOME TO THE HIVE</span>
        <h1 tabIndex={-1}>{step === 0 ? "به کندوی ارکام خوش آمدید" : step >= 4 ? "پروفایل شما کامل شد" : WSTEPS[step]}</h1>
        <ol className="w-steps" aria-label="مراحل ثبت‌نام">{WSTEPS.map((s, i) => <li key={s} className={i < step || step >= 4 ? "is-done" : i === step ? "is-current" : ""} aria-current={i === step ? "step" : undefined}><b>{i < step || step >= 4 ? <Icon name="check" size={14} /> : fa(i + 1)}</b><span>{s}</span></li>)}</ol>
      </header>
      <div className="w-card">
        {step === 0 && <><p className="w-lede">چند اطلاعات کوتاه تا سفارش‌ها سریع‌تر ثبت شوند و عسل‌هایی را نشانتان بدهیم که به سلیقه‌تان نزدیک‌ترند.</p><Personal profile={profile} onSaved={(p) => { setProfile(p); refresh(); setStep(1); }} /></>}
        {step === 1 && <><TastePart keys={["purposes", "tastes"]} answers={answers} setAnswers={setAnswers} /><div className="w-actions"><button className="gold" disabled={busy} onClick={() => saveTaste()}>ادامه</button><button className="text-button" onClick={() => setStep(0)}>مرحلهٔ قبل</button></div></>}
        {step === 2 && <><TastePart keys={["needs", "colors", "budget"]} answers={answers} setAnswers={setAnswers} /><div className="w-actions"><button className="gold" disabled={busy} onClick={() => saveTaste()}>ادامه</button><button className="text-button" onClick={() => setStep(1)}>مرحلهٔ قبل</button></div></>}
        {step === 3 && <><p className="w-lede">آدرسی که بیشتر سفارش‌ها به آن ارسال می‌شود. بعداً می‌توانید آدرس‌های دیگری هم اضافه کنید.</p><AddressForm onSaved={() => saveTaste(true)} onCancel={() => saveTaste(true)} /><p className="muted small">«انصراف» یعنی فعلاً بدون آدرس ادامه می‌دهید.</p></>}
        {step >= 4 && (
          <div className="w-done">
            <span className="w-done-hex" aria-hidden="true"><HexMark /></span>
            <p className="w-lede">{profile.first_name ? profile.first_name + " عزیز، " : ""}بر اساس سلیقه‌تان این‌ها را برایتان کنار گذاشته‌ایم:</p>
            <div className="w-picks">{picks.map((x) => <Link key={x.product.id} to={"/products/" + x.product.slug} className="w-pick">{x.product.images?.[0] ? <img src={x.product.images[0].image} alt="" /> : <HoneyArt h={x.profile} name={x.product.name} />}<strong>{x.product.name}</strong><small>گل {x.profile.flower}</small></Link>)}</div>
            <div className="w-actions"><button className="gold" onClick={() => nav(next)}>{next === "/account" ? "رفتن به حساب من" : "ادامهٔ خرید"}</button><Link className="text-button" to="/honey-finder">عسل‌یاب کامل</Link></div>
          </div>
        )}
        {err && <p className="error" role="alert">{err}</p>}
      </div>
      {step > 0 && step < 4 && <button className="text-button w-skip" onClick={() => nav(next)}>بعداً تکمیل می‌کنم</button>}
    </main>
  );
}

/* ---------------------------------------------------------------- account */
export function AccountPage() { return <Guard><AccountBody /></Guard>; }

function AccountBody() {
  const { session, refresh, run } = useApp();
  const { profile } = useProfile();
  const orders = useData("orders/"), addresses = useData("addresses/"), notifications = useData("notifications/");
  const [products, setProducts] = useState<any[]>([]), [adding, setAdding] = useState(false);
  useEffect(() => { allProducts().then(setProducts).catch(() => {}); }, []);
  const prefs: Answers = { ...emptyAnswers(), ...(profile?.preferences || {}) };
  const hasTaste = prefs.purposes.length + prefs.tastes.length + prefs.needs.length + prefs.colors.length > 0;
  const picks = useMemo(() => (hasTaste ? recommend(products, prefs).slice(0, 4) : []), [products, profile]);
  const filled = profile ? [profile.first_name, profile.last_name, profile.phone, hasTaste, rows(addresses.data).length > 0].filter(Boolean).length : 0;
  const unread = (Array.isArray(notifications.data) ? notifications.data : []).filter((n: any) => !n.read);
  const tasteChips = [...prefs.purposes.map(purposeLabel), ...prefs.tastes.map((t) => TASTES.find((x) => x[0] === t)?.[1] || t), ...prefs.needs.map(needLabel), ...prefs.colors.map((c) => "رنگ " + (COLORS.find((x) => x[0] === c)?.[1] || c)), ...(prefs.budget ? ["بودجهٔ " + BUDGETS.find((b) => b[0] === prefs.budget)?.[1]] : [])];
  return (
    <main className="page wrap account-v9">
      <header className="acc-head">
        <span className="acc-avatar" aria-hidden="true">{(profile?.first_name || session.user.first_name || "؟").slice(0, 1)}</span>
        <div>
          <span className="acc-kicker">حساب من</span>
          <h1 tabIndex={-1}>سلام {profile?.first_name || session.user.first_name || ""}</h1>
          {profile?.phone && <small dir="ltr">{String(profile.phone).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d])}</small>}
        </div>
        <button className="text-button acc-logout" onClick={() => run(async () => { await api("accounts/logout/", "POST", {}); refresh(); })}>خروج</button>
      </header>
      {profile && filled < 5 && (
        <Link className="acc-complete" to="/welcome?next=/account">
          <span className="acc-ring" style={{ "--p": filled / 5 } as any}><b>{fa(Math.round((filled / 5) * 100))}٪</b></span>
          <span><strong>پروفایلتان را کامل کنید</strong><small>سلیقه و آدرس را ثبت کنید تا پیشنهادها دقیق‌تر و خرید سریع‌تر شود.</small></span>
          <Icon name="arrow" size={18} />
        </Link>
      )}
      <section className="acc-section">
        <div className="acc-section-head"><h2>سلیقهٔ من</h2><Link className="text-button" to="/welcome?step=1&next=/account">{hasTaste ? "ویرایش" : "ثبت سلیقه"}</Link></div>
        {hasTaste ? <div className="acc-chips">{tasteChips.map((c) => <span key={c}>{c}</span>)}</div> : <p className="muted">هنوز سلیقه‌ای ثبت نکرده‌اید. با چند انتخاب ساده، عسل‌های مناسب شما را پیدا می‌کنیم.</p>}
        {picks.length > 0 && <div className="acc-picks">{picks.map((x) => <Link key={x.product.id} to={"/products/" + x.product.slug} className="w-pick">{x.product.images?.[0] ? <img src={x.product.images[0].image} alt="" /> : <HoneyArt h={x.profile} name={x.product.name} />}<strong>{x.product.name}</strong><small>{x.reasons[0] || "گل " + x.profile.flower}</small></Link>)}</div>}
      </section>
      <section className="acc-section">
        <div className="acc-section-head"><h2>سفارش‌های من</h2><Link className="text-button" to="/track">پیگیری با کد</Link></div>
        {!orders.data ? <HoneyLoader inline /> : rows(orders.data).length ? <ul className="acc-orders">{rows(orders.data).map((o: any) => <li key={o.id}><Link to={"/orders/" + o.id}><span><strong>{statuses[o.status] || o.status}</strong><small>{date(o.created_at)}</small></span><b>{money(o.total)}</b><Icon name="arrow" size={16} /></Link></li>)}</ul> : <p className="muted">هنوز سفارشی ثبت نکرده‌اید. <Link to="/products">سری به فروشگاه بزنید</Link>.</p>}
      </section>
      <section className="acc-section">
        <div className="acc-section-head"><h2>آدرس‌ها</h2>{!adding && <button className="text-button" onClick={() => setAdding(true)}><Icon name="plus" size={16} />آدرس تازه</button>}</div>
        <ul className="acc-addresses">{rows(addresses.data).map((a: any) => <li key={a.id}><Icon name="truck" size={20} /><span><strong>{a.recipient}</strong><small>{a.province}، {a.city}، {a.street}</small></span><button className="text-button" onClick={() => run(async () => { await api("addresses/" + a.id + "/", "DELETE"); addresses.reload(); })}>حذف</button></li>)}</ul>
        {adding && <AddressForm onSaved={() => { setAdding(false); addresses.reload(); }} onCancel={() => setAdding(false)} />}
      </section>
      {unread.length > 0 && (
        <section className="acc-section">
          <h2>پیام‌های تازه</h2>
          <ul className="acc-notes">{unread.map((n: any) => <li key={n.id}><p>{n.text}</p><button className="text-button" onClick={() => run(async () => { await api("notifications/", "POST", { id: n.id }); notifications.reload(); })}>خواندم</button></li>)}</ul>
        </section>
      )}
      <nav className="acc-links">
        <Link to="/favorites"><Icon name="heart" size={20} />علاقه‌مندی‌ها</Link>
        <Link to="/welcome?next=/account"><Icon name="user" size={20} />ویرایش اطلاعات</Link>
        <Link to="/honey-finder"><Icon name="search" size={20} />عسل‌یاب</Link>
        {session.user.is_staff && <Link to="/manage"><Icon name="shield" size={20} />پنل مدیریت</Link>}
        <button onClick={() => run(() => api("newsletter/", "DELETE"), "اشتراک خبرنامه غیرفعال شد.")}><Icon name="close" size={20} />لغو خبرنامه</button>
      </nav>
    </main>
  );
}
