import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "vitest-browser-react";
import { DELAY_MS, musicUrl, useMusicPlayer } from "./useMusicPlayer";

// ── Audio mock ────────────────────────────────────────────────────────────────

interface MockAudioInstance {
  src: string;
  loop: boolean;
  paused: boolean;
  ended: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

let instances: MockAudioInstance[] = [];

function MockAudio(this: MockAudioInstance, src?: string) {
  this.src = src ?? "";
  this.loop = false;
  this.paused = true;
  this.ended = false;
  this.play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  this.pause = vi.fn(() => {
    this.paused = true;
  });
  instances.push(this);
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  instances = [];
  vi.useFakeTimers();
  localStorage.clear();
  vi.stubGlobal("Audio", MockAudio);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useMusicPlayer", () => {
  it("does not create Audio or call play() before the delay", async () => {
    await renderHook(() => useMusicPlayer());

    vi.advanceTimersByTime(DELAY_MS - 1);

    expect(instances).toHaveLength(0);
  });

  it("creates Audio with correct URL and calls play() after the delay", async () => {
    await renderHook(() => useMusicPlayer());

    await vi.advanceTimersByTimeAsync(DELAY_MS);

    expect(instances).toHaveLength(1);
    expect(instances[0]!.src).toBe(musicUrl());
    expect(instances[0]!.play).toHaveBeenCalledOnce();
  });

  it("does not create Audio if muted before the timer fires", async () => {
    const { result } = await renderHook(() => useMusicPlayer());

    result.current.toggle(); // mute
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    expect(instances).toHaveLength(0);
  });

  it("toggle() pauses the audio when muting after playback started", async () => {
    const { result } = await renderHook(() => useMusicPlayer());

    await vi.advanceTimersByTimeAsync(DELAY_MS);
    expect(instances[0]!.play).toHaveBeenCalledOnce();

    result.current.toggle(); // mute
    expect(instances[0]!.pause).toHaveBeenCalledOnce();
  });

  it("muted state is persisted to localStorage", async () => {
    const { result } = await renderHook(() => useMusicPlayer());

    result.current.toggle(); // mute
    expect(localStorage.getItem("music-muted")).toBe("true");

    result.current.toggle(); // unmute
    expect(localStorage.getItem("music-muted")).toBe("false");
  });

  it("reads initial muted state from localStorage", async () => {
    localStorage.setItem("music-muted", "true");

    const { result } = await renderHook(() => useMusicPlayer());

    expect(result.current.muted).toBe(true);
  });

  it("does not replay after audio has ended", async () => {
    const { result } = await renderHook(() => useMusicPlayer());

    await vi.advanceTimersByTimeAsync(DELAY_MS);

    // Simulate playback finishing
    instances[0]!.ended = true;
    instances[0]!.paused = true;

    result.current.toggle(); // mute
    result.current.toggle(); // unmute

    // play() was called once at timer fire, not again after unmute on ended audio
    expect(instances[0]!.play).toHaveBeenCalledOnce();
  });
});
