import 'package:flutter/material.dart';

class ComplaintItem {
  final int id;
  final String reference;
  final int operatorId;
  final String operatorName;
  final String issueType;
  final String description;
  final String district;
  final String areaDetail;
  final double lat;
  final double lng;
  final String status; // 'NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
  final String createdAt;
  // Billing & Mobile Money fields (null for standard network complaints)
  final String? billingSubCategory;
  final String? transactionRef;
  final double? disputedAmount;
  final String? transactionDate;

  const ComplaintItem({
    required this.id,
    required this.reference,
    required this.operatorId,
    required this.operatorName,
    required this.issueType,
    required this.description,
    required this.district,
    required this.areaDetail,
    required this.lat,
    required this.lng,
    required this.status,
    required this.createdAt,
    this.billingSubCategory,
    this.transactionRef,
    this.disputedAmount,
    this.transactionDate,
  });

  bool get isBillingComplaint =>
      issueType == 'Billing Dispute' || issueType == 'Mobile Money';

  ComplaintItem copyWith({
    String? status,
  }) {
    return ComplaintItem(
      id: id,
      reference: reference,
      operatorId: operatorId,
      operatorName: operatorName,
      issueType: issueType,
      description: description,
      district: district,
      areaDetail: areaDetail,
      lat: lat,
      lng: lng,
      status: status ?? this.status,
      createdAt: createdAt,
      billingSubCategory: billingSubCategory,
      transactionRef: transactionRef,
      disputedAmount: disputedAmount,
      transactionDate: transactionDate,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reference': reference,
      'operatorId': operatorId,
      'operatorName': operatorName,
      'issueType': issueType,
      'description': description,
      'district': district,
      'areaDetail': areaDetail,
      'lat': lat,
      'lng': lng,
      'status': status,
      'createdAt': createdAt,
      'billingSubCategory': billingSubCategory,
      'transactionRef': transactionRef,
      'disputedAmount': disputedAmount,
      'transactionDate': transactionDate,
    };
  }

  factory ComplaintItem.fromJson(Map<String, dynamic> json) {
    return ComplaintItem(
      id: json['id'] as int,
      reference: json['reference'] as String,
      operatorId: json['operatorId'] as int,
      operatorName: json['operatorName'] as String,
      issueType: json['issueType'] as String,
      description: json['description'] as String,
      district: json['district'] as String,
      areaDetail: json['areaDetail'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      billingSubCategory: json['billingSubCategory'] as String?,
      transactionRef: json['transactionRef'] as String?,
      disputedAmount: json['disputedAmount'] != null ? (json['disputedAmount'] as num).toDouble() : null,
      transactionDate: json['transactionDate'] as String?,
    );
  }
}

class UpdateTimelineEvent {
  final String title;
  final String timestamp;
  final String description;
  final Color dotColor;

  const UpdateTimelineEvent({
    required this.title,
    required this.timestamp,
    required this.description,
    required this.dotColor,
  });
}

class OperatorScore {
  final String name;
  final double score;
  final String quality;
  final Color color;

  const OperatorScore({
    required this.name,
    required this.score,
    required this.quality,
    required this.color,
  });
}

class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String time;
  final bool isUnread;
  final IconData icon;
  final Color iconColor;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.time,
    required this.isUnread,
    required this.icon,
    required this.iconColor,
  });

  NotificationItem copyWith({
    bool? isUnread,
  }) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      time: time,
      isUnread: isUnread ?? this.isUnread,
      icon: icon,
      iconColor: iconColor,
    );
  }
}

class SpeedTestResult {
  final String id;
  final String timestamp;
  final double downloadSpeed;
  final double uploadSpeed;
  final int ping;
  final String networkType;
  final String operatorName;

  const SpeedTestResult({
    required this.id,
    required this.timestamp,
    required this.downloadSpeed,
    required this.uploadSpeed,
    required this.ping,
    required this.networkType,
    required this.operatorName,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp,
      'downloadSpeed': downloadSpeed,
      'uploadSpeed': uploadSpeed,
      'ping': ping,
      'networkType': networkType,
      'operatorName': operatorName,
    };
  }

  factory SpeedTestResult.fromJson(Map<String, dynamic> json) {
    return SpeedTestResult(
      id: json['id'] as String,
      timestamp: json['timestamp'] as String,
      downloadSpeed: (json['downloadSpeed'] as num).toDouble(),
      uploadSpeed: (json['uploadSpeed'] as num).toDouble(),
      ping: json['ping'] as int,
      networkType: json['networkType'] as String,
      operatorName: json['operatorName'] as String,
    );
  }
}
