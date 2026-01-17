import {
  DoorAnimationConfig,
  DoorAnimationRenderer,
  DoorAnimationVariant,
} from "../types";
import { directEntryConfig, DirectEntryRenderer } from "./direct-entry";
import { topDownConfig, TopDownEntryRenderer } from "./top-down-entry";
import { doubleSwingConfig, DoubleSwingRenderer } from "./double-swing";
export * from "./shared";

export const doorAnimationConfigs: DoorAnimationConfig[] = [
  directEntryConfig,
  topDownConfig,
  doubleSwingConfig,
];

export const doorAnimationRenderers: Record<
  DoorAnimationVariant,
  DoorAnimationRenderer
> = {
  "direct-entry": DirectEntryRenderer,
  "top-down-entry": TopDownEntryRenderer,
  "double-swing": DoubleSwingRenderer,
};

export const doorAnimationMap: Record<DoorAnimationVariant, DoorAnimationConfig> =
  doorAnimationConfigs.reduce(
    (acc, config) => ({ ...acc, [config.id]: config }),
    {} as Record<DoorAnimationVariant, DoorAnimationConfig>
  );

export const getDoorAnimationConfig = (
  variant: DoorAnimationVariant = "direct-entry"
) => doorAnimationMap[variant] ?? doorAnimationConfigs[0];
