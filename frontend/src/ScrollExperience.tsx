import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import { isWorkflowRoute } from "./motion/policy";
import "lenis/dist/lenis.css";
/** Native scroll flow, one observer, one shared RAF, no transformed page wrapper. */
export default function ScrollExperience() {
  const { pathname } = useLocation();
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)"),
      pointer = matchMedia("(hover:hover) and (pointer:fine)");
    let teardown = () => {};
    const setup = () => {
      teardown();
      const root = document.documentElement;
      if (preference.matches) {
        teardown = () => {};
        return;
      }
      root.classList.add("motion-enabled");
      const privateRoute = isWorkflowRoute(pathname);
      const lenis = privateRoute
        ? null
        : new Lenis({
            duration: 1.05,
            smoothWheel: true,
            syncTouch: false,
            anchors: true,
          });
      const targets = new Set<HTMLElement>(),
        drifts = new Set<HTMLElement>();
      let frame = 0,
        discoverFrame = 0,
        stopped = false,
        dirty = true;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const { target, isIntersecting } of entries) {
            if (isIntersecting) {
              target.classList.add("reveal-visible");
              observer.unobserve(target);
            }
          }
        },
        { threshold: 0.06, rootMargin: "0px 0px -16px 0px" },
      );
      const discover = () => {
        discoverFrame = 0;
        for (const el of targets) if (!el.isConnected) targets.delete(el);
        for (const el of drifts) if (!el.isConnected) drifts.delete(el);
        document
          .querySelectorAll<HTMLElement>(
            "[data-reveal],main .section-head,main .product-card,main .article-card,main .categories>a,main .faq-list details,main .home-faq details,footer .footer-grid>div,footer .footer-grid>form",
          )
          .forEach((el, i) => {
            if (targets.has(el)) return;
            targets.add(el);
            if (el.closest(".experience-track,.page-management")) return;
            el.style.setProperty(
              "--reveal-delay",
              `${Math.min(i % 4, 3) * 80}ms`,
            );
            el.style.setProperty("--reveal-x", "0px");
            el.classList.add("reveal-ready");
            if (el.getBoundingClientRect().top < innerHeight * 0.96)
              el.classList.add("reveal-visible");
            else observer.observe(el);
          });
        document
          .querySelectorAll<HTMLElement>("[data-parallax],[data-drift]")
          .forEach((el) => drifts.add(el));
        dirty = true;
      };
      const queue = () => {
        if (!discoverFrame) discoverFrame = requestAnimationFrame(discover);
      };
      discover();
      const mutations = new MutationObserver(queue);
      mutations.observe(document.getElementById("root")!, {
        childList: true,
        subtree: true,
      });
      const markDirty = () => {
        dirty = true;
      };
      addEventListener("scroll", markDirty, { passive: true });
      addEventListener("resize", markDirty);
      const tick = (time: number) => {
        if (stopped) return;
        lenis?.raf(time);
        if (dirty && !document.hidden) {
          dirty = false;
          root.style.setProperty(
            "--scroll-progress",
            `${scrollY / Math.max(1, root.scrollHeight - innerHeight)}`,
          );
          if (pointer.matches && innerWidth > 760) {
            const updates: { el: HTMLElement; y: number }[] = [];
            for (const el of drifts) {
              const r = el.getBoundingClientRect();
              if (r.bottom > 0 && r.top < innerHeight)
                updates.push({
                  el,
                  y:
                    Math.max(
                      -1,
                      Math.min(
                        1,
                        (r.top + r.height / 2 - innerHeight / 2) / innerHeight,
                      ),
                    ) * 18,
                });
            }
            for (const { el, y } of updates) {
              el.style.setProperty("--drift-x", "0px");
              el.style.setProperty("--drift-y", y + "px");
            }
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      teardown = () => {
        stopped = true;
        cancelAnimationFrame(frame);
        cancelAnimationFrame(discoverFrame);
        observer.disconnect();
        mutations.disconnect();
        lenis?.destroy();
        removeEventListener("scroll", markDirty);
        removeEventListener("resize", markDirty);
        targets.forEach((el) =>
          el.classList.remove("reveal-ready", "reveal-visible"),
        );
        drifts.forEach((el) => {
          el.style.removeProperty("--drift-x");
          el.style.removeProperty("--drift-y");
        });
        root.classList.remove("motion-enabled");
        root.style.removeProperty("--scroll-progress");
      };
    };
    setup();
    preference.addEventListener("change", setup);
    return () => {
      teardown();
      preference.removeEventListener("change", setup);
    };
  }, [pathname]);
  return <div className="scroll-progress" aria-hidden="true" />;
}
