import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class DeviceNetworkInfoPage extends StatelessWidget {
  const DeviceNetworkInfoPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Device & Network Info",
      subtitle: "Hardware & modem metadata",
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Device Hardware Section
            _sectionLabel("DEVICE HARDWARE"),
            _infoCard([
              _infoRow("Device Model", "Samsung Galaxy S21 Ultra"),
              _infoRow("Operating System", "Android 14 (API level 34)"),
              _infoRow("CPU Architecture", "ARMv8-A (octa-core)"),
              _infoRow("Modem Baseband", "Exynos 2100 (Integrated 5G)"),
            ]),
            const SizedBox(height: 20),

            // 2. Radio & Operator Section
            _sectionLabel("RADIO ACCESS & NETWORK"),
            _infoCard([
              _infoRow("Active Network RAT", "5G-NSA (Band n78 Lock)"),
              _infoRow("Operator Carrier", "Orange SL"),
              _infoRow("MCC / MNC Codes", "619 / 01 (Sierra Leone)"),
              _infoRow("Modem Connection State", "CONNECTED (VoLTE session active)"),
              _infoRow("SIM Interface State", "READY (Slot 0 physical SIM)"),
              _infoRow("Device Local IP", "10.45.109.124"),
            ]),
            const SizedBox(height: 20),

            // 3. GNSS & Location properties
            _sectionLabel("GNSS LOCATION & ACCURACY"),
            _infoCard([
              _infoRow("GPS Status", "3D Lock Established"),
              _infoRow("Horizontal Accuracy", "±1.8 meters"),
              _infoRow("Locked Satellites", "12 GNSS satellites active"),
              _infoRow("Coordinates", "8.48429, -13.23412"),
              _infoRow("Altitude (MSL)", "26.4 meters"),
            ]),
            const SizedBox(height: 20),

            // 4. App permissions
            _sectionLabel("SYSTEM APP PERMISSIONS"),
            _infoCard([
              _permissionRow("Fine Location Access", true),
              _permissionRow("Background Location", true),
              _permissionRow("Access Phone State", true),
              _permissionRow("Storage Read/Write", true),
            ]),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(text, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
    );
  }

  Widget _infoCard(List<Widget> rows) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.secondaryBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: List.generate(rows.length * 2 - 1, (index) {
          if (index.isOdd) return const Divider(color: AppColors.border, height: 1);
          return rows[index ~/ 2];
        }),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          const Spacer(),
          Text(value, style: const TextStyle(color: AppColors.textWhite, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _permissionRow(String permission, bool granted) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Text(permission, style: const TextStyle(color: AppColors.textWhite, fontSize: 12)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: granted ? AppColors.excellentBg : AppColors.poorBg,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              granted ? "GRANTED" : "DENIED",
              style: TextStyle(
                color: granted ? AppColors.successGreen : AppColors.errorRed,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          )
        ],
      ),
    );
  }
}
