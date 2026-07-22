import { SetMetadata } from "@nestjs/common";

import type { AddonKey } from "./addons";

export const REQUIRED_ADDONS_KEY = "requiredAddons";

export const RequireAddons = (...addons: AddonKey[]) =>
  SetMetadata(REQUIRED_ADDONS_KEY, addons);
