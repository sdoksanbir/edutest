import type { HeaderConfig } from "./corporateHeaderLayout";

/** Deneme kurum adı — test/yazılı brandName’den bağımsız */
export function applyTrialBrandToHeaderConfig(
  config: HeaderConfig,
  trialBrandName: string,
  trialBrandNameVisible: boolean,
): HeaderConfig {
  const fieldHidden = { ...(config.fieldHidden ?? {}) };
  if (trialBrandNameVisible) delete fieldHidden.brandName;
  else fieldHidden.brandName = true;
  return {
    ...config,
    brandName: trialBrandName,
    fieldHidden,
  };
}
