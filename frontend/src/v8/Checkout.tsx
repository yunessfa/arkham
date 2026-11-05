import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, fa, money, rows } from "../api";
import { useApp, useData } from "../appContext";
import { BrandedFallback, HexMark } from "../components/Atelier";
import { Icon } from "./icons";
import { HoneyLoader, QtyStepper, weightLabel } from "./Shop";

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/account");

/* ------------------------------------------------------------------ login */
export function PhoneLogin({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const { refresh, session } = useApp();
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState(""), [code, setCode] = useState(""), [name, setName] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [wait, setWait] = useState(0), [debug, setDebug] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);
  async function requestCode() {
    setErr(""); setBusy(true);
    try { const d = await api("accounts/phone/code/", "POST", { phone: toLatin(phone) }); setPhone(d.phone); setWait(d.resend_after || 60); setDebug(d.debug_code || ""); setCode(""); setStep("code"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function verify(value = code) {
    if (busy) return;
    setErr(""); setBusy(true);
    try { const d = await api("accounts/phone/verify/", "POST", { phone, code: toLatin(value) }); await refresh(); if (d.needs_name) setStep("name"); else onDone(); }
    catch (e: any) { setErr(e.message); setCode(""); } finally { setBusy(false); }
  }
  if (!session?.phone_login) return null;
  return (
    <div className={"otp" + (compact ? " is-compact" : "")}>
      {step === "phone" && (
        <form onSubmit={(e) => { e.preventDefault(); requestCode(); }}>
          <label className="field">
            <span>شمارهٔ موبایل</span>
            <div className="field-affix"><Icon name="phone" size={20} /><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" autoComplete="tel" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" dir="ltr" required maxLength={16} autoFocus={!compact} /></div>
          </label>
          <button className="gold wide" disabled={busy}>{busy ? "در حال ارسال کد…" : "دریافت کد ورود"}</button>
          <p className="muted small">ورود و ثبت‌نام یکی است؛ اگر حساب نداشته باشید، با همین شماره ساخته می‌شود.</p>
        </form>
      )}
      {step === "code" && (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <p className="otp-sent">کد ۵ رقمی به <b dir="ltr">{phone}</b> پیامک شد. <button type="button" className="text-button" onClick={() => setStep("phone")}>ویرایش شماره</button></p>
          {debug && <p className="notice small">محیط آزمایشی — کد: <b dir="ltr">{debug}</b></p>}
          <div className="otp-boxes" onClick={() => codeRef.current?.focus()}>
            <input ref={codeRef} className="otp-input" value={code} onChange={(e) => { const v = toLatin(e.target.value).replace(/\D/g, "").slice(0, 5); setCode(v); if (v.length === 5) verify(v); }} inputMode="numeric" autoComplete="one-time-code" aria-label="کد تأیید" dir="ltr" maxLength={5} />
            {Array.from({ length: 5 }, (_, i) => <span key={i} className={(i < code.length ? "is-filled " : "") + (i === code.length ? "is-current" : "")} aria-hidden="true">{code[i] ? fa(code[i]) : ""}</span>)}
          </div>
          <button className="gold wide" disabled={busy || code.length !== 5}>{busy ? "در حال بررسی…" : "تأیید و ورود"}</button>
          <button type="button" className="text-button" disabled={wait > 0 || busy} onClick={requestCode}>{wait > 0 ? "ارسال دوباره تا " + fa(wait) + " ثانیهٔ دیگر" : "ارسال دوبارهٔ کد"}</button>
        </form>
      )}
      {step === "name" && (
        <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { await api("accounts/profile/", "POST", { first_name: name }); await refresh(); onDone(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }}>
          <p className="otp-sent">خوش آمدید! برای سفارش‌ها شما را چه صدا کنیم؟</p>
          <label className="field"><span>نام</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required minLength={2} maxLength={100} autoFocus /></label>
          <button className="gold wide" disabled={busy}>ذخیره و ادامه</button>
          <button type="button" className="text-button" onClick={onDone}>بعداً</button>
        </form>
      )}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}

function PasswordLogin({ onDone }: { onDone: () => void }) {
  const { refresh } = useApp();
  const [register, setRegister] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  return (
    <form className="password-login" key={String(register)} onSubmit={async (e) => {
      e.preventDefault(); setErr(""); setBusy(true);
      try { await api("accounts/" + (register ? "register" : "login") + "/", "POST", Object.fromEntries(new FormData(e.currentTarget))); await refresh(); onDone(); }
      catch (x: any) { setErr(x.message); } finally { setBusy(false); }
    }}>
      <label className="field"><span>نام کاربری</span><input name="username" autoComplete="username" required pattern="[a-zA-Z0-9_.@+\-]{3,150}" dir="ltr" /></label>
      {register && <>
        <label className="field"><span>نام</span><input name="first_name" autoComplete="given-name" required maxLength={100} /></label>
        <label className="field"><span>ایمیل</span><input name="email" type="email" autoComplete="email" required dir="ltr" /></label>
      </>}
      <label className="field"><span>رمز عبور</span><input name="password" type="password" required minLength={register ? 12 : 1} maxLength={128} autoComplete={register ? "new-password" : "current-password"} dir="ltr" /></label>
      {register && <p className="muted small">حداقل ۱۲ نویسه؛ رمز متداول یا تمام‌عددی پذیرفته نمی‌شود.</p>}
      <button className="gold wide" disabled={busy}>{busy ? "…" : register ? "ساخت حساب" : "ورود"}</button>
      <button type="button" className="text-button" onClick={() => setRegister(!register)}>{register ? "حساب دارید؟ ورود" : "ساخت حساب با نام کاربری"}</button>
      {err && <p className="error" role="alert">{err}</p>}
    </form>
  );
}

export function LoginPanel({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const { session } = useApp();
  const [mode, setMode] = useState<"phone" | "password">("phone");
  const phone = !!session?.phone_login;
  const active = phone ? mode : "password";
  return (
    <div className="login-panel">
      {phone && (
        <div className="segmented" role="tablist" aria-label="روش ورود">
          <button role="tab" aria-selected={active === "phone"} onClick={() => setMode("phone")}>با کد پیامکی</button>
          <button role="tab" aria-selected={active === "password"} onClick={() => setMode("password")}>با رمز عبور</button>
        </div>
      )}
      {active === "phone" ? <PhoneLogin onDone={onDone} compact={compact} /> : <PasswordLogin onDone={onDone} />}
    </div>
  );
}

export function LoginPage() {
  const nav = useNavigate(), [params] = useSearchParams();
  const { session } = useApp();
  const next = safeNext(params.get("next"));
  useEffect(() => { if (session?.authenticated) nav(next, { replace: true }); }, [session?.authenticated]);
  return (
    <main className="page wrap auth-page">
      <div className="auth-card">
        <span className="auth-hex" aria-hidden="true"><HexMark /></span>
        <span className="auth-kicker" dir="ltr">WELCOME TO THE HIVE</span>
        <h1 tabIndex={-1}>ورود به ارکام</h1>
        <p className="muted">برای ثبت سفارش، پیگیری و ذخیرهٔ علاقه‌مندی‌ها.</p>
        <LoginPanel onDone={() => nav(next, { replace: true })} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------- cart */
export function CartPage() {
  const { cart, refreshCart, run } = useApp();
  const [pending, setPending] = useState<number | null>(null);
  async function setQty(variant: number, quantity: number) {
    setPending(variant);
    await run(async () => { await api("cart/", "POST", { variant, quantity }); await refreshCart(); });
    setPending(null);
  }
  const items = cart?.items || [];
  const count = items.reduce((s: number, i: any) => s + i.quantity, 0);
  return (
    <main className="page wrap cart-page">
      <header className="flow-head"><h1 tabIndex={-1}>سبد خرید</h1>{count > 0 && <span>{fa(count)} کالا</span>}</header>
      {!cart ? <HoneyLoader label="در حال دریافت سبد…" /> : !items.length ? (
        <div className="shop-empty">
          <span aria-hidden="true"><Icon name="bag" size={42} /></span>
          <h2>سبد شما هنوز خالی است</h2>
          <p>یک شیشه عسل، شروع خوبی برای هر صبح است.</p>
          <Link className="button gold" to="/products">رفتن به فروشگاه</Link>
        </div>
      ) : (
        <div className="flow-grid">
          <ul className="cart-list">
            {items.map((i: any) => (
              <li key={i.variant} className={"cart-item" + (pending === i.variant ? " is-pending" : "") + (i.available < i.quantity || !i.active ? " has-problem" : "")}>
                <Link to={"/products/" + i.slug} className="cart-thumb">{i.image ? <img src={i.image} alt="" loading="lazy" /> : <BrandedFallback label="" />}</Link>
                <div className="cart-info">
                  <Link to={"/products/" + i.slug}><strong>{i.product}</strong></Link>
                  <span className="muted">{weightLabel(i.weight_g)} · {money(i.price)}</span>
                  {(!i.active || i.available < i.quantity) && <span className="error small">{!i.active ? "این کالا دیگر فروخته نمی‌شود." : "موجودی کافی نیست؛ حداکثر " + fa(Math.max(0, i.available))}</span>}
                  <div className="cart-controls">
                    <QtyStepper value={i.quantity} max={Math.max(i.quantity, i.available)} onChange={(n) => setQty(i.variant, n)} disabled={pending === i.variant} />
                    <button className="text-button remove" onClick={() => setQty(i.variant, 0)} aria-label={"حذف " + i.product}>حذف</button>
                  </div>
                </div>
                <strong className="cart-line">{fa(i.line_total)}<small> تومان</small></strong>
              </li>
            ))}
          </ul>
          <aside className="summary-card">
            <h2>خلاصهٔ سفارش</h2>
            <div className="sum-row"><span>جمع کالاها</span><strong>{money(cart.subtotal)}</strong></div>
            <div className="sum-row muted"><span>ارسال و تخفیف</span><span>در مرحلهٔ بعد</span></div>
            <Link className="button gold wide desktop-cta" to="/checkout">ادامه و انتخاب آدرس</Link>
            <Link className="text-button" to="/products">ادامهٔ خرید</Link>
          </aside>
          <div className="flow-dock">
            <div><small>جمع کالاها</small><strong>{fa(cart.subtotal)} <small>تومان</small></strong></div>
            <Link className="button gold" to="/checkout">ادامهٔ خرید</Link>
          </div>
        </div>
      )}
    </main>
  );
}

/* --------------------------------------------------------------- checkout */
function AddressForm({ onSaved, onCancel }: { onSaved: (id: number) => void; onCancel?: () => void }) {
  const provinces = useData("provinces/");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  return (
    <form className="address-form" onSubmit={async (e) => {
      e.preventDefault(); setErr(""); setBusy(true);
      try { const a = await api("addresses/", "POST", Object.fromEntries(new FormData(e.currentTarget))); onSaved(a.id); }
      catch (x: any) { setErr(x.message); } finally { setBusy(false); }
    }}>
      <div className="form-two">
        <label className="field"><span>نام گیرنده</span><input name="recipient" required maxLength={120} autoComplete="name" /></label>
        <label className="field"><span>موبایل گیرنده</span><input name="phone" required type="tel" inputMode="numeric" placeholder="09121234567" dir="ltr" autoComplete="tel" /></label>
        <label className="field"><span>استان</span><select name="province" required defaultValue=""><option value="" disabled>انتخاب استان</option>{rows(provinces.data).map((p: string) => <option key={p}>{p}</option>)}</select></label>
        <label className="field"><span>شهر</span><input name="city" required maxLength={80} autoComplete="address-level2" /></label>
      </div>
      <label className="field"><span>نشانی کامل</span><textarea name="street" required maxLength={600} rows={3} autoComplete="street-address" placeholder="خیابان، کوچه، پلاک، واحد" /></label>
      <label className="field"><span>کد پستی ۱۰ رقمی</span><input name="postal_code" required inputMode="numeric" dir="ltr" autoComplete="postal-code" /></label>
      <div className="form-actions"><button className="gold" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیرهٔ آدرس"}</button>{onCancel && <button type="button" className="text-button" onClick={onCancel}>انصراف</button>}</div>
      {err && <p className="error" role="alert">{err}</p>}
    </form>
  );
}

export function CheckoutPage() {
  const { session, cart, refreshCart } = useApp();
  const [params] = useSearchParams();
  const existing = params.get("order");
  if (existing) return null; // handled by the legacy order view
  if (!session) return <main className="page wrap"><HoneyLoader /></main>;
  if (!session.authenticated)
    return (
      <main className="page wrap checkout-page">
        <header className="flow-head"><h1 tabIndex={-1}>تسویه‌حساب</h1></header>
        <div className="step-card">
          <div className="step-title"><b>۱</b><h2>ورود سریع</h2></div>
          <p className="muted">برای ثبت سفارش و پیگیری آن، با شمارهٔ موبایل وارد شوید. سبدتان حفظ می‌شود.</p>
          <LoginPanel onDone={() => {}} compact />
        </div>
      </main>
    );
  return <CheckoutBody cart={cart} refreshCart={refreshCart} session={session} />;
}

function CheckoutBody({ cart, refreshCart, session }: any) {
  const nav = useNavigate();
  const addresses = useData("addresses/"), shipping = useData("shipping/");
  const [address, setAddress] = useState<number | null>(null), [method, setMethod] = useState<number | null>(null);
  const [coupon, setCoupon] = useState(""), [applied, setApplied] = useState(""), [adding, setAdding] = useState(false);
  const [quote, setQuote] = useState<any>(null), [agree, setAgree] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const list = rows(addresses.data), methods = rows(shipping.data);
  const chosen = list.find((a: any) => a.id === address);
  useEffect(() => { if (addresses.data && !address && list.length) setAddress(list[list.length - 1].id); if (addresses.data && !list.length) setAdding(true); }, [addresses.data]);
  useEffect(() => { if (!method && methods.length) { const ok = methods.find((m: any) => !m.provinces?.length || (chosen && m.provinces.includes(chosen.province))); if (ok) setMethod(ok.id); } }, [shipping.data, chosen?.id]);
  const body = useMemo(() => ({ ...(method ? { shipping: method } : {}), ...(address ? { address } : {}), coupon: applied }), [method, address, applied, cart?.subtotal]);
  useEffect(() => { let alive = true; api("checkout/quote/", "POST", body).then((q) => alive && setQuote(q)).catch(() => {}); return () => { alive = false; }; }, [JSON.stringify(body), cart?.subtotal]);
  const ready = !!(quote?.ready && address && method && agree && session?.payment_provider !== "disabled");
  async function submit() {
    if (!ready || busy) return;
    setBusy(true); setErr("");
    try { const o = await api("orders/", "POST", { address, shipping: method, coupon: applied, idempotency_key: key }); await refreshCart(); nav("/orders/" + o.id); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  if (cart && !cart.items.length) return <main className="page wrap checkout-page"><div className="shop-empty"><h2>سبد خرید خالی است</h2><Link className="button gold" to="/products">رفتن به فروشگاه</Link></div></main>;
  return (
    <main className="page wrap checkout-page">
      <header className="flow-head"><h1 tabIndex={-1}>تسویه‌حساب</h1><span>{fa(quote?.count || 0)} کالا</span></header>
      <div className="flow-grid">
        <div className="steps">
          <section className="step-card">
            <div className="step-title"><b>۱</b><h2>آدرس تحویل</h2>{list.length > 0 && !adding && <button className="text-button" onClick={() => setAdding(true)}>+ آدرس جدید</button>}</div>
            {addresses.data === null ? <HoneyLoader inline /> : (
              <>
                {!adding && <div className="choice-list">{list.map((a: any) => (
                  <label key={a.id} className="choice"><input type="radio" name="address" checked={address === a.id} onChange={() => setAddress(a.id)} /><span><strong>{a.recipient}</strong><small>{a.province}، {a.city} — {a.street}</small><small dir="ltr">{a.phone}</small></span></label>
                ))}</div>}
                {adding && <AddressForm onSaved={(id) => { addresses.reload(); setAddress(id); setAdding(false); }} onCancel={list.length ? () => setAdding(false) : undefined} />}
              </>
            )}
          </section>
          <section className="step-card">
            <div className="step-title"><b>۲</b><h2>روش ارسال</h2></div>
            <div className="choice-list">{methods.map((m: any) => {
              const blocked = !!(chosen && m.provinces?.length && !m.provinces.includes(chosen.province));
              return <label key={m.id} className={"choice" + (blocked ? " is-disabled" : "")}><input type="radio" name="shipping" disabled={blocked} checked={method === m.id} onChange={() => setMethod(m.id)} /><span><strong>{m.name}</strong><small>{blocked ? "به استان " + chosen.province + " ارسال نمی‌شود" : Number(m.cost) ? money(m.cost) : "رایگان"}</small></span><Icon name="truck" size={22} /></label>;
            })}</div>
            {quote?.shipping_error && <p className="error small">{quote.shipping_error}</p>}
          </section>
          <section className="step-card">
            <div className="step-title"><b>۳</b><h2>کد تخفیف</h2></div>
            <form className="coupon" onSubmit={(e) => { e.preventDefault(); setApplied(toLatin(coupon).trim()); }}>
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="کد تخفیف دارید؟" dir="ltr" maxLength={40} aria-label="کد تخفیف" />
              {applied && quote?.coupon?.valid ? <button type="button" onClick={() => { setApplied(""); setCoupon(""); }}>حذف</button> : <button disabled={!coupon.trim()}>اعمال</button>}
            </form>
            {applied && quote?.coupon?.message && <p className={quote.coupon.valid ? "success small" : "error small"} role="status">{quote.coupon.message}</p>}
          </section>
        </div>
        <aside className="summary-card">
          <h2>صورت‌حساب</h2>
          <div className="sum-row"><span>جمع کالاها</span><strong>{quote ? money(quote.subtotal) : "…"}</strong></div>
          {quote && Number(quote.discount) > 0 && <div className="sum-row is-discount"><span>تخفیف</span><strong>− {money(quote.discount)}</strong></div>}
          <div className="sum-row"><span>هزینهٔ ارسال</span><strong>{quote?.shipping == null ? "—" : Number(quote.shipping) ? money(quote.shipping) : "رایگان"}</strong></div>
          <div className="sum-row is-total"><span>مبلغ قابل پرداخت</span><strong>{quote ? money(quote.total) : "…"}</strong></div>
          {quote?.problems?.map((p: string) => <p key={p} className="error small">{p} <Link to="/cart">اصلاح سبد</Link></p>)}
          {session?.payment_provider === "mock" && <p className="notice small">محیط آزمایشی: پرداخت واقعی انجام نمی‌شود.</p>}
          {session?.payment_provider === "disabled" && <p className="notice small">پرداخت آنلاین هنوز توسط فروشگاه فعال نشده است.</p>}
          <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span><Link to="/pages/terms" target="_blank">شرایط فروش</Link> را خوانده‌ام و می‌پذیرم.</span></label>
          <button className="gold wide desktop-cta" disabled={!ready || busy} onClick={submit}>{busy ? "در حال ثبت…" : "ثبت سفارش و پرداخت"}</button>
          {err && <p className="error" role="alert">{err}</p>}
          <p className="muted small">مبلغ نهایی هنگام ثبت، دوباره در سرور محاسبه و موجودی برای شما رزرو می‌شود.</p>
        </aside>
        <div className="flow-dock">
          <div><small>قابل پرداخت</small><strong>{quote ? fa(quote.total) : "…"} <small>تومان</small></strong></div>
          <button className="gold" disabled={!ready || busy} onClick={submit}>{busy ? "…" : !agree && quote?.ready ? "تأیید شرایط ↑" : "ثبت سفارش"}</button>
        </div>
      </div>
    </main>
  );
}
