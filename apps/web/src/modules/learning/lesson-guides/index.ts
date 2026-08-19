import { assemblyGuides } from "./assembly-guides";
import { coreGuides } from "./core-guides";
import { graphicsGuides } from "./graphics-guides";
import { memoryNetworkGuides } from "./memory-network-guides";
import { reverseSecurityGuides } from "./reverse-security-guides";
import { gameSecurityGuides } from "./game-security-guides";
import { securityResearchGuides } from "./security-research-guides";
import type { GuideMap, ModuleGuide } from "./types";
import { windowsGuides } from "./windows-guides";

export type { GuideCode, GuideStep, ModuleGuide } from "./types";

export const lessonGuides: GuideMap = {
  ...coreGuides,
  ...memoryNetworkGuides,
  ...reverseSecurityGuides,
  ...assemblyGuides,
  ...windowsGuides,
  ...graphicsGuides,
  ...securityResearchGuides,
  ...gameSecurityGuides
};

export function getModuleGuide(moduleId: string): ModuleGuide | undefined {
  return lessonGuides[moduleId];
}
