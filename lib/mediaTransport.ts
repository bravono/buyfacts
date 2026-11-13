/**
 * Pure helpers behind the custom video/audio transport controls and the responsive
 * desktop/mobile video source selection. No DOM access, so they are unit-tested directly.
 */

/** Seconds moved by the -10s / +10s buttons. */
export const SKIP_SECONDS = 10;

/** Viewports at or below this width (CSS px) get the mobile portrait render of a video. */
export const MOBILE_VIDEO_MAX_WIDTH = 768;

/** Media query matching viewports that should load the mobile portrait render. */
export const MOBILE_VIDEO_QUERY = `(max-width: ${MOBILE_VIDEO_MAX_WIDTH}px)`;

const finiteOr = (value: number, fallback: number): number => (Number.isFinite(value) ? value : fallback);

/** Skip backward: never before the start. */
export function skipBackward(currentTime: number, seconds = SKIP_SECONDS): number {
  return Math.max(0, finiteOr(currentTime, 0) - seconds);
}

/** Skip forward: never past the end (unbounded while the duration is still unknown). */
export function skipForward(currentTime: number, duration: number, seconds = SKIP_SECONDS): number {
  const end = duration > 0 && Number.isFinite(duration) ? duration : Infinity;
  return Math.min(end, finiteOr(currentTime, 0) + seconds);
}

/** Clamps a scrubber position (seconds) into the playable range. */
export function clampSeek(time: number, duration: number): number {
  const end = duration > 0 && Number.isFinite(duration) ? duration : 0;
  return Math.min(end, Math.max(0, finiteOr(time, 0)));
}

/** Clamps a volume level into 0..1. */
export function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, finiteOr(volume, 1)));
}

/** Formats seconds as MM:SS (minutes keep counting past 59, e.g. 75:03). */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(finiteOr(seconds, 0)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** "MM:SS / MM:SS" elapsed / duration label (duration shows --:-- until it is known). */
export function formatProgress(currentTime: number, duration: number): string {
  const known = duration > 0 && Number.isFinite(duration);
  return `${formatClock(currentTime)} / ${known ? formatClock(duration) : "--:--"}`;
}

/** The parts of an HTMLMediaElement the transport controls drive (a fake in tests). */
export interface MediaLike {
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  readonly ended: boolean;
  volume: number;
  muted: boolean;
  play(): Promise<void> | void;
  pause(): void;
}

/** Duration in seconds, or 0 while it is unknown (NaN) or unbounded (live streams). */
export function knownDuration(media: Pick<MediaLike, "duration">): number {
  return Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
}

/** Play/Pause toggle. Returns true when playback was requested. */
export function togglePlayback(media: MediaLike): boolean {
  if (media.paused || media.ended) {
    void Promise.resolve(media.play()).catch((err: unknown) => {
      // Autoplay policies or an aborted load; the controls simply stay on "Play".
      console.warn("Playback blocked or failed:", err);
    });
    return true;
  }
  media.pause();
  return false;
}

/** Stop: pause and return to the start. Returns the new position (0). */
export function stopMedia(media: MediaLike): number {
  media.pause();
  media.currentTime = 0;
  return 0;
}

/** Moves to `seconds`, clamped to the playable range. Returns the new position. */
export function seekMedia(media: MediaLike, seconds: number): number {
  const time = clampSeek(seconds, knownDuration(media));
  media.currentTime = time;
  return time;
}

/** -10s. Returns the new position. */
export function skipMediaBackward(media: MediaLike, seconds = SKIP_SECONDS): number {
  const time = skipBackward(media.currentTime, seconds);
  media.currentTime = time;
  return time;
}

/** +10s (stops at the end once the duration is known). Returns the new position. */
export function skipMediaForward(media: MediaLike, seconds = SKIP_SECONDS): number {
  const time = skipForward(media.currentTime, knownDuration(media), seconds);
  media.currentTime = time;
  return time;
}

/** Applies a volume level and mute state to the element. */
export function applyVolume(media: MediaLike, volume: number, muted: boolean): void {
  media.volume = clampVolume(volume);
  media.muted = muted;
}

/**
 * The volume/mute state after the volume slider moves: raising it unmutes, dragging it to
 * zero mutes.
 */
export function volumeFromSlider(level: number): { volume: number; muted: boolean } {
  const volume = clampVolume(level);
  return { volume, muted: volume === 0 };
}

/**
 * The volume/mute state after Mute/Unmute. Unmuting at volume 0 would stay silent, so an
 * audible level is restored.
 */
export function toggleMuteState(state: { volume: number; muted: boolean }): { volume: number; muted: boolean } {
  if (state.muted) return { volume: state.volume === 0 ? 0.5 : state.volume, muted: false };
  return { volume: state.volume, muted: true };
}

/**
 * Mobile portrait renders of desktop videos, keyed by the desktop video URL. Any player
 * given a desktop URL listed here switches to its mobile render at <= 768px automatically.
 *
 * Add an entry once both renders are on the CDN. Renders delivered for this (Phase 3 of the
 * Website Master Task List) but not yet uploaded, so not listed:
 *   Rule of Three 3-Min Preview  Rule_of_Three_B2B_Three_Minute_Preview_Desktop.mp4
 *                                Rule_of_Three_B2B_Mobile_Portrait_Mobile.mp4
 *   Rule of Three Tutorial       Rule_of_Three_Tutorial_Desktop_Desktop.mp4
 *                                Rule_of_Three_Tutorial_Mobile_Mobile.mp4
 *   TRIAD Preview                TRIAD_Preview_Desktop_Corrected_Corners_Text_FINAL_Desktop.mp4
 *                                TRIAD_Preview_Mobile_Corrected_Corners_Text_FINAL_Mobile.mp4
 */
export const MOBILE_VIDEO_VARIANTS: Readonly<Record<string, string>> = {};

export interface VideoSources {
  /** Desktop (landscape) render, used above 768px. */
  desktopUrl?: string | null;
  /** Mobile portrait render, used at 768px and below. */
  mobileUrl?: string | null;
}

/**
 * Picks the video URL for the viewport. An explicit mobileUrl wins; otherwise the
 * MOBILE_VIDEO_VARIANTS registry is consulted; with no mobile render the desktop URL is
 * used everywhere.
 */
export function selectVideoSource(
  { desktopUrl, mobileUrl }: VideoSources,
  isMobileViewport: boolean,
  variants: Readonly<Record<string, string>> = MOBILE_VIDEO_VARIANTS
): string | undefined {
  const desktop = (desktopUrl ?? "").trim() || undefined;
  if (!isMobileViewport) return desktop;
  const mobile = (mobileUrl ?? "").trim() || (desktop ? variants[desktop] : undefined);
  return mobile || desktop;
}
