"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./SlideDeck.module.css";

interface SlideDeckProps {
  children: React.ReactNode;
  titles?: string[];
  anchors?: string[];
  duration?: number;
}

const WHEEL_MIN = 10;
const GESTURE_GAP = 120;
const INNER_SETTLE = 200;
const SWIPE_MIN = 45;

const EMPTY: string[] = [];
type Dir = 1 | -1;

/* Tolerant boundary checking to prevent subpixel infinite locks */
function canScrollInside(el: HTMLElement, dir: Dir): boolean {
  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 15) return false; // Minor layout padding noise is ignored

  if (dir > 0) {
    return el.scrollTop < maxScroll - 12; // Within 12px of bottom = advance slide!
  } else {
    return el.scrollTop > 12; // Within 12px of top = advance slide!
  }
}

function findScrollable(start: Element, boundary: HTMLElement, dir: Dir): HTMLElement | null {
  let node: HTMLElement | null = start as HTMLElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && canScrollInside(node, dir)) return node;
    if (node === boundary) break;
    node = node.parentElement;
  }
  return null;
}

export default function SlideDeck({
  children,
  titles = EMPTY,
  anchors = EMPTY,
  duration = 650,
}: SlideDeckProps) {
  const slides = React.Children.toArray(children);
  const count = slides.length;

  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);

  const currentRef = useRef(0);
  const lockedUntil = useRef(0);
  const lastWheelAt = useRef(0);
  const innerScrollAt = useRef(0);
  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touch = useRef<{ y: number; top: number } | null>(null);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= count || next === currentRef.current) return;
      const el = slideRefs.current[next];
      if (el) el.scrollTop = next > currentRef.current ? 0 : el.scrollHeight;
      currentRef.current = next;
      lockedUntil.current = Date.now() + duration + 40;
      setCurrent(next);
    },
    [count, duration]
  );

  const indexFromHash = useCallback((hash: string) => {
    const key = hash.replace(/^#/, "");
    return key ? anchorsRef.current.indexOf(key) : 0;
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const prev = {
      h: html.style.overflow,
      b: document.body.style.overflow,
      o: html.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.h;
      document.body.style.overflow = prev.b;
      html.style.overscrollBehavior = prev.o;
    };
  }, []);

  useEffect(() => {
    const i = indexFromHash(window.location.hash);
    if (i > 0 && i < count) {
      currentRef.current = i;
      setCurrent(i);
    }
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [count, indexFromHash]);

  useEffect(() => {
    if (!ready) return;
    const a = anchorsRef.current[current];
    const url = a ? `#${a}` : window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, "", url);
  }, [current, ready]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (Math.abs(dy) < 1) return;

      const dir: Dir = dy > 0 ? 1 : -1;
      const now = Date.now();
      const slide = slideRefs.current[currentRef.current];
      if (!slide) return;

      const target = e.target instanceof Element && slide.contains(e.target) ? e.target : slide;
      if (findScrollable(target, slide, dir)) {
        innerScrollAt.current = now;
        lastWheelAt.current = now;
        return;
      }

      e.preventDefault();
      const gap = now - lastWheelAt.current;
      lastWheelAt.current = now;

      if (Math.abs(dy) < WHEEL_MIN) return;
      if (now < lockedUntil.current) return;
      if (now - innerScrollAt.current < INNER_SETTLE) return;

      go(currentRef.current + dir);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

      let dir: Dir;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          dir = 1;
          break;
        case "ArrowUp":
        case "PageUp":
          dir = -1;
          break;
        case "Home":
          e.preventDefault();
          go(0);
          return;
        case "End":
          e.preventDefault();
          go(count - 1);
          return;
        default:
          return;
      }

      e.preventDefault();
      const now = Date.now();
      const slide = slideRefs.current[currentRef.current];
      if (slide && canScrollInside(slide, dir)) {
        slide.scrollBy({ top: dir * 120, behavior: "smooth" });
        innerScrollAt.current = now;
        return;
      }
      if (now < lockedUntil.current || now - innerScrollAt.current < INNER_SETTLE) return;
      go(currentRef.current + dir);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, count]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;

      const i = indexFromHash(url.hash);
      if (i < 0) return;
      e.preventDefault();
      go(i);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [go, indexFromHash]);

  return (
    <div
      className={styles.viewport}
      onScroll={(e) => {
        e.currentTarget.scrollTop = 0;
        e.currentTarget.scrollLeft = 0;
      }}
    >
      <div
        className={`${styles.track} ${ready ? styles.animated : ""}`}
        style={{
          transform: `translate3d(0, ${-current * 100}%, 0)`,
          transitionDuration: `${duration}ms`,
        }}
      >
        {slides.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className={styles.slide}
          >
            <div className={styles.slideInner}>
              <div className={styles.slideBody}>{child}</div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <nav className={styles.dots} aria-label="Slide navigation">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
              onClick={() => go(i)}
              title={titles[i] || `Slide ${i + 1}`}
              aria-label={titles[i] ? `Go to ${titles[i]}` : `Go to slide ${i + 1}`}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
