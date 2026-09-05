import type { EffectiveModuleState } from '@/services/moduleLicensing.service';

/**
 * Public/admin API projection for module licensing state.
 *
 * The SHA-256 license-key digest is intentionally retained only inside the
 * licensing service/persistence layer. Callers need to know whether a key is
 * present, never the digest itself.
 */
export function toPublicModuleState(state: EffectiveModuleState) {
  const { licenseKeyHash, ...publicState } = state;
  return {
    ...publicState,
    licenseKeyPresent: Boolean(licenseKeyHash),
  };
}

export function toPublicModuleStates(states: EffectiveModuleState[]) {
  return states.map(toPublicModuleState);
}
