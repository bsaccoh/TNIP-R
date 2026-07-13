import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/models/app_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../constants/mock_constants.dart';

class ExportCenterPage extends ConsumerStatefulWidget {
  final String sessionId;

  const ExportCenterPage({super.key, required this.sessionId});

  @override
  ConsumerState<ExportCenterPage> createState() => _ExportCenterPageState();
}

class _ExportCenterPageState extends ConsumerState<ExportCenterPage> {
  String _selectedFormat = "CSV";
  bool _isProcessing = false;
  double _progress = 0.0;
  bool _success = false;

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(historyProvider);
    final session = sessions.firstWhere(
      (s) => s.id == widget.sessionId,
      orElse: () => MOCK_HISTORY_SESSIONS[0],
    );

    return AppScaffold(
      showHeader: true,
      title: "Export Center",
      subtitle: "Package & Cloud Transmit logs",
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Session Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.folder_zip_outlined, color: AppColors.primaryAccentBlue, size: 28),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(session.testName, style: const TextStyle(color: AppColors.textWhite, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text("${session.date} • ${session.points.length} GPS nodes", style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            if (!_isProcessing && !_success) ...[
              const Text("SELECT EXPORT FORMAT", style: AppTextStyles.sectionLabel),
              const SizedBox(height: 12),

              _formatCard("CSV Format", "Telemetry timeseries table sheets (Excel/Python)", "CSV"),
              _formatCard("KML Format", "GIS geographical path lines for Google Earth / GIS tools", "KML"),
              _formatCard("Cloud Sync", "Secure transmission over SFTP directly to gov database servers", "Cloud"),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _startExportFlow,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryAccentBlue,
                    foregroundColor: AppColors.textWhite,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text("PROCEED EXPORT TASK", style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],

            if (_isProcessing) ...[
              const SizedBox(height: 40),
              Center(
                child: Column(
                  children: [
                    const Text("COMPILING TELEMETRY DATA...", style: TextStyle(color: AppColors.textWhite, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Text("${(_progress * 100).toInt()}% completed", style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    const SizedBox(height: 24),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: SizedBox(
                        height: 8,
                        width: 240,
                        child: LinearProgressIndicator(
                          value: _progress,
                          backgroundColor: AppColors.border,
                          valueColor: const AlwaysStoppedAnimation(AppColors.primaryAccentBlue),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (_success) ...[
              const SizedBox(height: 40),
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(color: AppColors.excellentBg, shape: BoxShape.circle),
                      child: const Icon(Icons.check_circle_outline_rounded, color: AppColors.successGreen, size: 40),
                    ),
                    const SizedBox(height: 20),
                    const Text("EXPORT TASK COMPLETED", style: TextStyle(color: AppColors.textWhite, fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(
                      _selectedFormat == "Cloud" 
                          ? "Logs successfully uploaded to sftp.tnip-r.gov.sl"
                          : "File saved: ${session.testName.replaceAll(" ", "_").toLowerCase()}.${_selectedFormat.toLowerCase()}",
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: 200,
                      child: ElevatedButton(
                        onPressed: () {
                          ref.read(historyProvider.notifier).markAsExported(session.id);
                          context.pop();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.secondaryBackground,
                          foregroundColor: AppColors.textWhite,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text("CLOSE TASK"),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _formatCard(String title, String desc, String format) {
    bool isSel = _selectedFormat == format;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFormat = format;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.secondaryBackground,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isSel ? AppColors.primaryAccentBlue : AppColors.border, width: isSel ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(
              format == "Cloud" ? Icons.cloud_done_outlined : Icons.insert_drive_file_outlined,
              color: isSel ? AppColors.primaryAccentBlue : AppColors.textMuted,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: AppColors.textWhite, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                  const SizedBox(height: 4),
                  Text(desc, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                ],
              ),
            ),
            Radio<String>(
              value: format,
              groupValue: _selectedFormat,
              activeColor: AppColors.primaryAccentBlue,
              onChanged: (v) {
                setState(() {
                  _selectedFormat = v!;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  void _startExportFlow() {
    setState(() {
      _isProcessing = true;
      _progress = 0.0;
    });

    Timer.periodic(const Duration(milliseconds: 150), (timer) {
      if (_progress >= 1.0) {
        timer.cancel();
        setState(() {
          _isProcessing = false;
          _success = true;
        });
      } else {
        setState(() {
          _progress += 0.1;
        });
      }
    });
  }
}
