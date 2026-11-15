import type { ComponentProps } from "react";
import CameraAuthoringPanel from "@/components/CameraAuthoringPanel";
import { getDoorEntranceAnimationConfig, resolvePhoneCameraDraft } from "retro-horror-door";
import AnimationPreviewWorkbench from "./AnimationPreviewWorkbench";

const cameraAuthoring = {
  Panel: CameraAuthoringPanel,
  validateDraft: (preset, { cameraDraft, timingEvents, phoneFraming = {} }) => {
    getDoorEntranceAnimationConfig(preset, timingEvents, resolvePhoneCameraDraft(cameraDraft, phoneFraming));
  },
} satisfies NonNullable<ComponentProps<typeof AnimationPreviewWorkbench>["cameraAuthoring"]>;

const CalibrationAnimationPreviewWorkbench = (props: ComponentProps<typeof AnimationPreviewWorkbench>) => (
  <AnimationPreviewWorkbench {...props} cameraAuthoring={cameraAuthoring} />
);

export default CalibrationAnimationPreviewWorkbench;
