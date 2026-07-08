import { ALL_CAPABILITIES } from "./capabilities";

/** Admin holds every key; everyone else holds exactly their active plan's grants. */
export function resolveCapabilities(input: {
  isAdmin: boolean;
  planCapabilities: string[];
}): Set<string> {
  if (input.isAdmin) return new Set<string>(ALL_CAPABILITIES);
  return new Set<string>(input.planCapabilities);
}
