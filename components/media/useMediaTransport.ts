"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyVolume,
  clampSeek,
  knownDuration,
  seekMedia,
  skipMediaBackward,
  skipMediaForward,
  stopMedia,
  toggleMuteState,
  togglePlayback,
  volumeFromSlider,
} from "@/lib/mediaTransport";

export interface MediaTransport {
  /** Callback ref: pass as `ref={attach}` on the <video> or <audio> element. */
  attach: (node: HTMLMediaElement | null) => void;
  isPlaying: boolean;
  /** True after playback reached the end (cleared by play, stop or seek). */
  ended: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  /** Pauses and returns to 0:00. */
  stop: () => void;
  skipBack: () => void;
  skipForward: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  /** Plays the next media element that attaches (a source about to mount after a switch). */
  playWhenReady: () => void;
}

/** Everything except the element ref: what controls and overlays render from. */
export type TransportActions = Omit<MediaTransport, "attach">;

interface PlaybackState {
  isPlaying: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
}

const IDLE: PlaybackState = { isPlaying: false, ended: false, currentTime: 0, duration: 0 };

const startPlayback = (media: HTMLMediaElement) => {
  if (media.paused || media.ended) togglePlayback(media);
};

/**
 * State and actions for custom transport controls over one media element. The element's
 * own events are the source of truth, so native gestures (keyboard, picture-in-picture,
 * OS media keys) stay in sync with the controls. The element operations themselves are the
 * pure functions in lib/mediaTransport.ts.
 *
 * When the element's `src` changes in place (e.g. switching between the desktop and mobile
 * render of the same video on resize), the position and play state carry over.
 */
export function useMediaTransport(): MediaTransport {
  // The media element is mutated (currentTime, volume), so it lives in a ref; the state copy
  // only re-runs the listener effect when a different element is attached.
  const mediaNode = useRef<HTMLMediaElement | null>(null);
  const [attachedNode, setAttachedNode] = useState<HTMLMediaElement | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>(IDLE);
  const [volumeState, setVolumeState] = useState({ volume: 1, muted: false });
  const autoplayPending = useRef(false);

  const attach = useCallback((node: HTMLMediaElement | null) => {
    mediaNode.current = node;
    setAttachedNode(node);
    setPlayback(IDLE);
    if (node && autoplayPending.current) {
      autoplayPending.current = false;
      startPlayback(node);
    }
  }, []);

  // Mirror the element's events into state.
  useEffect(() => {
    const media = mediaNode.current;
    if (!attachedNode || !media) return;
    let lastTime = 0;
    let lastPlaying = false;
    let resumeAt: { time: number; playing: boolean } | null = null;

    const update = (patch: Partial<PlaybackState>) => setPlayback((prev) => ({ ...prev, ...patch }));
    // Events queued before a source swap can be dispatched after the element has already
    // reset to 0 with no data (readyState 0); they must not overwrite the saved position.
    const hasData = () => media.readyState > 0;
    const onTime = () => {
      if (hasData()) lastTime = media.currentTime;
      update({ currentTime: media.currentTime });
    };
    const onPlay = () => {
      lastPlaying = true;
      update({ isPlaying: true, ended: false });
    };
    const onPause = () => {
      if (hasData()) lastPlaying = false;
      update({ isPlaying: false });
    };
    const onEnded = () => {
      lastPlaying = false;
      update({ isPlaying: false, ended: true });
    };
    const onDuration = () => update({ duration: knownDuration(media) });
    const onVolume = () => setVolumeState({ volume: media.volume, muted: media.muted });
    // The source was swapped on the same element: remember where we were...
    const onEmptied = () => {
      if (lastTime > 0) resumeAt = { time: lastTime, playing: lastPlaying };
      update({ currentTime: 0, duration: 0, isPlaying: false, ended: false });
    };
    // ...and continue there once the new source is ready.
    const onMetadata = () => {
      onDuration();
      if (!resumeAt) return;
      media.currentTime = clampSeek(resumeAt.time, knownDuration(media));
      if (resumeAt.playing) startPlayback(media);
      resumeAt = null;
    };

    const listeners: Array<[string, () => void]> = [
      ["timeupdate", onTime],
      // "seeking" fires at once with the target position, so a swap right after a seek
      // (before "seeked") still resumes at the right place.
      ["seeking", onTime],
      ["seeked", onTime],
      ["play", onPlay],
      ["pause", onPause],
      ["ended", onEnded],
      ["durationchange", onDuration],
      ["loadedmetadata", onMetadata],
      ["volumechange", onVolume],
      ["emptied", onEmptied],
    ];
    for (const [type, fn] of listeners) media.addEventListener(type, fn);
    return () => {
      for (const [type, fn] of listeners) media.removeEventListener(type, fn);
    };
  }, [attachedNode]);

  // Apply the chosen volume and mute state to whichever element is attached.
  const { volume, muted } = volumeState;
  useEffect(() => {
    const media = mediaNode.current;
    if (media) applyVolume(media, volume, muted);
  }, [attachedNode, volume, muted]);

  const play = useCallback(() => {
    const media = mediaNode.current;
    if (media) startPlayback(media);
  }, []);

  const pause = useCallback(() => {
    mediaNode.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const media = mediaNode.current;
    if (media) togglePlayback(media);
  }, []);

  const seek = useCallback((seconds: number) => {
    const media = mediaNode.current;
    if (!media) return;
    const time = seekMedia(media, seconds);
    setPlayback((prev) => ({ ...prev, currentTime: time, ended: false }));
  }, []);

  const stop = useCallback(() => {
    const media = mediaNode.current;
    if (!media) return;
    const time = stopMedia(media);
    setPlayback((prev) => ({ ...prev, isPlaying: false, ended: false, currentTime: time }));
  }, []);

  const skipBack = useCallback(() => {
    const media = mediaNode.current;
    if (!media) return;
    const time = skipMediaBackward(media);
    setPlayback((prev) => ({ ...prev, currentTime: time, ended: false }));
  }, []);

  const skipAhead = useCallback(() => {
    const media = mediaNode.current;
    if (!media) return;
    const time = skipMediaForward(media);
    setPlayback((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((level: number) => setVolumeState(volumeFromSlider(level)), []);

  const setMuted = useCallback((next: boolean) => setVolumeState((prev) => ({ ...prev, muted: next })), []);

  const toggleMute = useCallback(() => setVolumeState((prev) => toggleMuteState(prev)), []);

  const playWhenReady = useCallback(() => {
    autoplayPending.current = true;
  }, []);

  return {
    attach,
    ...playback,
    volume,
    muted,
    play,
    pause,
    togglePlay,
    stop,
    skipBack,
    skipForward: skipAhead,
    seek,
    setVolume,
    setMuted,
    toggleMute,
    playWhenReady,
  };
}
