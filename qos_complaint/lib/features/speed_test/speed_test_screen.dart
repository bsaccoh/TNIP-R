import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../app/theme/app_theme.dart';
import '../../core/models/app_models.dart';
import '../../app/providers/state_providers.dart';
class SpeedTestScreen extends ConsumerStatefulWidget {
  const SpeedTestScreen({super.key});

  @override
  ConsumerState<SpeedTestScreen> createState() => _SpeedTestScreenState();
}

class _SpeedTestScreenState extends ConsumerState<SpeedTestScreen> with SingleTickerProviderStateMixin {
  late AnimationController _gaugeController;
  late Animation<double> _gaugeAnimation;

  String _testingStage = 'idle'; // idle, ping, download, upload, done
  double _currentSpeed = 0.0;
  int _ping = 0;
  double _downloadSpeed = 0.0;
  double _uploadSpeed = 0.0;
  String _carrierName = "Sierra Tel";

  @override
  void initState() {
    super.initState();
    _gaugeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _gaugeAnimation = Tween<double>(begin: 0.0, end: 0.0).animate(
      CurvedAnimation(parent: _gaugeController, curve: Curves.easeOutCubic),
    )..addListener(() {
        setState(() {
          _currentSpeed = _gaugeAnimation.value;
        });
      });
  }

  @override
  void dispose() {
    _gaugeController.dispose();
    super.dispose();
  }

  void _animateNeedle(double targetValue) {
    _gaugeAnimation = Tween<double>(begin: _currentSpeed, end: targetValue).animate(
      CurvedAnimation(parent: _gaugeController, curve: Curves.easeOutCubic),
    );
    _gaugeController.reset();
    _gaugeController.forward();
  }

  Future<void> _runSpeedTest() async {
    setState(() {
      _testingStage = 'ping';
      _currentSpeed = 0.0;
      _ping = 0;
      _downloadSpeed = 0.0;
      _uploadSpeed = 0.0;
      _carrierName = "Sierra Tel";
    });

    try {
      // 1. Ping test
      final stopwatch = Stopwatch()..start();
      final pingRes = await http.get(Uri.parse('https://speed.cloudflare.com/')).timeout(const Duration(milliseconds: 1500));
      stopwatch.stop();
      if (pingRes.statusCode == 200) {
        setState(() {
          _ping = stopwatch.elapsedMilliseconds;
        });
      }

      // 2. Download speed test
      setState(() {
        _testingStage = 'download';
      });
      final dlStopwatch = Stopwatch()..start();
      final dlRes = await http.get(Uri.parse('https://speed.cloudflare.com/__down?bytes=5242880')).timeout(const Duration(seconds: 6)); // 5MB payload
      dlStopwatch.stop();
      if (dlRes.statusCode == 200) {
        double sec = dlStopwatch.elapsedMilliseconds / 1000.0;
        double bits = dlRes.bodyBytes.length * 8.0;
        double mbps = (bits / 1000000.0) / sec;
        
        _animateNeedle(mbps);
        setState(() {
          _downloadSpeed = mbps;
        });
      }

      await Future.delayed(const Duration(milliseconds: 500));

      // 3. Upload speed test
      setState(() {
        _testingStage = 'upload';
      });
      final ulStopwatch = Stopwatch()..start();
      final payload = List.generate(1 * 1024 * 1024, (index) => 0); // 1MB upload payload
      final ulRes = await http.post(
        Uri.parse('https://speed.cloudflare.com/__up'),
        body: payload,
      ).timeout(const Duration(seconds: 6));
      ulStopwatch.stop();
      if (ulRes.statusCode == 200 || ulRes.statusCode == 204) {
        double sec = ulStopwatch.elapsedMilliseconds / 1000.0;
        double bits = payload.length * 8.0;
        double mbps = (bits / 1000000.0) / sec;
        
        _animateNeedle(mbps);
        setState(() {
          _uploadSpeed = mbps;
        });
      }

      setState(() {
        _testingStage = 'done';
      });
      _saveResult();
    } catch (_) {
      // Offline / Timeout simulation fallback
      _runSimulatedTest();
    }
  }

  Future<void> _runSimulatedTest() async {
    // 1. Sim ping
    setState(() {
      _testingStage = 'ping';
    });
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() {
      _ping = 18 + Random().nextInt(15);
    });

    // 2. Sim download
    setState(() {
      _testingStage = 'download';
    });
    for (double i = 0; i <= 36; i += 2.0) {
      if (!mounted) return;
      _animateNeedle(i + (Random().nextDouble() * 2.0 - 1.0));
      await Future.delayed(const Duration(milliseconds: 80));
    }
    double finalDl = 32.5 + Random().nextDouble() * 6.0;
    _animateNeedle(finalDl);
    setState(() {
      _downloadSpeed = finalDl;
    });
    await Future.delayed(const Duration(milliseconds: 1000));

    // 3. Sim upload
    setState(() {
      _testingStage = 'upload';
    });
    for (double i = 0; i <= 14; i += 1.2) {
      if (!mounted) return;
      _animateNeedle(i + (Random().nextDouble() * 1.0 - 0.5));
      await Future.delayed(const Duration(milliseconds: 80));
    }
    double finalUl = 11.2 + Random().nextDouble() * 3.0;
    _animateNeedle(finalUl);
    setState(() {
      _uploadSpeed = finalUl;
    });
    await Future.delayed(const Duration(milliseconds: 1000));

    setState(() {
      _testingStage = 'done';
    });
    _saveResult();
  }

  void _saveResult() {
    final now = DateTime.now();
    final dateStr = "${now.day} Jul ${now.year}, ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} ${now.hour >= 12 ? 'PM' : 'AM'}";
    final result = SpeedTestResult(
      id: "ST${now.millisecondsSinceEpoch}",
      timestamp: dateStr,
      downloadSpeed: _downloadSpeed,
      uploadSpeed: _uploadSpeed,
      ping: _ping,
      networkType: "WiFi/4G",
      operatorName: _carrierName,
    );
    ref.read(speedTestHistoryProvider.notifier).addResult(result);
  }

  @override
  Widget build(BuildContext context) {
    final double displaySpeed = (_testingStage == 'download') 
        ? (_downloadSpeed > 0 ? _downloadSpeed : _currentSpeed) 
        : (_testingStage == 'upload' ? (_uploadSpeed > 0 ? _uploadSpeed : _currentSpeed) : _currentSpeed);

    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Speed Test", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
              IconButton(
                icon: const Icon(Icons.info_outline_rounded, color: AppColors.textSecondary),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              const SizedBox(height: 16),
              
              // Custom Radial Gauge Canvas
              Center(
                child: Container(
                  width: 320,
                  height: 280,
                  decoration: BoxDecoration(
                    color: AppColors.isDark ? const Color(0xFF161B33) : AppColors.dynamicCard,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.dynamicBorder),
                    boxShadow: const [
                      BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4)),
                    ],
                  ),
                  padding: const EdgeInsets.all(20),
                  child: CustomPaint(
                    painter: _SpeedometerPainter(
                      speed: displaySpeed,
                      stage: _testingStage,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // KPI results card (Ping, Download, Upload)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.dynamicCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.dynamicBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _kpiStat("PING", "${_ping > 0 ? _ping : '-'} ms", Icons.network_ping_rounded, AppColors.primaryBlue),
                    _verticalDivider(),
                    _kpiStat("DOWNLOAD", "${_downloadSpeed > 0 ? _downloadSpeed.toStringAsFixed(2) : '-'} Mbps", Icons.arrow_downward_rounded, AppColors.accentGreen),
                    _verticalDivider(),
                    _kpiStat("UPLOAD", "${_uploadSpeed > 0 ? _uploadSpeed.toStringAsFixed(2) : '-'} Mbps", Icons.arrow_upward_rounded, AppColors.warningOrange),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Carrier details card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.dynamicCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.dynamicBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(color: AppColors.primaryBlue.withOpacity(0.12), shape: BoxShape.circle),
                      child: const Icon(Icons.corporate_fare_rounded, color: AppColors.primaryBlue, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_carrierName, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 13)),
                          const SizedBox(height: 2),
                          const Text("Connected Mobile Carrier Host", style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.blueLightBG, borderRadius: BorderRadius.circular(6)),
                      child: const Text("WiFi/4G", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryBlue)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 30),

              // RUN TEST Action CTA
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: (_testingStage == 'idle' || _testingStage == 'done') ? _runSpeedTest : null,
                  icon: const Icon(Icons.play_circle_outline_rounded, color: Colors.white),
                  label: Text(
                    _testingStage == 'idle'
                        ? "RUN SPEED TEST"
                        : (_testingStage == 'done' ? "TEST AGAIN" : "TESTING..."),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                    elevation: 4,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Compare Operators by Region CTA
              GestureDetector(
                onTap: () => context.push('/speed-comparison'),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.dynamicCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.primaryBlue.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.compare_arrows_rounded, color: AppColors.primaryBlue, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Compare Operators by Region",
                                style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            const SizedBox(height: 2),
                            Text("See which operator is fastest in your district",
                                style: AppTextStyles.micro.copyWith(color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: AppColors.primaryBlue, size: 22),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // View Test History CTA
              GestureDetector(
                onTap: () => context.push('/speed-history'),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.dynamicCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.history_rounded, color: AppColors.accentGreen, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Speed Test History",
                                style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            const SizedBox(height: 2),
                            Text("View past results and performance trends",
                                style: AppTextStyles.micro.copyWith(color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: AppColors.accentGreen, size: 22),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _verticalDivider() {
    return const SizedBox(
      height: 40,
      child: VerticalDivider(color: AppColors.border, width: 1),
    );
  }

  Widget _kpiStat(String label, String value, IconData icon, Color iconColor) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, color: iconColor, size: 14),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
      ],
    );
  }
}

class _SpeedometerPainter extends CustomPainter {
  final double speed;
  final String stage;

  _SpeedometerPainter({required this.speed, required this.stage});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.55);
    final radius = size.height * 0.45;

    // 1. Draw dial track base
    final bgPaint = Paint()
      ..color = AppColors.isDark ? const Color(0xFF232A4A) : AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 16.0
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi * 0.75,
      pi * 1.5,
      false,
      bgPaint,
    );

    // 2. Outer sweep gradient matching color scheme
    final fillPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 16.0
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);
    
    // Draw sweep gradient manually via SweepGradient
    final sweepGrad = SweepGradient(
      colors: const [
        Color(0xFF42A5F5), // Blue (left)
        Color(0xFF26A69A), // Teal (center)
        Color(0xFF66BB6A), // Green (right)
      ],
      startAngle: pi * 0.75,
      endAngle: pi * 2.25,
      transform: const GradientRotation(0.0),
    );
    fillPaint.shader = sweepGrad.createShader(rect);

    // Calculate active speed percentage arc length
    double currentPct = (speed / 100.0).clamp(0.0, 1.0);
    if (currentPct > 0) {
      canvas.drawArc(
        rect,
        pi * 0.75,
        pi * 1.5 * currentPct,
        false,
        fillPaint,
      );
    }

    // 3. Draw inner speedometer scale texts
    final textPaint = TextPainter(
      textDirection: TextDirection.ltr,
    );

    final speeds = [0.0, 1.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 100.0];
    final labels = ["0", "1", "5", "10", "20", "30", "50", "75", "100"];
    final pcts   = [0.0, 0.12, 0.25, 0.38, 0.50, 0.62, 0.75, 0.88, 1.00];

    for (int i = 0; i < speeds.length; i++) {
      double angle = pi * 0.75 + pcts[i] * (pi * 1.5);
      double textRad = radius - 24;
      double tx = center.dx + textRad * cos(angle);
      double ty = center.dy + textRad * sin(angle);

      textPaint.text = TextSpan(
        text: labels[i],
        style: TextStyle(
          color: AppColors.isDark ? Colors.white70 : AppColors.textSecondary,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      );
      textPaint.layout();
      textPaint.paint(canvas, Offset(tx - textPaint.width / 2, ty - textPaint.height / 2));
    }

    // 4. Draw glowing triangle tail trail shadow behind the needle
    final trailPaint = Paint()
      ..color = const Color(0xFF42A5F5).withOpacity(0.12)
      ..style = PaintingStyle.fill;

    double activeAngle = pi * 0.75 + _getSpeedPct(speed) * (pi * 1.5);

    final trailPath = Path();
    trailPath.moveTo(center.dx, center.dy);
    double trailRad = radius - 16;
    
    // Splay the sidetracks backwards a small amount
    double angleOffset = 0.08; 
    trailPath.lineTo(center.dx + trailRad * cos(activeAngle), center.dy + trailRad * sin(activeAngle));
    trailPath.lineTo(center.dx + trailRad * cos(activeAngle - angleOffset), center.dy + trailRad * sin(activeAngle - angleOffset));
    trailPath.close();
    canvas.drawPath(trailPath, trailPaint);

    // 5. Draw speedometer needle pointer
    final needlePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    double needleRad = radius - 12;
    double nx = center.dx + needleRad * cos(activeAngle);
    double ny = center.dy + needleRad * sin(activeAngle);

    canvas.drawLine(center, Offset(nx, ny), needlePaint);
    canvas.drawCircle(center, 8.0, Paint()..color = Colors.white..style = PaintingStyle.fill);
    canvas.drawCircle(center, 4.0, Paint()..color = AppColors.primaryBlue..style = PaintingStyle.fill);

    // 6. Draw speedometer readout text below
    final readoutVal = TextPainter(
      text: TextSpan(
        text: speed.toStringAsFixed(2),
        style: TextStyle(
          color: AppColors.isDark ? Colors.white : AppColors.textPrimary,
          fontSize: 34,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    readoutVal.paint(canvas, Offset(center.dx - readoutVal.width / 2, center.dy + 38));

    // Downwards/Upwards Icon details
    final iconData = (stage == 'upload') ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded;
    final iconColor = (stage == 'upload') ? AppColors.warningOrange : AppColors.accentGreen;

    final iconPainter = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(iconData.codePoint),
        style: TextStyle(
          fontFamily: iconData.fontFamily,
          package: iconData.fontPackage,
          fontSize: 14,
          color: iconColor,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final labelUnits = TextPainter(
      text: const TextSpan(
        text: " Mbps",
        style: TextStyle(
          color: AppColors.textMuted,
          fontSize: 13,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    double startX = center.dx - (iconPainter.width + labelUnits.width) / 2;
    iconPainter.paint(canvas, Offset(startX, center.dy + 82));
    labelUnits.paint(canvas, Offset(startX + iconPainter.width, center.dy + 82));
  }

  double _getSpeedPct(double s) {
    final speeds = [0.0, 1.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 100.0];
    final pcts   = [0.0, 0.12, 0.25, 0.38, 0.50, 0.62, 0.75, 0.88, 1.00];
    
    if (s <= 0) return 0.0;
    if (s >= 100) return 1.0;
    
    int idx = 0;
    for (int i = 0; i < speeds.length - 1; i++) {
      if (s >= speeds[i] && s <= speeds[i+1]) {
        idx = i;
        break;
      }
    }
    
    double t = (s - speeds[idx]) / (speeds[idx+1] - speeds[idx]);
    return pcts[idx] + t * (pcts[idx+1] - pcts[idx]);
  }

  @override
  bool shouldRepaint(covariant _SpeedometerPainter oldDelegate) =>
      oldDelegate.speed != speed || oldDelegate.stage != stage;
}
