import {
  DoorAnimationConfig,
  DoorAnimationRenderer,
  DoorAnimationVariant,
} from "../types";
import { directEntryConfig, DirectEntryRenderer } from "./direct-entry";
import {
  singleTopDownConfig,
  SingleTopDownEntryRenderer,
} from "./top-down-entry";
import { doubleSwingConfig, DoubleSwingRenderer } from "./double-swing";
export * from "./shared";

export const doorAnimationConfigs: DoorAnimationConfig[] = [
  directEntryConfig,
  singleTopDownConfig,
  doubleSwingConfig,
];

export const doorAnimationRenderers: Record<
  DoorAnimationVariant,
  DoorAnimationRenderer
> = {
  "direct-entry": DirectEntryRenderer,
  "single-top-down-entry": SingleTopDownEntryRenderer,
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
