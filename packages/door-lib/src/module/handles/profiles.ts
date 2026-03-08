import { HandleProfileId } from "../types";

export type HandleMaterialSide = "front" | "double";

export interface HandleModelProfile {
  id: HandleProfileId;
  label: string;
  defaultModelUrl?: string;
  nodeNameCandidates: string[];
  defaultScale: number;
  scaleByNodeName?: Record<string, number>;
  pressNodeHints: string[];
  staticNodeHints: string[];
  sizeMultiplier: number;
  material: {
    color: string;
    metalness: number;
    roughness: number;
    side: HandleMaterialSide;
  };
}

export const DEFAULT_HANDLE_PROFILE_ID: HandleProfileId = "lever-l";

const COMMON_STATIC_HINTS = [
  "door_handle",
  "base",
  "panel",
  "plate",
  "backplate",
  "lock",
  "key",
  "screw",
  "rosette",
];

export const handleProfileMap: Record<HandleProfileId, HandleModelProfile> = {
  "lever-l": {
    id: "lever-l",
    label: "Lever L",
    defaultModelUrl: "models/door_handle_single.glb",
    nodeNameCandidates: [
      "door_handle",
      "Door Handle 3_1",
      "Metal Handle_7",
      "Object_6",
      "Object_18",
    ],
    defaultScale: 0.18,
    scaleByNodeName: {
      door_handle: 0.035,
    },
    pressNodeHints: ["handle", "lever", "grip"],
    staticNodeHints: COMMON_STATIC_HINTS,
    sizeMultiplier: 1.44,
    material: {
      color: "#6f665b",
      metalness: 0.72,
      roughness: 0.68,
      side: "front",
    },
  },
  "knob-round": {
    id: "knob-round",
    label: "Round Knob",
    defaultModelUrl: "models/door_handle_single.glb",
    nodeNameCandidates: ["knob", "round_knob", "Door Knob", "Object_6"],
    defaultScale: 0.2,
    pressNodeHints: ["knob", "grip"],
    staticNodeHints: COMMON_STATIC_HINTS,
    sizeMultiplier: 1.32,
    material: {
      color: "#756b5e",
      metalness: 0.68,
      roughness: 0.7,
      side: "front",
    },
  },
};

export const getHandleProfile = (
  profileId: HandleProfileId = DEFAULT_HANDLE_PROFILE_ID
): HandleModelProfile =>
  handleProfileMap[profileId] ?? handleProfileMap[DEFAULT_HANDLE_PROFILE_ID];
