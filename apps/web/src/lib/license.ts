import { LICENSE_PATTERN } from "../config.ts";

export function normalizeLicense(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidLicense(value: string): boolean {
  return LICENSE_PATTERN.test(normalizeLicense(value));
}
