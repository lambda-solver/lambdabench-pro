import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "music-muted";
const DELAY_MS = 3_000;

/**
 * Returns the URL to the music file.
 * import.meta.env.BASE_URL is injected by Vite from the `base` config
 * (e.g. "/lambdabench-pro/" on GitHub Pages, "/" in dev).
 */
function musicUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalised = base.endsWith("/") ? base : `${base}/`;
  return `${normalised}music/theme.mp3`;
}

/**
 * Lazily loads and plays the theme music once after DELAY_MS.
 *
 * The Audio element is created only when the timer fires — the browser
 * never fetches the file until that point.
 *
 * Autoplay policy: if the browser blocks the initial play() (no prior
 * user gesture), we register a one-shot pointer/key listener that retries
 * as soon as the user first interacts with the page.
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

  // Ref mirrors state so timeout/event callbacks always see the latest value
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasTriggered = useRef(false);
  // Set to true when play() was blocked by autoplay policy
  const pendingPlayRef = useRef(false);

  /** Attempt to play; if blocked, register a one-shot interaction retry. */
  function attemptPlay(audio: HTMLAudioElement) {
    audio.play().then(() => {
      pendingPlayRef.current = false;
    }).catch(() => {
      // Autoplay blocked — retry on first user interaction
      pendingPlayRef.current = true;

      function onInteraction() {
        if (pendingPlayRef.current && !mutedRef.current) {
          audio.play().catch(() => {});
          pendingPlayRef.current = false;
        }
        document.removeEventListener("pointerdown", onInteraction);
        document.removeEventListener("keydown", onInteraction);
      }

      document.addEventListener("pointerdown", onInteraction, { once: true });
      document.addEventListener("keydown", onInteraction, { once: true });
    });
  }

  // ── 3 s delayed lazy-load + play ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      hasTriggered.current = true;
      if (mutedRef.current) return; // user muted before timer fired

      const audio = new Audio(musicUrl());
      audio.loop = false;
      audioRef.current = audio;
      attemptPlay(audio);
    }, DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── toggle handler ─────────────────────────────────────────────────────────
  const toggle = () => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }

      const audio = audioRef.current;

      if (next) {
        // Muting: pause if playing, cancel any pending retry
        pendingPlayRef.current = false;
        audio?.pause();
      } else {
        // Un-muting
        if (!hasTriggered.current) {
          // Timer hasn't fired yet — it will play when it fires
          return next;
        }
        if (!audio) {
          // Timer fired while muted — create and play now
          const newAudio = new Audio(musicUrl());
          newAudio.loop = false;
          audioRef.current = newAudio;
          attemptPlay(newAudio);
        } else if (audio.paused && !audio.ended) {
          attemptPlay(audio);
        }
      }

      return next;
    });
  };

  return { muted, toggle };
}
