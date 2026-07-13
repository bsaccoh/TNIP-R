import 'dart:math';
import '../core/models/app_models.dart';

final Random _rand = Random();

List<RoutePoint> generateMockPoints(int count, int baseRsrp) {
  List<RoutePoint> pts = [];
  double lat = 8.484;
  double lng = -13.234;
  int rsrp = baseRsrp;

  for (int i = 0; i < count; i++) {
    lat += sin(i / 10.0) * 0.0001;
    lng += cos(i / 10.0) * 0.0001;
    rsrp = rsrp + _rand.nextInt(5) - 2;
    if (rsrp > -60) rsrp = -60;
    if (rsrp < -115) rsrp = -115;

    final String q;
    if (rsrp >= -80) q = "excellent";
    else if (rsrp >= -90) q = "good";
    else if (rsrp >= -100) q = "fair";
    else q = "poor";

    pts.add(RoutePoint(
      lat: lat,
      lng: lng,
      rsrp: rsrp,
      sinr: 15 + _rand.nextInt(10),
      ping: 20 + _rand.nextInt(20),
      speed: 50.0 + _rand.nextDouble() * 120.0,
      quality: q,
      timestamp: DateTime.now().subtract(Duration(seconds: count - i)).toIso8601String(),
    ));
  }
  return pts;
}

final List<SessionItem> MOCK_HISTORY_SESSIONS = [
  SessionItem(
    id: 'dt-001',
    testName: 'Freetown Central Highway Drive',
    operatorName: 'Orange SL',
    technology: '5G-NSA',
    date: 'Jul 11, 2026',
    time: '09:14 AM',
    distance: 23.4,
    duration: '1h 12m',
    quality: 'GOOD',
    exported: true,
    points: generateMockPoints(80, -78),
  ),
  SessionItem(
    id: 'dt-002',
    testName: 'Aberdeen Beach QoS Sweep',
    operatorName: 'Africell SL',
    technology: '4G LTE',
    date: 'Jul 10, 2026',
    time: '03:22 PM',
    distance: 18.7,
    duration: '52m',
    quality: 'FAIR',
    exported: true,
    points: generateMockPoints(60, -92),
  ),
  SessionItem(
    id: 'dt-003',
    testName: 'Wilkinson Road Drive Test',
    operatorName: 'Orange SL',
    technology: '5G-NSA',
    date: 'Jul 9, 2026',
    time: '10:05 AM',
    distance: 31.2,
    duration: '1h 38m',
    quality: 'EXCELLENT',
    exported: false,
    points: generateMockPoints(100, -74),
  ),
  SessionItem(
    id: 'dt-004',
    testName: 'Kissy Bypass Drop Inspector',
    operatorName: 'Qcell SL',
    technology: '4G LTE',
    date: 'Jul 7, 2026',
    time: '02:47 PM',
    distance: 9.8,
    duration: '28m',
    quality: 'POOR',
    exported: false,
    points: generateMockPoints(45, -108),
  ),
  SessionItem(
    id: 'dt-005',
    testName: 'Lumley Market Signal Audit',
    operatorName: 'SierraTel',
    technology: '4G LTE',
    date: 'Jul 5, 2026',
    time: '08:30 AM',
    distance: 27.1,
    duration: '1h 22m',
    quality: 'GOOD',
    exported: true,
    points: generateMockPoints(75, -84),
  ),
];
