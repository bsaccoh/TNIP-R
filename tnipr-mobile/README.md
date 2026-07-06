# TNIP-R Drive Tester Mobile App 🇸🇱

The native mobile application for the **Telecom Network Intelligence Platform (Regulatory Edition)**, used by field inspectors to conduct drive tests, measure cellular signal quality (RSRP, RSRQ, SINR, DL throughput), and sync telemetry data to the central database.

---

## ⚠️ Android-Only by Design

> [!IMPORTANT]
> **This application is designed and compiled for Android devices only.**
>
> - **Why iOS is unsupported:** Apple's iOS sandbox does not expose cell network telemetry APIs (such as RSRP, RSSI, cell towers IDs, LAC) to public App Store SDKs. It is technically impossible to auto-capture high-fidelity signal levels on iOS devices.
> - **iOS Fallback:** iOS devices will only run with manual entry panels or basic network checks, but will not capture automatic background signal telemetry. Do not spend development effort compiling or debugging for iOS platforms.

---

## Technical Stack & Native Modules

- **Core Framework:** React Native + Expo (v56+)
- **Routing:** Expo Router (File-based navigation)
- **State & UI:** React Hooks + Reanimated
- **Custom Native Module:** `expo-telephony` (located in `modules/expo-telephony`)
  - Interacts with Android `TelephonyManager` to query RSRP/RSRQ/SINR and computes mobile data throughput using `TrafficStats` byte differences.

---

## Get Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the app**
   ```bash
   npx expo start
   ```

3. **Run on an Android device/emulator**
   - Press `a` in the terminal to launch the Android emulator, or scan the QR code with the Expo Go app on a physical Android device.
   - Note: The custom native telephony module is only accessible on local Android development builds and physical hardware, not within standard Expo Go sandboxes.
