"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./SubAppContainer.module.css";

interface SubAppContainerProps {
  appName: string;
  appUrl: string; // e.g. "/cubicon-app" or "/narrative-app"
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  iframeStyle?: React.CSSProperties;
  onAppEvent?: (eventData: unknown) => void;
}

export const SubAppContainer: React.FC<SubAppContainerProps> = ({
  appName,
  appUrl,
  title = "Tool Application",
  className,
  style,
  iframeStyle,
  onAppEvent,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch session JWT token from BuyFacts auth gateway
  useEffect(() => {
    let isMounted = true;
    async function fetchAuthToken() {
      try {
        const res = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app: appName }),
        });
        const data = await res.json();
        if (isMounted && data.success && data.token) {
          setToken(data.token);
        }
      } catch (err) {
        console.error("Failed to fetch sub-app authentication token:", err);
      }
    }
    fetchAuthToken();
    return () => {
      isMounted = false;
    };
  }, [appName]);

  // Handle postMessage handshake with sub-app iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Basic origin validation if needed
      if (!event.data || typeof event.data !== "object") return;

      const { type, payload } = event.data;

      if (type === "SUBAPP_READY" && iframeRef.current?.contentWindow) {
        // Handshake: Send JWT auth token down to sub-app iframe
        iframeRef.current.contentWindow.postMessage(
          {
            type: "BUYFACTS_AUTH_INIT",
            payload: {
              token,
              appName,
            },
          },
          "*"
        );
      }

      if (type === `${appName.toUpperCase()}_EVENT` || type === "SUBAPP_EVENT") {
        if (onAppEvent) {
          onAppEvent(payload);
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [appName, token, onAppEvent]);

  return (
    <div
      className={`${styles.container} ${className || ""}`}
      style={{ width: "100%", height: "100%", ...style }}
    >
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading {title}...</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={appUrl}
        title={title}
        className={styles.iframe}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100%",
          border: "none",
          display: "block",
          ...iframeStyle,
        }}
        onLoad={() => setIsLoading(false)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; microphone; camera"
      />
    </div>
  );
};
