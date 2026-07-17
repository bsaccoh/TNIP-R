import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';

class SpeedHistoryScreen extends ConsumerWidget {
  const SpeedHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(speedTestHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text("Speed History", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: history.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history_rounded, size: 64, color: AppColors.textMuted.withOpacity(0.5)),
                  const SizedBox(height: 16),
                  const Text("No speed tests run yet.", style: TextStyle(color: AppColors.textMuted)),
                ],
              ),
            )
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Performance Trend", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 16),
                  _buildChart(history),
                  const SizedBox(height: 24),
                  Text("Recent Tests", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  Expanded(
                    child: ListView.separated(
                      itemCount: history.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = history[index];
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.dynamicCard,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.dynamicBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(item.timestamp, style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                  Text(item.operatorName, style: AppTextStyles.micro.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                children: [
                                  _statItem("Ping", "${item.ping} ms", Icons.network_ping_rounded, AppColors.primaryBlue),
                                  _statItem("Down", "${item.downloadSpeed.toStringAsFixed(1)} Mbps", Icons.arrow_downward_rounded, AppColors.accentGreen),
                                  _statItem("Up", "${item.uploadSpeed.toStringAsFixed(1)} Mbps", Icons.arrow_upward_rounded, AppColors.warningOrange),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _statItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
      ],
    );
  }

  Widget _buildChart(List history) {
    // We reverse history for chronological order on the X-axis (oldest left, newest right)
    final chronological = history.reversed.toList();
    
    List<FlSpot> downloadSpots = [];
    List<FlSpot> uploadSpots = [];

    for (int i = 0; i < chronological.length; i++) {
      downloadSpots.add(FlSpot(i.toDouble(), chronological[i].downloadSpeed));
      uploadSpots.add(FlSpot(i.toDouble(), chronological[i].uploadSpeed));
    }

    return Container(
      height: 220,
      padding: const EdgeInsets.only(right: 16, top: 16, bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.dynamicBorder),
      ),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 10,
            getDrawingHorizontalLine: (value) => FlLine(
              color: AppColors.border.withOpacity(0.5),
              strokeWidth: 1,
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                getTitlesWidget: (value, meta) {
                  return Text(value.toInt().toString(), style: const TextStyle(color: AppColors.textMuted, fontSize: 10));
                },
              ),
            ),
            bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: downloadSpots,
              isCurved: true,
              color: AppColors.accentGreen,
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: true),
              belowBarData: BarAreaData(
                show: true,
                color: AppColors.accentGreen.withOpacity(0.1),
              ),
            ),
            LineChartBarData(
              spots: uploadSpots,
              isCurved: true,
              color: AppColors.warningOrange,
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: true),
              belowBarData: BarAreaData(
                show: true,
                color: AppColors.warningOrange.withOpacity(0.1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
