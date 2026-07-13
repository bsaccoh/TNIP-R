import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../core/models/app_models.dart';
import '../../constants/mock_constants.dart';

// Helper mock generator
final Random _rand = Random();

// ── 1. SETTINGS PROVIDER ──────────────────────────────────────────────────
class SettingsNotifier extends StateNotifier<AppSettings> {
  SettingsNotifier() : super(const AppSettings());

  void updateSetting(AppSettings newSettings) {
    state = newSettings;
  }

  void resetAll() {
    state = const AppSettings();
  }
}

final settingsProvider = StateNotifierProvider<SettingsNotifier, AppSettings>((ref) {
  return SettingsNotifier();
});

// ── 2. DASHBOARD & TELEMETRY PROVIDER ─────────────────────────────────────
class DashboardState {
  final LiveMetric liveMetric;
  final bool isRecording;
  final int duration;
  final double distance;
  final List<RoutePoint> recordedPoints;
  final List<int> rsrpTrend;
  final List<int> sinrTrend;
  final List<int> rsrqTrend;

  const DashboardState({
    required this.liveMetric,
    required this.isRecording,
    required this.duration,
    required this.distance,
    required this.recordedPoints,
    required this.rsrpTrend,
    required this.sinrTrend,
    required this.rsrqTrend,
  });

  DashboardState copyWith({
    LiveMetric? liveMetric,
    bool? isRecording,
    int? duration,
    double? distance,
    List<RoutePoint>? recordedPoints,
    List<int>? rsrpTrend,
    List<int>? sinrTrend,
    List<int>? rsrqTrend,
  }) {
    return DashboardState(
      liveMetric: liveMetric ?? this.liveMetric,
      isRecording: isRecording ?? this.isRecording,
      duration: duration ?? this.duration,
      distance: distance ?? this.distance,
      recordedPoints: recordedPoints ?? this.recordedPoints,
      rsrpTrend: rsrpTrend ?? this.rsrpTrend,
      sinrTrend: sinrTrend ?? this.sinrTrend,
      rsrqTrend: rsrqTrend ?? this.rsrqTrend,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final Ref ref;
  Timer? _simTimer;
  int _ticks = 0;

  DashboardNotifier(this.ref) : super(DashboardState(
    liveMetric: LiveMetric.mockDefault(),
    isRecording: false,
    duration: 0,
    distance: 0.0,
    recordedPoints: const [],
    rsrpTrend: const [-79, -82, -81, -85, -81, -82, -80, -81],
    sinrTrend: const [15, 17, 16, 14, 18, 16, 17, 18],
    rsrqTrend: const [-10, -11, -9, -12, -10, -11, -9, -10],
  ));

  void startRecording() {
    _simTimer?.cancel();
    state = state.copyWith(
      isRecording: true,
      duration: 0,
      distance: 0.0,
      recordedPoints: [],
    );

    _simTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _ticks++;
      
      // Random walk for RSRP and signals
      final lastRsrp = state.liveMetric.rsrp;
      int nextRsrp = lastRsrp + _rand.nextInt(7) - 3;
      if (nextRsrp > -65) nextRsrp = -65;
      if (nextRsrp < -118) nextRsrp = -118;

      int nextSinr = 18 + ((nextRsrp + 80) * 0.35).round() + _rand.nextInt(5) - 2;
      if (nextSinr > 30) nextSinr = 30;
      if (nextSinr < -10) nextSinr = -10;

      int nextRsrq = -10 + ((nextRsrp + 80) * 0.12).round() + _rand.nextInt(3) - 1;
      if (nextRsrq > -3) nextRsrq = -3;
      if (nextRsrq < -20) nextRsrq = -20;

      bool handover = _rand.nextDouble() < 0.06;
      int nextPci = state.liveMetric.pci;
      if (handover) {
        final pcis = [102, 304, 88, 412, 219];
        nextPci = pcis[_rand.nextInt(pcis.length)];
        
        // Push handover alert
        ref.read(alertsProvider.notifier).addAlert(
          severity: "info",
          title: "Cell Handover Event",
          desc: "Technology sector handover to PCI $nextPci completed",
          coordinates: "8.4842, -13.2315",
        );
      }

      if (nextRsrp < -105 && lastRsrp >= -105) {
        ref.read(alertsProvider.notifier).addAlert(
          severity: "warning",
          title: "Poor Signal Detected",
          desc: "RSRP dropped below -105 dBm (PCI $nextPci)",
          coordinates: "8.4845, -13.2321",
        );
      }

      final nextMetric = LiveMetric(
        technology: nextRsrp > -92 && _rand.nextDouble() > 0.1 ? "5G-NSA" : "4G LTE",
        carrier: state.liveMetric.carrier,
        rsrp: nextRsrp,
        sinr: nextSinr,
        rsrq: nextRsrq,
        pci: nextPci,
        earfcn: state.liveMetric.earfcn,
        gpsAccuracy: 1.8 + _rand.nextDouble() * 1.5,
        gpsSatellites: 12 + _rand.nextInt(4) - 2,
        speed: 80.0 + _rand.nextDouble() * 40.0,
        ping: 25 + _rand.nextInt(10),
      );

      final nextPoint = RoutePoint(
        lat: 8.484 + sin(_ticks / 10.0) * 0.002,
        lng: -13.234 + cos(_ticks / 10.0) * 0.002,
        rsrp: nextRsrp,
        sinr: nextSinr,
        ping: nextMetric.ping,
        speed: nextMetric.speed,
        quality: nextMetric.rsrpQuality,
        timestamp: DateTime.now().toIso8601String(),
        handover: handover,
      );

      state = state.copyWith(
        liveMetric: nextMetric,
        duration: state.duration + 1,
        distance: state.distance + 0.015, // speed increment proxy
        recordedPoints: [...state.recordedPoints, nextPoint],
        rsrpTrend: [...state.rsrpTrend.sublist(1), nextRsrp],
        sinrTrend: [...state.sinrTrend.sublist(1), nextSinr],
        rsrqTrend: [...state.rsrqTrend.sublist(1), nextRsrq],
      );
    });
  }

  void stopRecording(String sessionName) {
    _simTimer?.cancel();
    if (state.recordedPoints.isNotEmpty) {
      final newSession = SessionItem(
        id: "dt-${DateTime.now().millisecondsSinceEpoch}",
        testName: sessionName,
        operatorName: state.liveMetric.carrier,
        technology: state.liveMetric.technology,
        date: "Jul 11, 2026",
        time: DateTime.now().toLocal().toString().substring(11, 16),
        distance: double.parse(state.distance.toStringAsFixed(1)),
        duration: "${(state.duration ~/ 60)}m ${(state.duration % 60)}s",
        quality: state.liveMetric.rsrpQuality.toUpperCase(),
        exported: false,
        points: [...state.recordedPoints],
      );
      ref.read(historyProvider.notifier).addSession(newSession);
    }
    state = state.copyWith(isRecording: false);
  }
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier(ref);
});

// ── 3. SPEED TEST PROVIDER ────────────────────────────────────────────────
class SpeedTestState {
  final double currentSpeed;
  final String phase; // idle, ping, downloading, uploading, complete
  final double downloadResult;
  final double uploadResult;
  final int pingResult;
  final int jitterResult;
  final bool isRunning;
  final List<double> chartPoints;

  const SpeedTestState({
    this.currentSpeed = 0.0,
    this.phase = "idle",
    this.downloadResult = 0.0,
    this.uploadResult = 0.0,
    this.pingResult = 0,
    this.jitterResult = 0,
    this.isRunning = false,
    this.chartPoints = const [],
  });

  SpeedTestState copyWith({
    double? currentSpeed,
    String? phase,
    double? downloadResult,
    double? uploadResult,
    int? pingResult,
    int? jitterResult,
    bool? isRunning,
    List<double>? chartPoints,
  }) {
    return SpeedTestState(
      currentSpeed: currentSpeed ?? this.currentSpeed,
      phase: phase ?? this.phase,
      downloadResult: downloadResult ?? this.downloadResult,
      uploadResult: uploadResult ?? this.uploadResult,
      pingResult: pingResult ?? this.pingResult,
      jitterResult: jitterResult ?? this.jitterResult,
      isRunning: isRunning ?? this.isRunning,
      chartPoints: chartPoints ?? this.chartPoints,
    );
  }
}

class SpeedTestNotifier extends StateNotifier<SpeedTestState> {
  bool _cancelled = false;

  // Cloudflare public CDN endpoints to measure actual real-world internet speed (matches Ookla)
  static const String _pingUrl = 'https://speed.cloudflare.com/__down?bytes=0';
  static const String _downloadUrl = 'https://speed.cloudflare.com/__down?bytes=10485760'; // 10MB
  static const String _uploadUrl = 'https://speed.cloudflare.com/__up';

  SpeedTestNotifier() : super(const SpeedTestState());

  void startTest() async {
    _cancelled = false;
    state = const SpeedTestState(isRunning: true, phase: "ping");

    try {
      // Test backend connectivity (1.5 seconds timeout limit)
      final pingResponse = await http.get(Uri.parse(_pingUrl)).timeout(const Duration(milliseconds: 1500));
      if (pingResponse.statusCode != 200) {
        throw Exception("Server offline");
      }

      // ─── Phase 1: Ping (best of 5 attempts) ───
      final pings = <int>[];
      for (int i = 0; i < 5; i++) {
        if (_cancelled) return;
        final sw = Stopwatch()..start();
        await http.get(Uri.parse(_pingUrl));
        sw.stop();
        pings.add(sw.elapsedMilliseconds);
      }
      pings.sort();
      final bestPing = pings.first;
      final jitter = pings.last - pings.first;

      if (_cancelled) return;
      state = state.copyWith(
        phase: "downloading",
        pingResult: bestPing,
        jitterResult: jitter,
      );

      // ─── Phase 2: Download (streamed, measure real throughput) ───
      final dlSpeed = await _measureDownload();
      if (_cancelled) return;

      state = state.copyWith(
        phase: "uploading",
        downloadResult: dlSpeed,
        currentSpeed: 0.0,
        chartPoints: [],
      );

      // ─── Phase 3: Upload (POST real bytes, measure throughput) ───
      final ulSpeed = await _measureUpload();
      if (_cancelled) return;

      state = state.copyWith(
        phase: "complete",
        uploadResult: ulSpeed,
        currentSpeed: 0.0,
        isRunning: false,
      );
    } catch (e) {
      // ─── Fallback to simulated speeds if connection fails / timeout ───
      if (_cancelled) return;
      
      // 1. Simulated Ping phase
      await Future.delayed(const Duration(milliseconds: 1200));
      if (_cancelled) return;
      state = state.copyWith(
        phase: "downloading",
        pingResult: 18 + _rand.nextInt(12),
        jitterResult: 1 + _rand.nextInt(3),
      );

      // 2. Simulated Download phase
      int dlTicks = 0;
      List<double> dlPoints = [];
      while (dlTicks < 25) {
        if (_cancelled) return;
        await Future.delayed(const Duration(milliseconds: 160));
        dlTicks++;
        final progressPct = dlTicks / 25.0;
        double speed = 12.0 + sin(progressPct * pi) * 4.0 + _rand.nextDouble() * 2.0;
        speed = max(2, speed);
        dlPoints.add(speed);
        state = state.copyWith(
          currentSpeed: speed,
          chartPoints: [...state.chartPoints, speed],
        );
      }
      final dlAvg = dlPoints.reduce((a, b) => a + b) / dlPoints.length;
      if (_cancelled) return;

      state = state.copyWith(
        phase: "uploading",
        downloadResult: dlAvg,
        currentSpeed: 0.0,
        chartPoints: [],
      );

      // 3. Simulated Upload phase
      int ulTicks = 0;
      List<double> ulPoints = [];
      while (ulTicks < 25) {
        if (_cancelled) return;
        await Future.delayed(const Duration(milliseconds: 160));
        ulTicks++;
        final progressPct = ulTicks / 25.0;
        double speed = 4.0 + sin(progressPct * pi) * 1.5 + _rand.nextDouble() * 1.0;
        speed = max(1, speed);
        ulPoints.add(speed);
        state = state.copyWith(
          currentSpeed: speed,
          chartPoints: [...state.chartPoints, speed],
        );
      }
      final ulAvg = ulPoints.reduce((a, b) => a + b) / ulPoints.length;
      if (_cancelled) return;

      state = state.copyWith(
        phase: "complete",
        uploadResult: ulAvg,
        currentSpeed: 0.0,
        isRunning: false,
      );
    }
  }

  Future<double> _measureDownload() async {
    final client = http.Client();
    final request = http.Request('GET', Uri.parse(_downloadUrl));
    final response = await client.send(request);

    int received = 0;
    final sw = Stopwatch()..start();
    final List<double> speeds = [];

    await for (final chunk in response.stream) {
      if (_cancelled) {
        client.close();
        return 0;
      }
      received += chunk.length;
      final elapsedSec = sw.elapsedMilliseconds / 1000.0;
      if (elapsedSec > 0) {
        final mbps = (received * 8) / (elapsedSec * 1000000);
        speeds.add(mbps);
        state = state.copyWith(
          currentSpeed: mbps,
          chartPoints: [...state.chartPoints, mbps],
        );
      }
      // Max 10 seconds download limit to keep test duration reasonable
      if (sw.elapsedMilliseconds >= 10000) {
        break;
      }
    }
    sw.stop();
    client.close();

    final elapsedSec = sw.elapsedMilliseconds / 1000.0;
    if (elapsedSec <= 0) return 0;
    return (received * 8) / (elapsedSec * 1000000);
  }

  Future<double> _measureUpload() async {
    const uploadSize = 2 * 1024 * 1024; // 2MB is optimal for mobile upload test
    final payload = Uint8List(uploadSize);

    final sw = Stopwatch()..start();
    await http.post(
      Uri.parse(_uploadUrl),
      headers: {'Content-Type': 'application/octet-stream'},
      body: payload,
    );
    sw.stop();

    final elapsedSec = sw.elapsedMilliseconds / 1000.0;
    if (elapsedSec <= 0) return 0;
    final mbps = (uploadSize * 8) / (elapsedSec * 1000000);

    state = state.copyWith(
      currentSpeed: mbps,
      chartPoints: [...state.chartPoints, mbps],
    );
    return mbps;
  }

  void stopTest() {
    _cancelled = true;
    state = const SpeedTestState();
  }
}

final speedTestProvider = StateNotifierProvider<SpeedTestNotifier, SpeedTestState>((ref) {
  return SpeedTestNotifier();
});

// ── 4. HISTORY & SESSIONS PROVIDER ────────────────────────────────────────
class HistoryNotifier extends StateNotifier<List<SessionItem>> {
  HistoryNotifier() : super(MOCK_HISTORY_SESSIONS);

  void addSession(SessionItem item) {
    state = [item, ...state];
  }

  Future<void> saveAndSyncSession(SessionItem item, {int? operatorId}) async {
    // 1. Save locally immediately
    state = [item, ...state];

    // 2. Automatically sync to backend (live test api)
    try {
      const String baseDtUrl = 'http://10.0.2.2:4000/api/drive-tests';
      final body = {
        'operator_id': operatorId ?? 1,
        'test_name': item.testName,
        'test_date': item.date,
        'route_type': item.testName,
        'technology': item.technology,
        'device_model': 'Android Emulator',
        'tester_name': 'Engineer',
        'notes': 'Recorded via mobile app client',
      };

      final response = await http.post(
        Uri.parse('$baseDtUrl/live'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      ).timeout(const Duration(milliseconds: 1500));

      if (response.statusCode == 201) {
        final resData = json.decode(response.body);
        final liveId = resData['driveTestId'] ?? resData['id'];

        if (liveId != null) {
          // Sync sample readings
          final samples = item.points.map((p) => {
            'ts': DateTime.now().toIso8601String(),
            'lat': p.lat,
            'lng': p.lng,
            'rsrp': p.rsrp,
            'rsrq': -10,
            'sinr': p.sinr,
            'technology': item.technology,
          }).toList();

          await http.post(
            Uri.parse('$baseDtUrl/live/$liveId/samples'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'samples': samples}),
          ).timeout(const Duration(milliseconds: 1500));

          // End the live session
          await http.put(Uri.parse('$baseDtUrl/live/$liveId/end')).timeout(const Duration(milliseconds: 1500));
        }
      }
    } catch (_) {
      // Sync failed (offline resilience): remains saved locally on device
    }
  }

  void deleteSession(String id) {
    state = state.filter((s) => s.id != id);
  }

  void markAsExported(String id) {
    state = state.map((s) => s.id == id ? s.copyWith(exported: true) : s).toList();
  }
}

final historyProvider = StateNotifierProvider<HistoryNotifier, List<SessionItem>>((ref) {
  return HistoryNotifier();
});

// ── 5. ALERTS & EVENTS PROVIDER ───────────────────────────────────────────
class AlertsState {
  final List<AlertEvent> alerts;
  final String activeFilter;

  const AlertsState({
    required this.alerts,
    this.activeFilter = "All",
  });

  AlertsState copyWith({
    List<AlertEvent>? alerts,
    String? activeFilter,
  }) {
    return AlertsState(
      alerts: alerts ?? this.alerts,
      activeFilter: activeFilter ?? this.activeFilter,
    );
  }
}

class AlertsNotifier extends StateNotifier<AlertsState> {
  AlertsNotifier() : super(AlertsState(alerts: _initialMockAlerts()));

  void addAlert({
    required String severity,
    required String title,
    required String desc,
    String? coordinates,
  }) {
    final now = DateTime.now().toLocal();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
    final newAlert = AlertEvent(
      id: "alert-${DateTime.now().millisecondsSinceEpoch}",
      severity: severity,
      title: title,
      description: desc,
      timestamp: timeStr,
      coordinates: coordinates,
    );
    state = state.copyWith(alerts: [newAlert, ...state.alerts]);
  }

  void dismissAlert(String id) {
    state = state.copyWith(alerts: state.alerts.filter((a) => a.id != id));
  }

  void clearAll() {
    state = state.copyWith(alerts: const []);
  }

  void setFilter(String filter) {
    state = state.copyWith(activeFilter: filter);
  }

  static List<AlertEvent> _initialMockAlerts() {
    return const [
      AlertEvent(
        id: "alert-1",
        severity: "error",
        title: "Call Drop Event",
        description: "Active VoLTE session dropped at sector index 4",
        timestamp: "09:14:24",
        coordinates: "8.4845, -13.2341",
      ),
      AlertEvent(
        id: "alert-2",
        severity: "warning",
        title: "Poor Signal Detected",
        description: "RSRP value degraded below -112 dBm on sector PCI 304",
        timestamp: "09:10:02",
        coordinates: "8.4839, -13.2321",
      ),
      AlertEvent(
        id: "alert-3",
        severity: "info",
        title: "5G to 4G Handover",
        description: "RAT fallback completed sector PCI 102 -> 304",
        timestamp: "09:05:47",
        coordinates: "8.4822, -13.2305",
      ),
      AlertEvent(
        id: "alert-4",
        severity: "success",
        title: "4G to 5G Upgrade",
        description: "Technology upgrade NR NSA band n78 lock established",
        timestamp: "08:58:12",
        coordinates: "8.4811, -13.2289",
      ),
    ];
  }
}

final alertsProvider = StateNotifierProvider<AlertsNotifier, AlertsState>((ref) {
  return AlertsNotifier();
});

// ── 6. DRIVE TEST CAMPAIGNS (ASSIGNED TASKS) PROVIDER ─────────────────────
class CampaignItem {
  final int id;
  final String reference;
  final String name;
  final String description;
  final String operatorName;
  final int operatorId;
  final String targetArea;
  final String technology;
  final String status; // 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  final String plannedStart;
  final String plannedEnd;

  const CampaignItem({
    required this.id,
    required this.reference,
    required this.name,
    required this.description,
    required this.operatorName,
    required this.operatorId,
    required this.targetArea,
    required this.technology,
    required this.status,
    required this.plannedStart,
    required this.plannedEnd,
  });

  CampaignItem copyWith({
    String? status,
  }) {
    return CampaignItem(
      id: id,
      reference: reference,
      name: name,
      description: description,
      operatorName: operatorName,
      operatorId: operatorId,
      targetArea: targetArea,
      technology: technology,
      status: status ?? this.status,
      plannedStart: plannedStart,
      plannedEnd: plannedEnd,
    );
  }
}

class CampaignsNotifier extends StateNotifier<List<CampaignItem>> {
  CampaignsNotifier() : super(_initialMockCampaigns()) {
    fetchCampaigns();
  }

  static const String _baseUrl = 'http://10.0.2.2:4000/api/dt-campaigns';

  Future<void> fetchCampaigns() async {
    try {
      final response = await http.get(Uri.parse(_baseUrl)).timeout(const Duration(milliseconds: 1500));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data != null && data['rows'] != null) {
          final List rows = data['rows'];
          final List<CampaignItem> loaded = [];
          for (var item in rows) {
            loaded.add(CampaignItem(
              id: item['campaign_id'] ?? 0,
              reference: item['campaign_ref'] ?? '',
              name: item['name'] ?? '',
              description: item['description'] ?? '',
              operatorName: item['operator_name'] ?? 'Unknown',
              operatorId: item['operator_id'] ?? 0,
              targetArea: item['target_area'] ?? '',
              technology: item['technology'] ?? 'LTE',
              status: item['status'] ?? 'PLANNING',
              plannedStart: item['planned_start'] ?? '',
              plannedEnd: item['planned_end'] ?? '',
            ));
          }
          if (loaded.isNotEmpty) {
            state = loaded;
          }
        }
      }
    } catch (_) {
      // Offline fallback: keep mock campaigns
    }
  }

  Future<void> updateStatus(int id, String status) async {
    // 1. Update status locally
    state = state.map((c) => c.id == id ? c.copyWith(status: status) : c).toList();

    // 2. Try to sync to backend
    try {
      final uri = Uri.parse('$_baseUrl/$id/status');
      await http.put(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'status': status}),
      ).timeout(const Duration(milliseconds: 1500));
    } catch (_) {
      // Sync failed (offline): remains locally updated on device
    }
  }

  static List<CampaignItem> _initialMockCampaigns() {
    return const [
      CampaignItem(
        id: 1,
        reference: "DT-CAMP-2025-001",
        name: "Freetown Urban KPI Audit",
        description: "Obligation compliance audit of Orange 4G coverage and latency around Central Freetown and Lumley Beach road.",
        operatorName: "Orange",
        operatorId: 2,
        targetArea: "Western Area Urban",
        technology: "LTE",
        status: "PLANNING",
        plannedStart: "2025-07-12",
        plannedEnd: "2025-07-20",
      ),
      CampaignItem(
        id: 2,
        reference: "DT-CAMP-2025-002",
        name: "Bo-Kenema Highway Latency Check",
        description: "Regulatory drive test verification of Africell cellular performance along the Bo-Kenema route.",
        operatorName: "Africell",
        operatorId: 3,
        targetArea: "Southern Province",
        technology: "LTE",
        status: "PLANNING",
        plannedStart: "2025-07-15",
        plannedEnd: "2025-07-25",
      ),
      CampaignItem(
        id: 3,
        reference: "DT-CAMP-2025-003",
        name: "Waterloo Rural Coverage Survey",
        description: "Assess Sierra Tel signals in Waterloo and neighboring rural sectors to verify base station reach.",
        operatorName: "Sierra Tel",
        operatorId: 1,
        targetArea: "Western Area Rural",
        technology: "LTE",
        status: "PLANNING",
        plannedStart: "2025-07-18",
        plannedEnd: "2025-07-28",
      ),
    ];
  }
}

final campaignsProvider = StateNotifierProvider<CampaignsNotifier, List<CampaignItem>>((ref) {
  return CampaignsNotifier();
});

// Helper collection filters extension
extension ListFilters<T> on List<T> {
  List<T> filter(bool Function(T) test) {
    final filtered = <T>[];
    for (var element in this) {
      if (test(element)) {
        filtered.add(element);
      }
    }
    return filtered;
  }
}
