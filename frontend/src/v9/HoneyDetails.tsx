import { Link } from "react-router-dom";
import { fa } from "../api";
import { Icon } from "../v8/icons";
import { FlowerScene } from "./Flora";
import { CRYSTAL_LABEL, needLabel, purposeLabel, type HoneyProfile } from "./honey";
import beeFlower from "../design/assets/bee-small.webp";
import meadow from "../design/assets/meadow-small.webp";
import beeComb from "./assets/bee-comb.webp";

function Meter({ label, value, max = 5, note }: { label: string; value: number; max?: number; note: string }) {
  return (
    <div className="hp-meter">
      <span>{label}</span>
      <span className="hp-cells" aria-hidden="true">{Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? "on" : ""} />)}</span>
      <small>{note}</small>
    </div>
  );
}

/** Quick facts under the product title. */
export function HoneyBadges({ h }: { h: HoneyProfile }) {
  return (
    <ul className="honey-badges" aria-label="مشخصات کوتاه">
      <li><span className="hb-swatch" style={{ "--a": h.hex[0], "--b": h.hex[1] } as any} />{h.color}</li>
      <li><Icon name="leaf" size={16} />گل {h.flower}</li>
      <li><Icon name="shield" size={16} />{h.region} · {h.season}</li>
    </ul>
  );
}

/** Taste / colour profile card. */
export function HoneyProfilePanel({ h }: { h: HoneyProfile }) {
  const crystal = h.crystal === "fast" ? 3 : h.crystal === "medium" ? 2 : 1;
  return (
    <section className="honey-profile" aria-label="شناسنامهٔ طعم">
      <div className="hp-color" style={{ "--a": h.hex[0], "--b": h.hex[1] } as any}>
        <span className="hp-drop" aria-hidden="true" />
        <div><small>رنگ عسل</small><strong>{h.color}</strong><span>طبع {h.temper}</span></div>
      </div>
      <div className="hp-meters">
        <Meter label="شیرینی" value={h.sweet} note={["", "کم", "ملایم", "متعادل", "شیرین", "خیلی شیرین"][h.sweet]} />
        <Meter label="شدت عطر" value={h.aroma} note={["", "خیلی ملایم", "ملایم", "متوسط", "معطر", "پرعطر"][h.aroma]} />
        <Meter label="سرعت شکرک" value={crystal} max={3} note={CRYSTAL_LABEL[h.crystal]} />
      </div>
      <div className="hp-tags">
        {h.taste.map((t) => <span key={t} className="hp-tag">{t}</span>)}
      </div>
      {(h.needs.length > 0 || h.purposes.length > 0) && (
        <div className="hp-uses">
          <small>مناسب برای</small>
          <div>{h.purposes.map((p) => <span key={p} className="hp-use">{purposeLabel(p)}</span>)}{h.needs.map((n) => <span key={n} className="hp-use is-need">{needLabel(n)}</span>)}</div>
        </div>
      )}
    </section>
  );
}

/** "From flower to jar": the illustrated flower with its bee, plus three photos. */
export function FlowerStory({ h, name }: { h: HoneyProfile; name: string }) {
  const photos = [
    { src: beeFlower, title: "شهد گل", text: "زنبور کارگر شهد را با زبان لوله‌ای‌اش از دل گل می‌مکد." },
    { src: beeComb, title: "در کندو", text: "در خانه‌های شش‌ضلعی، شهد آرام‌آرام به عسل تبدیل می‌شود." },
    { src: meadow, title: h.region, text: "کندوها در فصل " + h.season + " کنار گیاهان " + h.flower + " مستقر می‌شوند." },
  ];
  return (
    <section className="flower-story" aria-labelledby="flower-story-title">
      <div className="fs-grid">
        <FlowerScene h={h} label={name} />
        <div className="fs-copy">
          <span className="fs-kicker" dir="ltr">{h.latin || "THE FLOWER"}</span>
          <h2 id="flower-story-title">زنبورها روی گل {h.flower}</h2>
          <p>{h.plant}</p>
          <dl className="fs-facts">
            <div><dt>منطقه</dt><dd>{h.region}</dd></div>
            <div><dt>فصل برداشت</dt><dd>{h.season}</dd></div>
            <div><dt>کمیابی</dt><dd>{["", "در دسترس", "محدود", "بسیار کمیاب"][h.rarity] || "در دسترس"}</dd></div>
          </dl>
        </div>
      </div>
      <ol className="fs-photos">
        {photos.map((p, i) => (
          <li key={i} data-reveal="card">
            <figure>
              <img src={p.src} alt="" loading="lazy" decoding="async" />
              <figcaption><b>{"۰" + fa(i + 1)}</b><strong>{p.title}</strong><span>{p.text}</span></figcaption>
            </figure>
          </li>
        ))}
      </ol>
      <p className="fs-finder">نمی‌دانید کدام عسل مناسب شماست؟ <Link to="/honey-finder">عسل‌یاب ارکام را امتحان کنید <Icon name="arrow" size={16} /></Link></p>
    </section>
  );
}
