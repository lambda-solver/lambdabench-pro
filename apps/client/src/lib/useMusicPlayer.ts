import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "music-muted";
export const DELAY_MS = 10_000;

/**
 * Returns the URL to the music file.
 * import.meta.env.BASE_URL is injected by Vite from the `base` config
 * (e.g. "/lambdabench-pro/" on GitHub Pages, "/" in dev).
 */
export function musicUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalised = base.endsWith("/") ? base : `${base}/`;
  return `${normalised}music/theme.mp3`;
}

/**
 * Attempt audio.play(). If blocked by autoplay policy, wait for the first
 * user interaction (pointerdown or keydown) and retry exactly once.
 */
function attemptPlay(audio: HTMLAudioElement): void {
  const p = audio.play();
  if (!p) return; // old browsers that return undefined

  p.catch((err: unknown) => {
    // Only handle autoplay-policy blocks
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      const retry = () => {
        document.removeEventListener("pointerdown", retry, true);
        document.removeEventListener("keydown", retry, true);
        // Only play if still not muted and not already playing
        if (!audio.paused || audio.ended) return;
        audio.play().catch(() => {});
      };
      document.addEventListener("pointerdown", retry, {
        capture: true,
        once: true,
      });
      document.addEventListener("keydown", retry, {
        capture: true,
        once: true,
      });
    }
  });
}

/**
 * Lazily loads and plays the theme music once after DELAY_MS.
 *
 * Returns:
 *   muted   – current mute state (persisted in localStorage)
 *   toggle  – flip mute state
 */
export function useMusicPlayer(): { muted: boolean; toggle: () => void } {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      hasTriggered.current = true;
      if (mutedRef.current) return;

      const audio = new Audio(musicUrl());
      audio.loop = false;
      audioRef.current = audio;
      attemptPlay(audio);
    }, DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    // Update the ref synchronously so the timer callback sees the new value
    // immediately, even before React re-renders.
    const next = !mutedRef.current;
    mutedRef.current = next;

    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }

    const audio = audioRef.current;

    if (next) {
      audio?.pause();
    } else {
      if (!hasTriggered.current) {
        setMuted(next);
        return;
      }
      if (!audio) {
        const newAudio = new Audio(musicUrl());
        newAudio.loop = false;
        audioRef.current = newAudio;
        attemptPlay(newAudio);
      } else if (audio.paused && !audio.ended) {
        attemptPlay(audio);
      }
    }

    setMuted(next);
  };

  return { muted, toggle };
}
