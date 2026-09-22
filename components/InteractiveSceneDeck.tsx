"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./InteractiveSceneDeck.module.css";

interface InteractiveSceneDeckProps {
  children: React.ReactNode;
}

export default function InteractiveSceneDeck({ children }: InteractiveSceneDeckProps) {
  const rawScenes = React.Children.toArray(children);
  const totalScenes = rawScenes.length;

  // Dynamically extract metadata from each child section to prevent drift
  const scenesMeta = rawScenes.map((child, idx) => {
    const el = React.isValidElement(child) ? child : null;
    const props = el ? (el.props as any) : {};
    const id = props.id || `slide-${idx}`;
    const title = props["data-title"] || `Slide ${idx + 1}`;
    const bg = props["data-bg"] || "#ffffff";
    return { id, title, bg, element: child };
  });

  const [currentScene, setCurrentScene] = useState(0);
  const [navHeight, setNavHeight] = useState(76);
  const isLocked = useRef(false);
  const currentSceneRef = useRef(0);
  currentSceneRef.current = currentScene;
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const updateNavHeight = () => {
      const navEl = document.querySelector("header") || document.querySelector("nav");
      if (navEl) setNavHeight(navEl.offsetHeight);
    };
    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    return () => window.removeEventListener("resize", updateNavHeight);
  }, []);

  const goToScene = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalScenes || isLocked.current) return;
      isLocked.current = true;
      setCurrentScene(index);

      const targetAnchor = scenesMeta[index]?.id;
      if (targetAnchor) {
        const url = index === 0 ? window.location.pathname : `#${targetAnchor}`;
        window.history.replaceState(null, "", url);
      }

      setTimeout(() => {
        isLocked.current = false;
      }, 750);
    },
    [totalScenes, scenesMeta]
  );

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevH = html.style.overflow;
    const prevB = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevH;
      body.style.overflow = prevB;
    };
  }, []);

  // Inner scroll check: allows scrolling tall content on tiny screens, advances when at bounds
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 18) return;

      const slide = slideRefs.current[currentSceneRef.current];
      if (slide) {
        const maxScroll = slide.scrollHeight - slide.clientHeight;
        if (maxScroll > 15) {
          if (e.deltaY > 0 && slide.scrollTop < maxScroll - 10) return;
          if (e.deltaY < 0 && slide.scrollTop > 10) return;
        }
      }

      e.preventDefault();
      if (isLocked.current) return;

      if (e.deltaY > 0) {
        goToScene(currentSceneRef.current + 1);
      } else {
        goToScene(currentSceneRef.current - 1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goToScene]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goToScene(currentSceneRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToScene(currentSceneRef.current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToScene(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToScene(totalScenes - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToScene, totalScenes]);

  // Anchor clicks & Hash sync
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) {
        goToScene(0);
        return;
      }
      const idx = scenesMeta.findIndex((s) => s.id === hash);
      if (idx !== -1) goToScene(idx);
    };

    const onAnchorClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;

      let hash = "";
      if (href.includes("#")) {
        hash = href.split("#")[1];
      }
      if (hash) {
        const idx = scenesMeta.findIndex((s) => s.id === hash);
        if (idx !== -1) {
          e.preventDefault();
          goToScene(idx);
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    document.addEventListener("click", onAnchorClick);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      document.removeEventListener("click", onAnchorClick);
    };
  }, [scenesMeta, goToScene]);

  return (
    <div
      className={styles.viewport}
      style={{ top: `${navHeight}px`, height: `calc(100vh - ${navHeight}px)` }}
    >
      <div
        className={styles.track}
        style={{ transform: `translate3d(0, -${currentScene * 100}%, 0)` }}
      >
        {scenesMeta.map((scene, idx) => (
          <div
            key={idx}
            ref={(el) => {
              slideRefs.current[idx] = el;
            }}
            className={styles.scene}
            style={{ backgroundColor: scene.bg }}
          >
            {scene.element}
          </div>
        ))}
      </div>

      <nav className={styles.sceneNav} aria-label="Scene Navigator">
        {scenesMeta.map((scene, idx) => (
          <button
            key={idx}
            type="button"
            className={`${styles.sceneDot} ${idx === currentScene ? styles.sceneDotActive : ""}`}
            onClick={() => goToScene(idx)}
            title={scene.title}
            aria-label={`Jump to ${scene.title}`}
          />
        ))}
      </nav>
    </div>
  );
}
