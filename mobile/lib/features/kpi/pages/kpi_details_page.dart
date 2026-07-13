import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class KpiDetailsPage extends StatefulWidget {
  final String metric;

  const KpiDetailsPage({super.key, required this.metric});

  @override
  State<KpiDetailsPage> createState() => _KpiDetailsPageState();
}

class _KpiDetailsPageState extends State<KpiDetailsPage> {
  String _activeTab = "Trend";

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: widget.metric,
      subtitle: "Regulatory audit metrics diagnostics",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Hero Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1565C0), Color(0xFF1E88E5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(widget.metric.toUpperCase(), style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: Colors.amber.shade700, borderRadius: BorderRadius.circular(6)),
                      child: const Text("Fair Status", style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text("2.35%", style: TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text("Regulatory Target: < 2.0%", style: TextStyle(color: Colors.white70, fontSize: 12)),
                    Text("↓ -0.5% vs last week", style: TextStyle(color: Colors.greenAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Tab Bar Row
          _buildTabBar(),
          const SizedBox(height: 20),

          // 3. Conditional content
          if (_activeTab == "Trend") ...[
            _buildTrendSection(),
          ] else if (_activeTab == "By Operator") ...[
            _buildOperatorSection(),
          ] else if (_activeTab == "By Region") ...[
            _buildRegionSection(),
          ] else ...[
            _buildHistorySection(),
          ],
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    final tabs = ["Trend", "By Operator", "By Region", "History"];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: tabs.map((tab) {
        final active = tab == _activeTab;
        return GestureDetector(
          onTap: () => setState(() => _activeTab = tab),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: active ? AppColors.lightBlue : Colors.transparent, width: 2)),
            ),
            child: Text(
              tab,
              style: TextStyle(
                color: active ? AppColors.lightBlue : AppColors.textMuted,
                fontWeight: active ? FontWeight.bold : FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTrendSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("30-Day Quality Index Graph", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
          const SizedBox(height: 16),
          // Interactive line trend chart
          SizedBox(
            height: 150,
            width: double.infinity,
            child: CustomPaint(
              painter: _DetailTrendChartPainter(),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.accentBlue, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              const Text("Actual CDR", style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
              const SizedBox(width: 16),
              Container(width: 8, height: 1.5, color: AppColors.errorRed),
              const SizedBox(width: 4),
              const Text("Regulatory Limit Threshold (2%)", style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOperatorSection() {
    final list = [
      {"name": "Sierra Tel", "color": AppColors.sierraTelColor, "value": "2.12%", "pct": 0.85, "badge": "Fair", "badgeColor": AppColors.warningAmber},
      {"name": "Orange Sierra Leone", "color": AppColors.orangeOperator, "value": "2.84%", "pct": 0.55, "badge": "Poor", "badgeColor": AppColors.errorRed},
      {"name": "Africell", "color": AppColors.africellPurple, "value": "1.92%", "pct": 0.95, "badge": "Good", "badgeColor": AppColors.successGreen},
      {"name": "Qcell", "color": AppColors.qcellPurple, "value": "3.18%", "pct": 0.40, "badge": "Poor", "badgeColor": AppColors.errorRed},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: list.map((item) {
          final color = item["color"] as Color;
          final badgeColor = item["badgeColor"] as Color;
          return Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Text(item["name"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                      ],
                    ),
                    Row(
                      children: [
                        Text(item["value"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: badgeColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                          child: Text(item["badge"] as String, style: TextStyle(color: badgeColor, fontSize: 9, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: item["pct"] as double,
                    minHeight: 6,
                    backgroundColor: AppColors.surfaceGray,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildRegionSection() {
    final list = [
      {"name": "Western Area", "value": "1.82%", "badge": "Good", "color": AppColors.successGreen},
      {"name": "Northern Province", "value": "2.94%", "badge": "Fair", "color": AppColors.warningAmber},
      {"name": "Southern Province", "value": "2.14%", "badge": "Good", "color": AppColors.successGreen},
      {"name": "Eastern Province", "value": "3.52%", "badge": "Poor", "color": AppColors.errorRed},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        children: list.map((item) {
          final color = item["color"] as Color;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(item["name"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                Row(
                  children: [
                    Text(item["value"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                      child: Text(item["badge"] as String, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHistorySection() {
    final list = [
      {"date": "11 Jul 2025", "val": "2.35%", "change": "↓ -0.1%"},
      {"date": "10 Jul 2025", "val": "2.46%", "change": "↑ +0.3%"},
      {"date": "09 Jul 2025", "val": "2.16%", "change": "↓ -0.2%"},
      {"date": "08 Jul 2025", "val": "2.36%", "change": "→ 0.0%"},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Table(
        columnWidths: const {
          0: FlexColumnWidth(2),
          1: FlexColumnWidth(1),
          2: FlexColumnWidth(1),
        },
        children: [
          TableRow(
            children: const [
              Padding(padding: EdgeInsets.symmetric(vertical: 6.0), child: Text("DATE", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
              Padding(padding: EdgeInsets.symmetric(vertical: 6.0), child: Text("VALUE", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
              Padding(padding: EdgeInsets.symmetric(vertical: 6.0), child: Text("CHANGE", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
            ],
          ),
          ...list.map((row) => TableRow(
                children: [
                  Padding(padding: const EdgeInsets.symmetric(vertical: 8.0), child: Text(row["date"]!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary))),
                  Padding(padding: const EdgeInsets.symmetric(vertical: 8.0), child: Text(row["val"]!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary))),
                  Padding(padding: const EdgeInsets.symmetric(vertical: 8.0), child: Text(row["change"]!, style: const TextStyle(fontSize: 12, color: AppColors.successGreen))),
                ],
              )),
        ],
      ),
    );
  }
}

class _DetailTrendChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double drawHeight = size.height - 20;

    final linePaint = Paint()
      ..color = AppColors.accentBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final limitPaint = Paint()
      ..color = AppColors.errorRed
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    // Draw limit threshold line at 2.0% (y = drawHeight * 0.4)
    canvas.drawLine(Offset(0, drawHeight * 0.4), Offset(size.width, drawHeight * 0.4), limitPaint);

    final path = Path()
      ..moveTo(0, drawHeight * 0.6)
      ..lineTo(size.width * 0.2, drawHeight * 0.5)
      ..lineTo(size.width * 0.4, drawHeight * 0.3)
      ..lineTo(size.width * 0.6, drawHeight * 0.45)
      ..lineTo(size.width * 0.8, drawHeight * 0.25)
      ..lineTo(size.width, drawHeight * 0.35);

    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(covariant _DetailTrendChartPainter oldDelegate) => false;
}
