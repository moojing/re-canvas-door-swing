import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import {
  mountDoorEntrance,
  type DoorEntranceHandle,
  type DoorEntrancePresetId,
  type DoorPreviewOverrides,
} from "retro-horror-door";

export type DeviceAnimationPreviewHandle = Pick<DoorEntranceHandle,
  "play" | "stop" | "reset" | "seek" | "setPreviewOverrides"
>;

const devices = [
  { label: "Desktop", width: 1440, height: 900 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Phone", width: 390, height: 844 },
];

const DeviceViewport = ({ label, width, height, setTarget }: typeof devices[number] & {
  setTarget: (target: HTMLDivElement | null) => void;
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const viewport = viewportRef.current;
    if (!frame || !viewport) return;
    const resize = () => {
      viewport.style.transform = `scale(${frame.clientWidth / width})`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width]);

  return (
    <figure className="min-w-0 self-start overflow-hidden border border-[#4b3928] bg-black">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-[#4b3928] bg-[#100d0a] px-3 py-3 text-xs">
        <span className="font-semibold text-[#f1e7d6]">{label}</span>
        <span className="font-mono text-[#aa9f90]">{width} × {height}</span>
      </figcaption>
      <div ref={frameRef} className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
        <div ref={viewportRef} className="absolute left-0 top-0 origin-top-left" style={{ width, height }}>
          <div ref={setTarget} role="img" aria-label={`${label} animation preview`} className="h-full w-full" />
        </div>
      </div>
    </figure>
  );
};

const DeviceAnimationPreview = forwardRef<DeviceAnimationPreviewHandle, {
  presetId: DoorEntrancePresetId;
  comparison: boolean;
  onProgress: (progress: number) => void;
  onReadyChange: (ready: boolean) => void;
}>(({ presetId, comparison, onProgress, onReadyChange }, ref) => {
  const targets = useRef<(HTMLDivElement | null)[]>([]);
  const handles = useRef<DoorEntranceHandle[]>([]);
  const progress = useRef(0);
  const overrides = useRef<DoorPreviewOverrides>({});

  useImperativeHandle(ref, () => ({
    play: () => handles.current[0]?.play(),
    stop: () => handles.current.forEach((handle) => handle.stop()),
    reset: () => {
      // Followers first: the master emits the final shared progress.
      handles.current.slice().reverse().forEach((handle) => handle.reset());
    },
    seek: (value) => handles.current[0]?.seek(value),
    setPreviewOverrides: (next) => {
      overrides.current = next;
      // Each handle preserves elapsed time when duration changes. Convert the
      // followers first, then let the master's progress synchronize the result.
      handles.current.slice().reverse().forEach((handle) => handle.setPreviewOverrides(next));
    },
  }), []);

  useEffect(() => {
    const initialProgress = progress.current;
    const mounted: DoorEntranceHandle[] = [];
    let active = true;
    let initializing = true;
    let readyCount = 0;
    onReadyChange(false);

    const count = comparison ? devices.length : 1;
    for (let index = 0; index < count; index++) {
      const target = targets.current[index];
      if (!target) continue;
      const handle = mountDoorEntrance({
        target,
        preset: presetId,
        autoPlay: false,
        className: comparison
          ? "h-full w-full border-0 bg-black"
          : "h-full min-h-[360px] w-full border-0 bg-black",
        ...(index > 0 ? { soundUrl: "" } : {}),
        onReady: () => {
          if (!active) return;
          handle.setPreviewOverrides(overrides.current);
          handle.seek(initialProgress);
          readyCount++;
          if (readyCount === count) {
            initializing = false;
            mounted[0].seek(initialProgress);
            onReadyChange(true);
          }
        },
        onProgress: index === 0 ? (value) => {
          if (!active || initializing) return;
          progress.current = value;
          mounted.slice(1).forEach((follower) => follower.seek(value));
          onProgress(value);
        } : undefined,
      });
      mounted.push(handle);
    }
    handles.current = mounted;

    return () => {
      active = false;
      mounted.forEach((handle) => handle.unmount());
      handles.current = [];
    };
  }, [presetId, comparison, onProgress, onReadyChange]);

  return comparison ? (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.75fr)_minmax(0,0.462fr)]" aria-label="Device comparison">
      {devices.map((device, index) => (
        <DeviceViewport key={device.label} {...device} setTarget={(target) => { targets.current[index] = target; }} />
      ))}
    </div>
  ) : (
    <div className="relative min-h-[50vh] bg-black sm:min-h-[64vh]">
      <div ref={(target) => { targets.current[0] = target; }} className="absolute inset-0" />
    </div>
  );
});

DeviceAnimationPreview.displayName = "DeviceAnimationPreview";
export default DeviceAnimationPreview;
