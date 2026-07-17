import 'dart:math';
import 'package:flutter/material.dart';
import '../../app/theme/app_theme.dart';

/// Mock regional speed data model
class RegionalSpeed {
  final double dl;
  final double ul;
  final int ping;
  final int samples;
  const RegionalSpeed({required this.dl, required this.ul, required this.ping, required this.samples});
}

/// Sierra Leone's 16 districts
const List<String> _districts = [
  'Western Area Urban',
  'Western Area Rural',
  'Bo',
  'Kenema',
  'Bombali',
  'Kono',
  'Port Loko',
  'Tonkolili',
  'Moyamba',
  'Bonthe',
  'Kailahun',
  'Pujehun',
  'Kambia',
  'Falaba',
  'Karene',
  'Koinadugu',
];

const _operators = ['Orange', 'Africell', 'Qcell', 'Sierra Tel'];
const Map<String, Color> _opColors = {
  'Orange': Color(0xFFF5A623),
  'Africell': Color(0xFF7B1FA2),
  'Qcell': Color(0xFFE53935),
  'Sierra Tel': Color(0xFF1A3C8F),
};

/// Generate deterministic mock data
Map<String, Map<String, RegionalSpeed>> _generateMockData() {
  final rng = Random(42);
  final data = <String, Map<String, RegionalSpeed>>{};
  for (final district in _districts) {
    final districtSeed = district.hashCode;
    data[district] = {};
    for (final op in _operators) {
      final opSeed = op.hashCode;
      final base = ((districtSeed + opSeed) % 40 + 5).toDouble();
      data[district]![op] = RegionalSpeed(
        dl: (base + rng.nextDouble() * 20).clamp(2.0, 65.0),
        ul: (base * 0.35 + rng.nextDouble() * 8).clamp(0.5, 20.0),
        ping: (20 + rng.nextInt(60)),
        samples: 50 + rng.nextInt(200),
      );
    }
  }
  return data;
}

class SpeedComparisonScreen extends StatefulWidget {
  const SpeedComparisonScreen({super.key});

  @override
  State<SpeedComparisonScreen> createState() => _SpeedComparisonScreenState();
}

class _SpeedComparisonScreenState extends State<SpeedComparisonScreen> {
  final Map<String, Map<String, RegionalSpeed>> _data = _generateMockData();
  String _selectedDistrict = 'Western Area Urban';
  bool _showDownload = true; // toggle DL vs UL

  @override
  Widget build(BuildContext context) {
    final regionData = _data[_selectedDistrict]!;

    // Sort operators by speed descending
    final sortedOps = _operators.toList()
      ..sort((a, b) {
        final aVal = _showDownload ? regionData[a]!.dl : regionData[a]!.ul;
        final bVal = _showDownload ? regionData[b]!.dl : regionData[b]!.ul;
        return bVal.compareTo(aVal);
      });

    final maxSpeed = sortedOps
        .map((op) => _showDownload ? regionData[op]!.dl : regionData[op]!.ul)
        .reduce(max);
        
    // Round maxSpeed up to nearest 10 for gauge scale
    final gaugeMax = ((maxSpeed / 10).ceil() * 10).toDouble();

    final fastestOp = sortedOps.first;

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text("Speed Comparison", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Region selector ──
            Text("Select District", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedDistrict,
                  isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textLight),
                  style: AppTextStyles.body.copyWith(color: AppColors.textPrimary),
                  dropdownColor: AppColors.dynamicCard,
                  items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedDistrict = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ── DL / UL toggle ──
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _showDownload = true),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _showDownload ? AppColors.primaryBlue : AppColors.dynamicCard,
                        borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)),
                        border: Border.all(color: _showDownload ? AppColors.primaryBlue : AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.arrow_downward_rounded,
                              size: 16, color: _showDownload ? Colors.white : AppColors.textLight),
                          const SizedBox(width: 6),
                          Text("Download",
                              style: AppTextStyles.small.copyWith(
                                fontWeight: FontWeight.w700,
                                color: _showDownload ? Colors.white : AppColors.textLight,
                              )),
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _showDownload = false),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: !_showDownload ? AppColors.primaryBlue : AppColors.dynamicCard,
                        borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
                        border: Border.all(color: !_showDownload ? AppColors.primaryBlue : AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.arrow_upward_rounded,
                              size: 16, color: !_showDownload ? Colors.white : AppColors.textLight),
                          const SizedBox(width: 6),
                          Text("Upload",
                              style: AppTextStyles.small.copyWith(
                                fontWeight: FontWeight.w700,
                                color: !_showDownload ? Colors.white : AppColors.textLight,
                              )),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // ── Fastest Operator Card ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _opColors[fastestOp]!.withValues(alpha: 0.15),
                    _opColors[fastestOp]!.withValues(alpha: 0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _opColors[fastestOp]!.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: _opColors[fastestOp],
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Text(fastestOp[0],
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Fastest ${_showDownload ? 'Download' : 'Upload'} in $_selectedDistrict",
                            style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
                        const SizedBox(height: 4),
                        Text(fastestOp,
                            style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold, color: _opColors[fastestOp])),
                      ],
                    ),
                  ),
                  Text(
                    "${(_showDownload ? regionData[fastestOp]!.dl : regionData[fastestOp]!.ul).toStringAsFixed(1)} Mbps",
                    style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w800, color: _opColors[fastestOp]),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Operator Gauges Grid ──
            Text("Operator Comparison", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 14),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.2, // wide enough for gauge semi-circle
              ),
              itemCount: sortedOps.length,
              itemBuilder: (context, index) {
                final op = sortedOps[index];
                final speed = _showDownload ? regionData[op]!.dl : regionData[op]!.ul;
                return Container(
                  padding: const EdgeInsets.only(top: 16, left: 8, right: 8, bottom: 8),
                  decoration: BoxDecoration(
                    color: AppColors.dynamicCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: AnimatedSpeedGauge(
                    value: speed,
                    max: gaugeMax,
                    color: _opColors[op]!,
                    label: op,
                    duration: const Duration(milliseconds: 600),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),

            // ── Detailed Stats Table ──
            Text("Detailed Statistics", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Table(
                columnWidths: const {
                  0: FlexColumnWidth(2.2),
                  1: FlexColumnWidth(1.5),
                  2: FlexColumnWidth(1.5),
                  3: FlexColumnWidth(1.2),
                },
                children: [
                  TableRow(
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlue.withValues(alpha: 0.06),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                    ),
                    children: [
                      _tableHeader("Operator"),
                      _tableHeader("DL (Mbps)"),
                      _tableHeader("UL (Mbps)"),
                      _tableHeader("Ping"),
                    ],
                  ),
                  ..._operators.map((op) {
                    final d = regionData[op]!;
                    return TableRow(
                      children: [
                        _tableCell(op, color: _opColors[op], isBold: true),
                        _tableCell(d.dl.toStringAsFixed(1)),
                        _tableCell(d.ul.toStringAsFixed(1)),
                        _tableCell("${d.ping}ms"),
                      ],
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Data source disclaimer
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warningOrange.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 16, color: AppColors.warningOrange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Data based on aggregated user speed tests in each district. Actual speeds may vary.",
                      style: AppTextStyles.micro.copyWith(color: AppColors.textLight),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _tableHeader(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: Text(text,
          style: AppTextStyles.micro.copyWith(
              fontWeight: FontWeight.w700, color: AppColors.primaryBlue)),
    );
  }

  Widget _tableCell(String text, {Color? color, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: Text(text,
          style: AppTextStyles.micro.copyWith(
            fontWeight: isBold ? FontWeight.w700 : FontWeight.normal,
            color: color ?? AppColors.textPrimary,
          )),
    );
  }
}

/// Custom animated semi-circle gauge
class AnimatedSpeedGauge extends ImplicitlyAnimatedWidget {
  final double value;
  final double max;
  final Color color;
  final String label;

  const AnimatedSpeedGauge({
    super.key,
    required this.value,
    required this.max,
    required this.color,
    required this.label,
    required super.duration,
    super.curve = Curves.easeOutCubic,
  });

  @override
  AnimatedWidgetBaseState<AnimatedSpeedGauge> createState() => _AnimatedSpeedGaugeState();
}

class _AnimatedSpeedGaugeState extends AnimatedWidgetBaseState<AnimatedSpeedGauge> {
  Tween<double>? _valueTween;

  @override
  void forEachTween(TweenVisitor<dynamic> visitor) {
    _valueTween = visitor(
      _valueTween,
      widget.value,
      (dynamic value) => Tween<double>(begin: value as double),
    ) as Tween<double>?;
  }

  @override
  Widget build(BuildContext context) {
    final val = _valueTween?.evaluate(animation) ?? widget.value;
    return CustomPaint(
      painter: _GaugePainter(
        value: val,
        max: widget.max,
        color: widget.color,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(val.toStringAsFixed(1), style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.w800, color: AppColors.textPrimary, height: 1)),
          ),
          Text("Mbps", style: AppTextStyles.micro.copyWith(color: AppColors.textLight, height: 1)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: widget.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(widget.label, style: AppTextStyles.micro.copyWith(fontWeight: FontWeight.bold, color: widget.color)),
          ),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double value;
  final double max;
  final Color color;

  _GaugePainter({required this.value, required this.max, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    // The center of the semi-circle is at the bottom-middle of the canvas
    final center = Offset(size.width / 2, size.height - 30);
    // Radius should fit within the width, minus padding for stroke width
    final radius = (size.width / 2) - 10;
    
    final paintBg = Paint()
      ..color = AppColors.border.withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    final paintFg = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);

    // Draw background arc (180 degrees)
    canvas.drawArc(
      rect,
      pi, // start angle
      pi, // sweep angle
      false,
      paintBg,
    );

    // Draw foreground arc
    double fraction = max > 0 ? (value / max).clamp(0.0, 1.0) : 0.0;
    canvas.drawArc(
      rect,
      pi, // start angle
      pi * fraction, // sweep angle
      false,
      paintFg,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.value != value || oldDelegate.max != max || oldDelegate.color != color;
  }
}
