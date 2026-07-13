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
  });

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
