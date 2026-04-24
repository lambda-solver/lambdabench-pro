import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "music-muted";
const DELAY_MS = 10_000;

/** Returns the absolute URL to the music file, respecting VITE_BASE_URL. */
function musicUrl(): string {
  const base = (import.meta.env["VITE_BASE_URL"] as string | undefined) ?? "/";
  const normalised = base.endsWith("/") ? base : `${base}/`;
  return `${normalised}music/theme.mp3`;
}

/**
 * Lazily loads and plays the theme music once after DELAY_MS.
 * The audio element is created only after the timer fires (not at mount),
 * so the browser never fetches the file until needed.
 *
 * Returns:
 *   muted   – current mute state (persisted in localStorage)
 *   toggle  – flip mute state (also pauses/resumes playback)
 */
export function useMusicPlayer(): { muted: boolean; toggle: () => void } {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Keep a ref so the timeout callback always sees the latest muted value
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track whether we have already started (or decided not to start) playback
  const hasTriggered = useRef(false);

  // ── 10 s delayed lazy-load + play ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      hasTriggered.current = true;
      if (mutedRef.current) return; // user silenced before timer fired

      const audio = new Audio();
      audio.preload = "none"; // don't start fetching until .src is set + play()
      audio.loop = false;
      audio.src = musicUrl();
      audioRef.current = audio;
      audio.play().catch(() => {
        // Autoplay blocked — silently ignore; user can unmute to trigger later
      });
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
        // Muting: pause if playing
        audio?.pause();
      } else {
        // Un-muting
        if (!hasTriggered.current) {
          // Timer hasn't fired yet — do nothing; timer will play when it fires
          return next;
        }
        // Timer already fired: create audio lazily if not yet created
        if (!audio) {
          const newAudio = new Audio();
          newAudio.preload = "none";
          newAudio.loop = false;
          newAudio.src = musicUrl();
          audioRef.current = newAudio;
          newAudio.play().catch(() => {});
        } else if (audio.paused && !audio.ended) {
          audio.play().catch(() => {});
        }
      }

      return next;
    });
  };

  return { muted, toggle };
}
