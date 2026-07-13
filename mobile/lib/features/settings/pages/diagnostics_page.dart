import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class DiagnosticsPage extends StatefulWidget {
  const DiagnosticsPage({super.key});

  @override
  State<DiagnosticsPage> createState() => _DiagnosticsPageState();
}

class _DiagnosticsPageState extends State<DiagnosticsPage> {
  String _activeFilter = "All";

  final List<Map<String, String>> _logs = [
    {"time": "09:14:24", "level": "ERROR", "msg": "VoLTE active call drop detected at cell sector 4 (PCI 304)"},
    {"time": "09:10:02", "level": "WARNING", "msg": "Signal degradation RSRP dropped below -112 dBm"},
    {"time": "09:05:47", "level": "INFO", "msg": "Cell handover completed sector 102 -> 304 successfully"},
    {"time": "09:01:22", "level": "DEBUG", "msg": "Handovers listener service polling frequency set to 1Hz"},
    {"time": "08:58:12", "level": "SUCCESS", "msg": "Modem 5G NR NSA carrier lock established n78"},
    {"time": "08:52:10", "level": "DEBUG", "msg": "SFTP connection established successfully with secure SSL"},
    {"time": "08:50:00", "level": "INFO", "msg": "System diagnostic environment initiated TNIPR-field-v2.1.0"},
  ];

  @override
  Widget build(BuildContext context) {
    List<Map<String, String>> filteredLogs = _activeFilter == "All"
        ? _logs
        : _logs.where((l) => l["level"] == _activeFilter.toUpperCase()).toList();

    return AppScaffold(
      showHeader: true,
      title: "Diagnostics Console",
      subtitle: "Diagnostics & system logs",
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Filter Chips
            SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: ["All", "Error", "Warning", "Info", "Debug"].map((f) {
                  bool isSel = _activeFilter == f;
                  return GestureDetector(
                    onTap: () => setState(() => _activeFilter = f),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSel ? AppColors.primaryAccentBlue : AppColors.secondaryBackground,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        f,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isSel ? AppColors.textWhite : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Log Console Box
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF020617), // terminal deep black
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: filteredLogs.isEmpty
                    ? const Center(child: Text("No matching log traces.", style: TextStyle(color: AppColors.textDim)))
                    : ListView.builder(
                        itemCount: filteredLogs.length,
                        itemBuilder: (context, index) {
                          final log = filteredLogs[index];
                          final Color lvlColor;
                          switch (log["level"]) {
                            case 'ERROR':
                              lvlColor = AppColors.errorRed;
                              break;
                            case 'WARNING':
                              lvlColor = AppColors.warningAmber;
                              break;
                            case 'SUCCESS':
                              lvlColor = AppColors.successGreen;
                              break;
                            case 'INFO':
                              lvlColor = AppColors.primaryAccentBlue;
                              break;
                            default:
                              lvlColor = AppColors.textMuted;
                              break;
                          }

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: RichText(
                              text: TextSpan(
                                children: [
                                  TextSpan(text: "[${log["time"]}] ", style: const TextStyle(color: AppColors.textDim, fontFamily: 'monospace', fontSize: 11)),
                                  TextSpan(text: "${log["level"]} ", style: TextStyle(color: lvlColor, fontWeight: FontWeight.bold, fontFamily: 'monospace', fontSize: 11)),
                                  TextSpan(text: log["msg"], style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'monospace', fontSize: 11)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),
            const SizedBox(height: 16),

            // Actions row (Copy, Share, Clear)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.copy_rounded, size: 14, color: AppColors.textWhite),
                    label: const Text("Copy Logs", style: TextStyle(color: AppColors.textWhite, fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.share_outlined, size: 14, color: AppColors.textWhite),
                    label: const Text("Share Logs", style: TextStyle(color: AppColors.textWhite, fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        _logs.clear();
                      });
                    },
                    icon: const Icon(Icons.delete_sweep_rounded, size: 14, color: AppColors.errorRed),
                    label: const Text("Clear Logs", style: TextStyle(color: AppColors.errorRed, fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.errorRed),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
