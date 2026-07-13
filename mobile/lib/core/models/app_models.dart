import 'package:flutter/material.dart';

class LiveMetric {
  final String technology;
  final String carrier;
  final int rsrp;
  final int sinr;
  final int rsrq;
  final int pci;
  final int earfcn;
  final double gpsAccuracy;
  final int gpsSatellites;
  final double speed;
  final int ping;

  const LiveMetric({
    required this.technology,
    required this.carrier,
    required this.rsrp,
    required this.sinr,
    required this.rsrq,
    required this.pci,
    required this.earfcn,
    required this.gpsAccuracy,
    required this.gpsSatellites,
    this.speed = 0.0,
    this.ping = 0,
  });

  String get rsrpQuality {
    if (rsrp >= -80) return 'excellent';
    if (rsrp >= -90) return 'good';
    if (rsrp >= -100) return 'fair';
    return 'poor';
  }

  factory LiveMetric.mockDefault() {
    return const LiveMetric(
      technology: "5G-NSA",
      carrier: "Orange SL",
      rsrp: -81,
      sinr: 16,
      rsrq: -8,
      pci: 234,
      earfcn: 2850,
      gpsAccuracy: 2.1,
      gpsSatellites: 12,
      speed: 185.0,
      ping: 29,
    );
  }
}

class RoutePoint {
  final double lat;
  final double lng;
  final int rsrp;
  final int sinr;
  final int ping;
  final double speed;
  final String quality;
  final String timestamp;
  final bool handover;

  const RoutePoint({
    required this.lat,
    required this.lng,
    required this.rsrp,
    required this.sinr,
    required this.ping,
    required this.speed,
    required this.quality,
    required this.timestamp,
    this.handover = false,
  });
}

class SessionItem {
  final String id;
  final String testName;
  final String operatorName;
  final String technology;
  final String date;
  final String time;
  final double distance;
  final String duration;
  final String quality;
  final bool exported;
  final List<RoutePoint> points;

  const SessionItem({
    required this.id,
    required this.testName,
    required this.operatorName,
    required this.technology,
    required this.date,
    required this.time,
    required this.distance,
    required this.duration,
    required this.quality,
    this.exported = false,
    this.points = const [],
  });

  SessionItem copyWith({
    bool? exported,
  }) {
    return SessionItem(
      id: id,
      testName: testName,
      operatorName: operatorName,
      technology: technology,
      date: date,
      time: time,
      distance: distance,
      duration: duration,
      quality: quality,
      exported: exported ?? this.exported,
      points: points,
    );
  }
}

class AlertEvent {
  final String id;
  final String severity; // error, warning, success, info
  final String title;
  final String description;
  final String timestamp;
  final String? coordinates;

  const AlertEvent({
    required this.id,
    required this.severity,
    required this.title,
    required this.description,
    required this.timestamp,
    this.coordinates,
  });
}

class AppSettings {
  final double pingInterval;
  final String packetSize;
  final String speedServer;
  final double gpsRate;
  final String logInterval;
  final String defaultMetric;
  final String mapStyle;
  final String units;
  final bool autoUpload;
  final String sftpHost;
  final String sftpUser;
  final String sftpPass;
  final List<String> exportFormats;
  final bool wifiOnly;

  const AppSettings({
    this.pingInterval = 1000.0,
    this.packetSize = "32B",
    this.speedServer = "Auto (Nearest)",
    this.gpsRate = 1.0,
    this.logInterval = "1s",
    this.defaultMetric = "RSRP",
    this.mapStyle = "Dark",
    this.units = "dBm",
    this.autoUpload = true,
    this.sftpHost = "sftp.tnip-r.gov.sl",
    this.sftpUser = "field_eng_04",
    this.sftpPass = "********",
    this.exportFormats = const ["CSV", "KML"],
    this.wifiOnly = false,
  });

  AppSettings copyWith({
    double? pingInterval,
    String? packetSize,
    String? speedServer,
    double? gpsRate,
    String? logInterval,
    String? defaultMetric,
    String? mapStyle,
    String? units,
    bool? autoUpload,
    String? sftpHost,
    String? sftpUser,
    String? sftpPass,
    List<String>? exportFormats,
    bool? wifiOnly,
  }) {
    return AppSettings(
      pingInterval: pingInterval ?? this.pingInterval,
      packetSize: packetSize ?? this.packetSize,
      speedServer: speedServer ?? this.speedServer,
      gpsRate: gpsRate ?? this.gpsRate,
      logInterval: logInterval ?? this.logInterval,
      defaultMetric: defaultMetric ?? this.defaultMetric,
      mapStyle: mapStyle ?? this.mapStyle,
      units: units ?? this.units,
      autoUpload: autoUpload ?? this.autoUpload,
      sftpHost: sftpHost ?? this.sftpHost,
      sftpUser: sftpUser ?? this.sftpUser,
      sftpPass: sftpPass ?? this.sftpPass,
      exportFormats: exportFormats ?? this.exportFormats,
      wifiOnly: wifiOnly ?? this.wifiOnly,
    );
  }
}

class ServingCell {
  final String technology;
  final String mcc;
  final String mnc;
  final String band;
  final int pci;
  final int tac;
  final int earfcn;
  final int rsrp;
  final int rsrq;
  final int sinr;

  const ServingCell({
    required this.technology,
    required this.mcc,
    required this.mnc,
    required this.band,
    required this.pci,
    required this.tac,
    required this.earfcn,
    required this.rsrp,
    required this.rsrq,
    required this.sinr,
  });
}

class NeighborCell {
  final int pci;
  final int earfcn;
  final int rsrp;
  final String quality;

  const NeighborCell({
    required this.pci,
    required this.earfcn,
    required this.rsrp,
    required this.quality,
  });
}

class HandoverTimelineEvent {
  final String title;
  final String desc;
  final String timestamp;

  const HandoverTimelineEvent({
    required this.title,
    required this.desc,
    required this.timestamp,
  });
}
