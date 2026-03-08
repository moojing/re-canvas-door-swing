import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DoorEntrance,
  doorEntrancePresets,
  getDoorAnimationConfig,
  getDoorEntrancePreset,
  type DoorEntrancePresetId,
  type DoorEntranceHandle,
} from "door-entrance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const CAMERA_PAN_PER_PIXEL = 0.01;
const MAX_CAMERA_PAN_X = 1.9;
const MAX_CAMERA_PAN_Y = 1.6;
const WAVESURFER_SCRIPT_ID = "door-entrance-wavesurfer";
const WAVESURFER_CDN_URL =
  "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js";

type WaveSurferEvent = "ready" | "error";

interface WaveSurferInstance {
  destroy: () => void;
  load: (url: string) => void;
  seekTo: (progress: number) => void;
  on: (
    event: WaveSurferEvent,
    listener: (...args: unknown[]) => void
  ) => (() => void) | void;
}

interface WaveSurferFactory {
  create: (options: Record<string, unknown>) => WaveSurferInstance;
}

declare global {
  interface Window {
    WaveSurfer?: WaveSurferFactory;
  }
}

const formatMs = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const toPublicAssetUrl = (url?: string) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url) || url.startsWith("/")) return url;

  const normalized = url.replace(/^\.?\//, "");
  if (typeof document !== "undefined") {
    try {
      return new URL(normalized, document.baseURI).toString();
    } catch {
      return normalized;
    }
  }

  return normalized;
};

const loadWaveSurfer = (): Promise<WaveSurferFactory> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not available"));
  }

  if (window.WaveSurfer?.create) {
    return Promise.resolve(window.WaveSurfer);
  }

  return new Promise<WaveSurferFactory>((resolve, reject) => {
    const onReady = () => {
      if (window.WaveSurfer?.create) {
        resolve(window.WaveSurfer);
        return;
      }
      reject(new Error("WaveSurfer did not initialize correctly"));
    };
    const onError = () => reject(new Error("Failed to load WaveSurfer script"));

    const existingScript = document.getElementById(
      WAVESURFER_SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", onReady, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = WAVESURFER_SCRIPT_ID;
    script.src = WAVESURFER_CDN_URL;
    script.async = true;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });
};

const ReactSample = () => {
  const [preset, setPreset] = useState<DoorEntrancePresetId>("door-single");
  const [status, setStatus] = useState("等待播放");
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [cameraPanX, setCameraPanX] = useState(0);
  const [cameraPanY, setCameraPanY] = useState(0);
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [audioCurrentTimeMs, setAudioCurrentTimeMs] = useState(0);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [waveformReady, setWaveformReady] = useState(false);
  const [waveformHoverRatio, setWaveformHoverRatio] = useState<number | null>(
    null
  );
  const ref = useRef<DoorEntranceHandle>(null);
  const shellRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const waveformDragRef = useRef({ active: false });
  const dragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  }>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const selectedPresetMeta = useMemo(
    () => doorEntrancePresets.find((p) => p.id === preset),
    [preset]
  );
  const currentLabel = selectedPresetMeta?.label ?? "Door";
  const selectedSoundUrl = useMemo(
    () => toPublicAssetUrl(selectedPresetMeta?.soundUrl),
    [selectedPresetMeta]
  );
  const config = useMemo(
    () => getDoorAnimationConfig(getDoorEntrancePreset(preset).variant),
    [preset]
  );
  const progressMarkers = config.progressMarkers;
  const duration = config.duration;
  const audioProgressPercent =
    audioDurationMs > 0
      ? Math.round((audioCurrentTimeMs / audioDurationMs) * 1000) / 10
      : 0;
  const audioRulerTicks = useMemo(() => {
    if (audioDurationMs <= 0) {
      return [0, 0.25, 0.5, 0.75, 1].map((ratio, index, array) => ({
        ratio,
        label: formatMs(ratio * 5000),
        showLabel: index % 2 === 0 || index === array.length - 1,
      }));
    }

    const durationSec = audioDurationMs / 1000;
    const roughStep = durationSec / 8;
    const stepCandidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
    const step =
      stepCandidates.find((candidate) => candidate >= roughStep) ??
      stepCandidates[stepCandidates.length - 1];
    const ticks: number[] = [];
    for (let second = 0; second < durationSec; second += step) {
      ticks.push(second);
    }
    ticks.push(durationSec);

    return ticks.map((second, index, array) => ({
      ratio: durationSec > 0 ? second / durationSec : 0,
      label: formatMs(second * 1000),
      showLabel: index % 2 === 0 || index === array.length - 1,
    }));
  }, [audioDurationMs]);
  const waveformHoverTimeMs =
    waveformHoverRatio !== null ? waveformHoverRatio * audioDurationMs : null;

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!selectedSoundUrl) {
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
      setWaveformLoading(false);
      setWaveformReady(false);
      return;
    }

    const container = waveformCanvasRef.current;
    if (!container) return;

    let cancelled = false;
    let unsubscribeReady: (() => void) | void;
    let unsubscribeError: (() => void) | void;
    setWaveformReady(false);
    setWaveformLoading(true);

    void (async () => {
      try {
        const WaveSurfer = await loadWaveSurfer();
        if (cancelled) return;

        wavesurferRef.current?.destroy();
        const instance = WaveSurfer.create({
          container,
          height: 72,
          normalize: true,
          interact: false,
          autoCenter: false,
          autoScroll: false,
          barWidth: 2,
          barGap: 1,
          barRadius: 3,
          cursorWidth: 0,
          waveColor: "rgba(103, 232, 249, 0.55)",
          progressColor: "rgba(103, 232, 249, 0.55)",
        });
        wavesurferRef.current = instance;

        unsubscribeReady = instance.on("ready", () => {
          if (cancelled) return;
          setWaveformReady(true);
          setWaveformLoading(false);
        });
        unsubscribeError = instance.on("error", () => {
          if (cancelled) return;
          setWaveformReady(false);
          setWaveformLoading(false);
        });

        instance.load(selectedSoundUrl);
      } catch {
        if (!cancelled) {
          setWaveformReady(false);
          setWaveformLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (typeof unsubscribeReady === "function") {
        unsubscribeReady();
      }
      if (typeof unsubscribeError === "function") {
        unsubscribeError();
      }
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
  }, [selectedSoundUrl]);

  useEffect(() => {
    if (!audioEnabled || !audioReady || !waveformReady || audioDurationMs <= 0) {
      return;
    }
    const ratio = clamp(audioCurrentTimeMs / audioDurationMs, 0, 1);
    wavesurferRef.current?.seekTo(ratio);
  }, [audioEnabled, audioReady, waveformReady, audioCurrentTimeMs, audioDurationMs]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin({
        x: clamp(x, 0, 100),
        y: clamp(y, 0, 100),
      });

      const step = event.shiftKey ? 0.24 : 0.12;
      const direction = event.deltaY < 0 ? 1 : -1;
      setZoom((prev) =>
        Number(clamp(prev + direction * step, MIN_ZOOM, MAX_ZOOM).toFixed(2))
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const handlePlay = () => {
    if (!ready) {
      setStatus("準備中...");
      return;
    }

    if (isPlaying) {
      ref.current?.stop();
      setIsPlaying(false);
      setStatus("已停止");
      return;
    }

    resetZoom();
    resetView();
    setIsPlaying(true);
    setStatus("播放中...");
    requestAnimationFrame(() => {
      ref.current?.play(preset);
    });
  };

  const handleSeek = (nextProgress: number) => {
    const clamped = clamp(nextProgress, 0, 1);
    setProgress(clamped);
    setIsPlaying(false);
    setStatus("調整進度");
    ref.current?.seek(clamped, preset);
  };

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;

    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
      return;
    }

    if (!document.fullscreenElement) {
      await el.requestFullscreen();
    }
  };

  const resetZoom = () => {
    setZoom(MIN_ZOOM);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const resetView = () => {
    setCameraPanX(0);
    setCameraPanY(0);
    setIsDraggingView(false);
    dragRef.current.active = false;
  };

  const handlePreviewPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current.active = true;
    dragRef.current.startClientX = event.clientX;
    dragRef.current.startClientY = event.clientY;
    dragRef.current.startPanX = cameraPanX;
    dragRef.current.startPanY = cameraPanY;
    setIsDraggingView(true);
  };

  const handlePreviewPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!dragRef.current.active) return;

    const deltaX = event.clientX - dragRef.current.startClientX;
    const deltaY = event.clientY - dragRef.current.startClientY;
    const nextPanX = clamp(
      dragRef.current.startPanX - deltaX * CAMERA_PAN_PER_PIXEL,
      -MAX_CAMERA_PAN_X,
      MAX_CAMERA_PAN_X
    );
    const nextPanY = clamp(
      dragRef.current.startPanY + deltaY * CAMERA_PAN_PER_PIXEL,
      -MAX_CAMERA_PAN_Y,
      MAX_CAMERA_PAN_Y
    );
    setCameraPanX(nextPanX);
    setCameraPanY(nextPanY);
  };

  const handlePreviewPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.active = false;
    setIsDraggingView(false);
  };

  const sliderValue = Math.round(progress * 1000) / 10;
  const currentTime = duration * progress;

  const handleAudioSeek = useCallback((nextAudioProgressPercent: number) => {
    if (audioDurationMs <= 0) return;
    const clamped = clamp(nextAudioProgressPercent, 0, 100);
    const ratio = clamped / 100;
    ref.current?.seekSound(ratio);
    wavesurferRef.current?.seekTo(ratio);
  }, [audioDurationMs]);

  const getWaveformRatioByClientX = useCallback((clientX: number) => {
    const el = waveformRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }, []);

  const seekAudioByClientX = useCallback(
    (clientX: number) => {
      const ratio = getWaveformRatioByClientX(clientX);
      if (ratio === null) return;
      setWaveformHoverRatio(ratio);
      handleAudioSeek(ratio * 100);
    },
    [getWaveformRatioByClientX, handleAudioSeek]
  );

  const handleWaveformPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!audioEnabled || !audioReady || !waveformReady || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    waveformDragRef.current.active = true;
    seekAudioByClientX(event.clientX);
  };

  const handleWaveformPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const ratio = getWaveformRatioByClientX(event.clientX);
    if (ratio !== null) {
      setWaveformHoverRatio(ratio);
    }
    if (waveformDragRef.current.active) {
      seekAudioByClientX(event.clientX);
    }
  };

  const handleWaveformPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    waveformDragRef.current.active = false;
  };

  return (
    <section
      ref={shellRef}
      className={`relative isolate flex h-[calc(100vh-8rem)] min-h-[640px] w-full flex-col overflow-hidden bg-black shadow-2xl shadow-black/60 ${
        isFullscreen ? "rounded-none border-0" : "rounded-2xl border border-white/10"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(120,140,170,0.22),transparent_44%),radial-gradient(circle_at_80%_0%,rgba(255,150,70,0.2),transparent_38%)]" />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">React studio</Badge>
          <span className="text-sm font-semibold text-white">{currentLabel}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            {zoom.toFixed(2)}x
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            Pan X:{cameraPanX.toFixed(2)} Y:{cameraPanY.toFixed(2)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={resetZoom}
            disabled={zoom <= MIN_ZOOM + 0.01}
          >
            重設縮放
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={resetView}
            disabled={Math.abs(cameraPanX) < 0.01 && Math.abs(cameraPanY) < 0.01}
          >
            重設視角
          </Button>
          <Button size="sm" variant="outline" onClick={toggleFullscreen}>
            {isFullscreen ? "離開全螢幕" : "全螢幕"}
          </Button>
        </div>
      </header>

      <div
        ref={previewRef}
        className={`relative flex-1 overflow-hidden overscroll-contain ${
          isDraggingView ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handlePreviewPointerDown}
        onPointerMove={handlePreviewPointerMove}
        onPointerUp={handlePreviewPointerUp}
        onPointerCancel={handlePreviewPointerUp}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
            transition: "transform 120ms ease-out",
          }}
        >
          <DoorEntrance
            ref={ref}
            preset={preset}
            autoPlay={false}
            cameraPanX={cameraPanX}
            cameraPanY={cameraPanY}
            className="h-full w-full overflow-hidden rounded-none border-0 bg-gradient-to-br from-black via-slate-900 to-zinc-900"
            onComplete={() => {
              setIsPlaying(false);
              setStatus("播放完成");
              setProgress(1);
            }}
            onProgress={(next) => {
              setProgress(next);
            }}
            onSoundProgress={(sound) => {
              setAudioEnabled(sound.enabled);
              setAudioReady(sound.ready);
              setAudioDurationMs(sound.durationMs);
              setAudioCurrentTimeMs(sound.currentTimeMs);
            }}
            onReady={() => {
              setReady(true);
              setIsPlaying(false);
              setProgress(0);
              setStatus("等待播放");
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 text-xs text-white/65">
          <span className="rounded-full bg-black/45 px-3 py-1 backdrop-blur">
            滾輪可依滑鼠位置縮放，按住左鍵拖曳可水平/垂直移動視角（Z 軸固定）
          </span>
        </div>
      </div>

      <footer className="relative z-10 space-y-4 border-t border-white/10 bg-zinc-950/90 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>{formatMs(currentTime)}</span>
            <span>{formatMs(duration)}</span>
          </div>

          <div className="relative">
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={sliderValue}
              onInput={(event) => {
                handleSeek(Number((event.target as HTMLInputElement).value) / 100);
              }}
              onChange={(event) => {
                handleSeek(Number(event.target.value) / 100);
              }}
              disabled={!ready}
              className="h-2 w-full cursor-ew-resize appearance-none rounded-full accent-orange-400 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, rgb(251 146 60) 0%, rgb(251 146 60) ${sliderValue}%, rgba(255,255,255,0.14) ${sliderValue}%, rgba(255,255,255,0.14) 100%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              {progressMarkers.map((marker) => (
                <span
                  key={marker}
                  className="absolute h-3 w-px bg-white/40"
                  style={{ left: `${marker * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>Progress: {sliderValue}%</span>
            <span>Markers: {progressMarkers.map((marker) => `${Math.round(marker * 100)}%`).join(" • ")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>音效 {formatMs(audioCurrentTimeMs)}</span>
            <span>{formatMs(audioDurationMs)}</span>
          </div>

          <div
            ref={waveformRef}
            className={`relative h-24 select-none overflow-hidden rounded-lg border border-white/15 bg-black/35 ${
              audioEnabled && audioReady && waveformReady
                ? "cursor-ew-resize"
                : "cursor-not-allowed"
            }`}
            onPointerDown={handleWaveformPointerDown}
            onPointerMove={handleWaveformPointerMove}
            onPointerUp={handleWaveformPointerUp}
            onPointerCancel={handleWaveformPointerUp}
            onPointerLeave={() => {
              if (!waveformDragRef.current.active) {
                setWaveformHoverRatio(null);
              }
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:40px_100%]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-transparent to-white/5" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-5 border-b border-white/10">
              {audioRulerTicks.map((tick) => (
                <span
                  key={`audio-tick-${tick.ratio}`}
                  className="absolute inset-y-0"
                  style={{ left: `${tick.ratio * 100}%` }}
                >
                  <span className="absolute left-0 top-0 h-2 w-px bg-white/35" />
                  {tick.showLabel ? (
                    <span className="absolute left-1 top-0 text-[10px] text-white/60">
                      {tick.label}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-5">
              <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
              <div
                ref={waveformCanvasRef}
                className={`absolute inset-0 h-full w-full ${
                  waveformLoading ? "animate-pulse" : ""
                }`}
              />
            </div>
            <span
              className="pointer-events-none absolute inset-y-0 w-px bg-cyan-100/95 shadow-[0_0_8px_rgba(103,232,249,0.85)]"
              style={{ left: `${audioProgressPercent}%` }}
            />
            {waveformHoverRatio !== null ? (
              <>
                <span
                  className="pointer-events-none absolute inset-y-0 w-px bg-white/45"
                  style={{ left: `${waveformHoverRatio * 100}%` }}
                />
                <span
                  className="pointer-events-none absolute -top-0.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white/80"
                  style={{
                    left: `${waveformHoverRatio * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {formatMs(waveformHoverTimeMs ?? 0)}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>
              Audio:{" "}
              {audioEnabled
                ? audioReady && waveformReady
                  ? `${audioProgressPercent}%`
                  : waveformLoading
                    ? "分析音軌中..."
                    : audioReady
                      ? "載入波形..."
                    : "載入中..."
                : "此動畫無音效"}
            </span>
            <span>
              {audioEnabled
                ? audioReady && waveformReady
                  ? "Door open SFX · 拖曳音軌可定位"
                  : waveformLoading
                    ? "WaveSurfer decoding..."
                    : audioReady
                      ? "等待 WaveSurfer 載入"
                      : "等待音檔 metadata"
                : "Only door-single has sound"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handlePlay} disabled={!ready}>
            {isPlaying ? "停止" : "播放"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsPlaying(false);
              setProgress(0);
              setStatus("等待播放");
              ref.current?.reset(preset);
            }}
            disabled={!ready}
          >
            重置
          </Button>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            {status}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {doorEntrancePresets.map((entry) => (
            <Button
              key={entry.id}
              variant={entry.id === preset ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => {
                setPreset(entry.id);
                setIsPlaying(false);
                setProgress(0);
                setStatus("等待播放");
                resetZoom();
                resetView();
                ref.current?.reset(entry.id);
              }}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </footer>

    </section>
  );
};

export default ReactSample;
