# TNIP-R Telecom Drive Test Mobile Application

A premium, cross-platform mobile application frontend for Telecom Drive Test, QoS, and QoE operations, built in Flutter.

## 🚀 Key Features
- **Live Telemetry & Dashboard**: Network performance metrics monitoring (RSRP, SINR, RSRQ, PCI, and GPS accuracy) with animated progress gauges and history sparklines.
- **GIS Route Map**: Route path tracking with segment-by-segment color-coded signal maps and locator circles.
- **QoS/QoE Suites**: Dedicated speed testing dial animations, DNS/TTFB waterfall waterfalls, and video stream diagnostics.
- **Historical logs database**: A database of drive sessions containing CSV logs generation and Google Earth KML GIS route export.
- **Operational Alarm logger**: Handover eventTimeline trackers, signal degredations, and drop log alarms.

## 📦 Project Setup & Build

### Prerequisites
1. Ensure the Flutter SDK is installed (`>= 3.0.0`).
2. Verify Android Studio or Xcode is configured for mobile development.

### Setup Instructions
Run the following commands inside the `mobile/` directory:

```bash
# 1. Fetch package dependencies
flutter pub get

# 2. Run state model generators (if using code generation)
flutter pub run build_runner build --delete-conflicting-outputs

# 3. Launch the app on connected emulator or device
flutter run
```

## 📂 Project Architecture
The project is structured following the **Feature-First** architecture pattern:

```
lib/
  main.dart             # App Entry point
  app/
    app.dart            # Main MaterialApp configuration
    router/             # GoRouter setup for all 16 screens
    theme/              # Colors, fonts, spacing and theme templates
    providers/          # Master Riverpod state Notifiers for drive simulations
  core/
    models/             # Declarations of data models (RSRP, Session, GPS)
    widgets/            # Reusable components (AppScaffold, badges, metric cards)
  features/             # Modules: dashboard, map, tests, settings, history, cell details, alerts
  shared/
    charts/             # fl_chart implementations (Sparkline, area signals, speed dial needle)
```
