import {
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

const formatMs = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const ReactSample = () => {
  const [preset, setPreset] = useState<DoorEntrancePresetId>("door-single");
  const [status, setStatus] = useState("等待播放");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [cameraPanX, setCameraPanX] = useState(0);
  const [cameraPanY, setCameraPanY] = useState(0);
  const [isDraggingView, setIsDraggingView] = useState(false);
  const ref = useRef<DoorEntranceHandle>(null);
  const shellRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
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

  const currentLabel = useMemo(
    () => doorEntrancePresets.find((p) => p.id === preset)?.label ?? "Door",
    [preset]
  );
  const config = useMemo(
    () => getDoorAnimationConfig(getDoorEntrancePreset(preset).variant),
    [preset]
  );
  const progressMarkers = config.progressMarkers;
  const duration = config.duration;

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
    resetZoom();
    resetView();
    setStatus("播放中...");
    requestAnimationFrame(() => {
      ref.current?.play(preset);
    });
  };

  const handleSeek = (nextProgress: number) => {
    const clamped = clamp(nextProgress, 0, 1);
    setProgress(clamped);
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
              setStatus("播放完成");
              setProgress(1);
            }}
            onProgress={(next) => setProgress(next)}
            onReady={() => {
              setReady(true);
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

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handlePlay} disabled={!ready}>
            播放
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
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
