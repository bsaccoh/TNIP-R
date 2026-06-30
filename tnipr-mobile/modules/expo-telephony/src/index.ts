import { requireOptionalNativeModule } from 'expo-modules-core';

// Returns null in Expo Go or if the native build hasn't run yet
const ExpoTelephony = requireOptionalNativeModule('ExpoTelephony');

export interface SignalMetrics {
  /** LTE/NR reference signal received power (dBm), typically -140 to -44 */
  rsrp?: number | null;
  /** LTE/NR reference signal received quality (dB), typically -20 to -3 */
  rsrq?: number | null;
  /** Signal-to-interference-plus-noise ratio (dB) */
  sinr?: number | null;
  /** Downlink throughput estimated from TrafficStats (kbps) */
  dl_throughput?: number | null;
  /** Uplink throughput estimated from TrafficStats (kbps) */
  ul_throughput?: number | null;
  /** Detected radio technology: '2G' | '3G' | '4G' | '5G' */
  technology?: string | null;
  /** Error message if permission or hardware access failed */
  error?: string;
}

/**
 * Read live signal metrics from Android TelephonyManager.
 * Requires READ_PHONE_STATE permission.
 * Only available in a development build (not Expo Go).
 */
export async function getSignalMetrics(): Promise<SignalMetrics> {
  if (!ExpoTelephony) return {};
  return ExpoTelephony.getSignalStrength();
}
