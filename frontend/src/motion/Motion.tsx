import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  useLocation,
  useNavigationType,
  type Location,
} from "react-router-dom";
import { motionDelay, pointerOffset } from "./policy";
import { HoneyPattern, BotanicalDecoration } from "../components/Atelier";
function focusDestination() {
  const heading = document.querySelector<HTMLElement>("#content h1");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
export function Reveal({
  children,
  kind = "heading",
  index = 0,
  className = "",
}: {
  children: ReactNode;
  kind?: "heading" | "image" | "label" | "card" | "cta";
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={`atelier-reveal ${className}`}
      data-reveal={kind}
      style={{ "--reveal-delay": motionDelay(index) + "ms" } as CSSProperties}
    >
      {children}
    </div>
  );
}
export function RevealGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className} data-reveal-group>
      {children}
    </div>
  );
}
/** One rAF shared by the motion controller; coarse pointers never receive drift. */
export function ImageReveal({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={`atelier-image ${className}`} data-reveal="image">
      <img
        data-parallax
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
export function Spotlight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <div
      ref={ref}
      className={"atelier-spotlight " + className}
      onPointerMove={(e) => {
        if (
          e.pointerType !== "mouse" ||
          matchMedia("(prefers-reduced-motion:reduce), (hover:none)").matches
        )
          return;
        const rect = e.currentTarget.getBoundingClientRect(),
          x = (e.clientX - rect.left) / rect.width - 0.5,
          y = (e.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          ref.current?.style.setProperty("--spot-x", 50 + x * 100 + "%");
          ref.current?.style.setProperty("--spot-y", 50 + y * 100 + "%");
          ref.current?.style.setProperty("--tilt-x", pointerOffset(x) + "px");
          ref.current?.style.setProperty("--tilt-y", pointerOffset(y) + "px");
        });
      }}
      onPointerLeave={() => {
        cancelAnimationFrame(frame.current);
        ref.current?.style.setProperty("--tilt-x", "0px");
        ref.current?.style.setProperty("--tilt-y", "0px");
      }}
    >
      {children}
    </div>
  );
}
/** Destination mounts after a 140ms exit; total 760ms, no transformed sticky ancestor. */
export function PageTransition({
  children,
}: {
  children: (location: Location) => ReactNode;
}) {
  const location = useLocation(),
    navType = useNavigationType(),
    [shown, setShown] = useState(location),
    [phase, setPhase] = useState("idle");
  const initial = useRef(true);
  useEffect(() => {
    if (
      !initial.current &&
      matchMedia("(prefers-reduced-motion:reduce)").matches
    ) {
      const id = requestAnimationFrame(focusDestination);
      return () => cancelAnimationFrame(id);
    }
  }, [shown.pathname]);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (location.pathname === shown.pathname) {
      setShown(location);
      setPhase("idle");
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
    setPhase(reduced ? "idle" : "exit");
    const timer = setTimeout(
      () => {
        setShown(location);
        window.scrollTo({ top: 0, behavior: "instant" });
        setPhase(reduced ? "idle" : "enter");
      },
      reduced ? 0 : 140,
    );
    return () => clearTimeout(timer);
  }, [location]);
  useEffect(() => {
    if (phase !== "enter") return;
    const id = setTimeout(() => {
      setPhase("idle");
      focusDestination();
      if (shown.hash) {
        document
          .getElementById(decodeURIComponent(shown.hash.slice(1)))
          ?.scrollIntoView({ behavior: "instant" });
      }
    }, 620);
    return () => clearTimeout(id);
  }, [phase, shown]);
  return (
    <div className={`route-stage route-${phase}`} data-navigation={navType}>
      <div
        className="route-content"
        inert={phase === "exit" ? true : undefined}
      >
        {children(shown)}
      </div>
      <div className="route-veil" aria-hidden="true">
        <HoneyPattern />
        <BotanicalDecoration />
        <span dir="ltr">ARKHAM / HONEY ATELIER</span>
      </div>
    </div>
  );
}
export function ImageZoom({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="atelier-zoom"
      aria-label="تصویر بزرگ محصول"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button autoFocus className="modal-close" onClick={onClose}>
        بستن ×
      </button>
      <img className="zoom-image" src={src} alt={alt} />
    </dialog>
  );
}
