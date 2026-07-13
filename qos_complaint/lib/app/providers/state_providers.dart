import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../core/models/app_models.dart';
import '../theme/app_theme.dart';

// ── 1. ACTIVE DISPLAY THEME STATE ───────────────────────────────────────────
class ThemeNotifier extends StateNotifier<bool> {
  ThemeNotifier() : super(false);

  void toggleTheme() {
    state = !state;
    AppColors.isDark = state;
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, bool>((ref) {
  return ThemeNotifier();
});

// ── 2. DRAFT REPORTING FORM STATE ───────────────────────────────────────────
class DraftReport {
  final String issueType;
  final int operatorId;
  final String operatorName;
  final String description;
  final String district;
  final String areaDetail;
  final double lat;
  final double lng;
  final List<String> attachments;

  const DraftReport({
    this.issueType = "Call Drops",
    this.operatorId = 3, // Africell by default
    this.operatorName = "Africell",
    this.description = "",
    this.district = "Kenema District",
    this.areaDetail = "12 Bockarie Gbay Street",
    this.lat = 8.1189,
    this.lng = -11.1963,
    this.attachments = const [],
  });

  DraftReport copyWith({
    String? issueType,
    int? operatorId,
    String? operatorName,
    String? description,
    String? district,
    String? areaDetail,
    double? lat,
    double? lng,
    List<String>? attachments,
  }) {
    return DraftReport(
      issueType: issueType ?? this.issueType,
      operatorId: operatorId ?? this.operatorId,
      operatorName: operatorName ?? this.operatorName,
      description: description ?? this.description,
      district: district ?? this.district,
      areaDetail: areaDetail ?? this.areaDetail,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      attachments: attachments ?? this.attachments,
    );
  }
}

class DraftReportNotifier extends StateNotifier<DraftReport> {
  DraftReportNotifier() : super(const DraftReport());

  void updateIssueType(String val) => state = state.copyWith(issueType: val);
  void updateOperator(int id, String name) => state = state.copyWith(operatorId: id, operatorName: name);
  void updateDescription(String val) => state = state.copyWith(description: val);
  void updateLocation(String street, String city, double lat, double lng) => 
      state = state.copyWith(areaDetail: street, district: city, lat: lat, lng: lng);
  void addAttachment(String path) => state = state.copyWith(attachments: [...state.attachments, path]);
  void clearAttachments() => state = state.copyWith(attachments: const []);
  void reset() => state = const DraftReport();
}

final draftReportProvider = StateNotifierProvider<DraftReportNotifier, DraftReport>((ref) {
  return DraftReportNotifier();
});

// ── 3. COMPLAINTS LIST DATABASE STATE ──────────────────────────────────────
class ComplaintsNotifier extends StateNotifier<List<ComplaintItem>> {
  ComplaintsNotifier() : super(_initialMockComplaints()) {
    fetchComplaints();
  }

  static const String _baseUrl = 'http://10.0.2.2:4000/api/qoe';

  Future<void> fetchComplaints() async {
    try {
      final response = await http.get(Uri.parse(_baseUrl)).timeout(const Duration(milliseconds: 1500));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data != null && data['rows'] != null) {
          final List rows = data['rows'];
          final List<ComplaintItem> loaded = [];
          for (var item in rows) {
            loaded.add(ComplaintItem(
              id: item['complaint_id'] ?? 0,
              reference: item['complaint_ref'] ?? '',
              operatorId: item['operator_id'] ?? 0,
              operatorName: _getOperatorName(item['operator_id']),
              issueType: item['issue_type'] ?? 'No Signal',
              description: item['description'] ?? '',
              district: item['district'] ?? 'Kenema',
              areaDetail: item['area_detail'] ?? '',
              lat: double.tryParse(item['lat']?.toString() ?? '8.11') ?? 8.11,
              lng: double.tryParse(item['lng']?.toString() ?? '-11.19') ?? -11.19,
              status: item['status'] ?? 'NEW',
              createdAt: item['created_at'] ?? '',
            ));
          }
          if (loaded.isNotEmpty) {
            state = loaded;
          }
        }
      }
    } catch (_) {
      // Offline fallback: keep pre-populated mock complaints
    }
  }

  Future<bool> submitNewComplaint(DraftReport draft) async {
    final now = DateTime.now();
    final dateStr = "${now.day} Jul ${now.year}, ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} ${now.hour >= 12 ? 'PM' : 'AM'}";
    final refCode = "CN${now.millisecondsSinceEpoch.toString().substring(4)}";

    final newItem = ComplaintItem(
      id: now.millisecondsSinceEpoch,
      reference: refCode,
      operatorId: draft.operatorId,
      operatorName: draft.operatorName,
      issueType: draft.issueType,
      description: draft.description,
      district: draft.district,
      areaDetail: draft.areaDetail,
      lat: draft.lat,
      lng: draft.lng,
      status: 'NEW',
      createdAt: dateStr,
    );

    // Save locally
    state = [newItem, ...state];

    // POST to backend API
    try {
      final body = {
        'operator_id': draft.operatorId,
        'issue_type': draft.issueType,
        'severity': 'MEDIUM',
        'district': draft.district,
        'area_detail': draft.areaDetail,
        'lat': draft.lat,
        'lng': draft.lng,
        'description': draft.description,
      };

      await http.post(
        Uri.parse('$_baseUrl/submit'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      ).timeout(const Duration(milliseconds: 1500));
    } catch (_) {
      // Offline resilient submission: stored on device locally
    }
    return true;
  }

  String _getOperatorName(int id) {
    switch (id) {
      case 1: return "Sierra Tel";
      case 2: return "Orange";
      case 3: return "Africell";
      case 4: return "Qcell";
      default: return "Other";
    }
  }

  static List<ComplaintItem> _initialMockComplaints() {
    return const [
      ComplaintItem(
        id: 1,
        reference: "CN123456789",
        operatorId: 3,
        operatorName: "Africell",
        issueType: "Call Drops",
        description: "Calls keep dropping even when I have full signal.",
        district: "Kenema",
        areaDetail: "12 Bockarie Gbay Street",
        lat: 8.1189,
        lng: -11.1963,
        status: "IN_PROGRESS",
        createdAt: "11 Jul 2025, 10:30 AM",
      ),
      ComplaintItem(
        id: 2,
        reference: "CN123456790",
        operatorId: 1,
        operatorName: "Sierra Tel",
        issueType: "Slow Internet",
        description: "LTE speeds are extremely low in the afternoon.",
        district: "Kenema",
        areaDetail: "New Site",
        lat: 8.1210,
        lng: -11.1850,
        status: "NEW",
        createdAt: "09 Jul 2025, 02:15 PM",
      ),
      ComplaintItem(
        id: 3,
        reference: "CN123456791",
        operatorId: 2,
        operatorName: "Orange",
        issueType: "No Signal",
        description: "Zero reception inside buildings on main street.",
        district: "Kenema",
        areaDetail: "Gbangbatoke",
        lat: 8.0830,
        lng: -11.3120,
        status: "RESOLVED",
        createdAt: "05 Jul 2025, 09:45 AM",
      ),
      ComplaintItem(
        id: 4,
        reference: "CN123456792",
        operatorId: 4,
        operatorName: "Qcell",
        issueType: "No Internet",
        description: "Data service has been completely offline for 24h.",
        district: "Kenema",
        areaDetail: "Kenema City Centre",
        lat: 8.1150,
        lng: -11.2010,
        status: "CLOSED",
        createdAt: "01 Jul 2025, 08:00 AM",
      ),
    ];
  }
}

final complaintsProvider = StateNotifierProvider<ComplaintsNotifier, List<ComplaintItem>>((ref) {
  return ComplaintsNotifier();
});

// ── 4. NOTIFICATIONS TIMELINE STATE ────────────────────────────────────────
class NotificationsNotifier extends StateNotifier<List<NotificationItem>> {
  NotificationsNotifier() : super(_initialNotifications());

  void markAllRead() {
    state = state.map((n) => n.copyWith(isUnread: false)).toList();
  }

  static List<NotificationItem> _initialNotifications() {
    return const [
      NotificationItem(
        id: "notif-1",
        title: "Complaint Update",
        body: "Your complaint #CN123456789 has been assigned to our technical team.",
        time: "2 hours ago",
        isUnread: true,
        icon: Icons.assignment_turned_in_outlined,
        iconColor: AppColors.primaryBlue,
      ),
      NotificationItem(
        id: "notif-2",
        title: "NatCA Announcement",
        body: "Scheduled maintenance on Orange network in Kenema, 12 Jul 2025.",
        time: "5 hours ago",
        isUnread: true,
        icon: Icons.campaign_outlined,
        iconColor: AppColors.warningOrange,
      ),
      NotificationItem(
        id: "notif-3",
        title: "Complaint Resolved",
        body: "Your No Signal complaint in Gbangbatoke has been resolved.",
        time: "Yesterday",
        isUnread: false,
        icon: Icons.check_circle_outline_rounded,
        iconColor: AppColors.successGreen,
      ),
    ];
  }
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, List<NotificationItem>>((ref) {
  return NotificationsNotifier();
});
