import { useEffect, useRef } from "react";
import {
  mountDoorEntrance,
  type DoorEntranceHandle,
  type DoorEntrancePreset,
} from "retro-horror-door";

type PresetAnimationPreviewProps = {
  preset: DoorEntrancePreset;
  progress?: number;
};

const PresetAnimationPreview = ({
  preset,
  progress = 0,
}: PresetAnimationPreviewProps) => {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const door: DoorEntranceHandle = mountDoorEntrance({
      target,
      preset: preset.id,
      autoPlay: false,
      className: "h-full min-h-0 w-full border-0 bg-black",
    });
    if (progress) door.seek(progress);

    return () => door.unmount();
  }, [preset.id, progress]);

  return (
    <div
      role="img"
      aria-label={`${preset.label} animation preview`}
      className="relative h-full min-h-0 w-full overflow-hidden bg-black"
    >
      <div ref={targetRef} className="absolute inset-0" />
    </div>
  );
};

export default PresetAnimationPreview;
