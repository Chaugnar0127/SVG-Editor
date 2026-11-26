import type { PluginContributions } from "./PluginContracts.js";

export class DuplicateRegistrationError extends Error {
  public constructor(public readonly category: keyof PluginContributions, public readonly registrationName: string) {
    super(`duplicate registration: ${category}/${registrationName}`);
  }
}
