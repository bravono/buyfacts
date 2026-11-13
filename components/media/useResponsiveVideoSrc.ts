"use client";

import { useSyncExternalStore } from "react";
import { MOBILE_VIDEO_QUERY, selectVideoSource, type VideoSources } from "@/lib/mediaTransport";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(MOBILE_VIDEO_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getSnapshot = (): boolean => window.matchMedia(MOBILE_VIDEO_QUERY).matches;
// Unknown on the server: no source is chosen until the viewport is known, so a phone never
// starts downloading the desktop render first.
const getServerSnapshot = (): null => null;

/** True at <= 768px, false above, null before the client has rendered. */
export function useIsMobileVideoViewport(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The video URL for the current viewport: the mobile portrait render at <= 768px (explicit
 * `mobileUrl`, or the MOBILE_VIDEO_VARIANTS registry), the desktop render above. Follows
 * viewport changes such as rotating a tablet.
 */
export function useResponsiveVideoSrc(sources: VideoSources): string | undefined {
  const isMobile = useIsMobileVideoViewport();
  if (isMobile === null) return undefined;
  return selectVideoSource(sources, isMobile);
}
