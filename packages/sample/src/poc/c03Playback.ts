import { useCallback, useEffect, useRef, useState } from "react";

import { C03_DURATION_MS } from "./c03Motion.ts";

export type C03PlaybackState = Readonly<{
  progress: number;
  playing: boolean;
}>;

export const clampC03Progress = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

export const createC03PlaybackState = (progress = 0): C03PlaybackState => ({
  progress: clampC03Progress(progress),
  playing: false,
});

export const startC03Playback = (
  state: C03PlaybackState,
  now: number,
): { state: C03PlaybackState; startTime: number } => ({
  state: { progress: state.progress, playing: true },
  startTime: now - state.progress * C03_DURATION_MS,
});

export const advanceC03Playback = (
  state: C03PlaybackState,
  startTime: number,
  now: number,
): C03PlaybackState => {
  const progress = Math.min((now - startTime) / C03_DURATION_MS, 1);
  return {
    progress: clampC03Progress(progress),
    playing: progress < 1,
  };
};

export const stopC03Playback = (state: C03PlaybackState): C03PlaybackState => ({
  ...state,
  playing: false,
});

export const resetC03Playback = (): C03PlaybackState => createC03PlaybackState();

export const scrubC03Playback = (progress: number): C03PlaybackState =>
  createC03PlaybackState(progress);

export const useC03Playback = () => {
  const [state, setState] = useState<C03PlaybackState>(createC03PlaybackState);
  const stateRef = useRef(state);
  const frameRef = useRef<number | null>(null);

  const publish = useCallback((nextState: C03PlaybackState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const stopPlayback = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    publish(stopC03Playback(stateRef.current));
  }, [publish]);

  const play = useCallback(() => {
    stopPlayback();
    const started = startC03Playback(stateRef.current, performance.now());
    publish(started.state);

    const tick = (now: number) => {
      const nextState = advanceC03Playback(started.state, started.startTime, now);
      publish(nextState);
      if (nextState.playing) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = null;
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [publish, stopPlayback]);

  const reset = useCallback(() => {
    stopPlayback();
    publish(resetC03Playback());
  }, [publish, stopPlayback]);

  const scrub = useCallback((progress: number) => {
    stopPlayback();
    publish(scrubC03Playback(progress));
  }, [publish, stopPlayback]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  return {
    progress: state.progress,
    play,
    stopPlayback,
    reset,
    scrub,
  };
};
