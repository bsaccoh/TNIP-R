import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/models/app_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/status_pill.dart';
import '../../../shared/charts/reusable_charts.dart';

class CellDetailsPage extends ConsumerWidget {
  const CellDetailsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dashboardProvider);

    return AppScaffold(
      showHeader: true,
      title: "Cell Details",
      subtitle: "Modem Serving & Neighbors",
      headerActions: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(color: AppColors.successGreen, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            const Text("LIVE", style: TextStyle(color: AppColors.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
          ],
        )
      ],
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Serving Cell Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("SERVING BASE STATION", style: AppTextStyles.sectionLabel),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.purple5GBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          state.liveMetric.technology,
                          style: const TextStyle(color: Color(0xFFB794FF), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // 3x3 Parameter Grid
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.5,
                    children: [
                      _gridCell("RSRP", "${state.liveMetric.rsrp} dBm"),
                      _gridCell("RSRQ", "${state.liveMetric.rsrq} dB"),
                      _gridCell("SINR", "${state.liveMetric.sinr} dB"),
                      _gridCell("PCI", "${state.liveMetric.pci}"),
                      _gridCell("TAC", "8412"),
                      _gridCell("EARFCN", "${state.liveMetric.earfcn}"),
                      _gridCell("MCC", "619"), // Sierra Leone mcc
                      _gridCell("MNC", "01"),  // Orange mnc
                      _gridCell("Band", "B3 (1800)"),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 2. Signal History Chart
            const Text("RSRP HISTORICAL TREND (60s)", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  SparklineChart(
                    data: state.rsrpTrend,
                    color: AppColors.successGreen,
                    height: 80,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Neighbors Cells list
            const Text("NEIGHBOR CELL CHANNELS (5)", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _neighborRow(102, 2850, -84, "Good"),
                  const Divider(color: AppColors.border, height: 1),
                  _neighborRow(88, 2850, -91, "Fair"),
                  const Divider(color: AppColors.border, height: 1),
                  _neighborRow(304, 2850, -98, "Fair"),
                  const Divider(color: AppColors.border, height: 1),
                  _neighborRow(412, 1750, -109, "Poor"),
                  const Divider(color: AppColors.border, height: 1),
                  _neighborRow(219, 1750, -112, "Poor"),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Handover timeline
            const Text("HANDOVER EVENT TIMELINE", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _handoverRow("09:14:02", "Inter-frequency Handover", "PCI 234 -> PCI 102 completed"),
                  const Divider(color: AppColors.border, height: 16),
                  _handoverRow("09:05:47", "Intra-LTE Handover Completed", "PCI 102 -> PCI 304 fallback"),
                  const Divider(color: AppColors.border, height: 16),
                  _handoverRow("08:58:12", "RAT Lock Upgraded", "Attached to Band n78 lock NR NSA"),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _gridCell(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
      ],
    );
  }

  Widget _neighborRow(int pci, int earfcn, int rsrp, String quality) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Icon(Icons.cell_tower_rounded, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("PCI $pci", style: const TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.bold)),
              Text("EARFCN $earfcn", style: const TextStyle(color: AppColors.textSecondary, fontSize: 10)),
            ],
          ),
          const Spacer(),
          Text("$rsrp dBm", style: const TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(width: 12),
          StatusPill(status: quality),
        ],
      ),
    );
  }

  Widget _handoverRow(String time, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(time, style: const TextStyle(fontSize: 10, color: AppColors.textDim, fontFamily: 'monospace')),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
            const SizedBox(height: 2),
            Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
      ],
    );
  }
}
