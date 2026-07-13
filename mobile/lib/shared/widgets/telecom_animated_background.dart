import 'dart:math';
import 'package:flutter/material.dart';
import '../../app/theme/app_colors.dart';

class TelecomAnimatedBackground extends StatefulWidget {
  final String intensity; // splash, login, home
  final bool showWifiArcs;
  final bool showParticles;
  final bool showDataStreams;
  final bool showGrid;

  const TelecomAnimatedBackground({
    super.key,
    this.intensity = "home",
    this.showWifiArcs = true,
    this.showParticles = true,
    this.showDataStreams = true,
    this.showGrid = true,
  });

  @override
  State<TelecomAnimatedBackground> createState() => _TelecomAnimatedBackgroundState();
}

class _TelecomAnimatedBackgroundState extends State<TelecomAnimatedBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<_Particle> _particles = [];
  final List<_DataStream> _streams = [];
  final Random _rand = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();

    // Initialize particles
    for (int i = 0; i < 25; i++) {
      _particles.add(_Particle(
        x: _rand.nextDouble(),
        y: _rand.nextDouble(),
        speed: 0.05 + _rand.nextDouble() * 0.05,
        size: 1.5 + _rand.nextDouble() * 2.5,
        color: _getRandomParticleColor(),
        opacity: 0.2 + _rand.nextDouble() * 0.4,
      ));
    }

    // Initialize data streams
    for (int i = 0; i < 6; i++) {
      _streams.add(_DataStream(
        x: _rand.nextDouble(),
        y: _rand.nextDouble(),
        speed: 0.1 + _rand.nextDouble() * 0.15,
        length: 40 + _rand.nextDouble() * 80,
        color: _getRandomParticleColor(),
      ));
    }
  }

  Color _getRandomParticleColor() {
    final colors = [
      AppColors.primaryAccentBlue,
      AppColors.successGreen,
      AppColors.purple5G,
      AppColors.tealAccent,
    ];
    return colors[_rand.nextInt(colors.length)];
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    double baseOpacity = 1.0;
    if (widget.intensity == "login") baseOpacity = 0.7;
    if (widget.intensity == "splash") baseOpacity = 0.9;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        // Update particles
        if (widget.showParticles) {
          for (var p in _particles) {
            p.y -= p.speed * 0.01;
            if (p.y < 0) {
              p.y = 1.0;
              p.x = _rand.nextDouble();
            }
          }
        }

        // Update data streams
        if (widget.showDataStreams) {
          for (var s in _streams) {
            s.y += s.speed * 0.01;
            if (s.y > 1.0) {
              s.y = -0.1;
              s.x = _rand.nextDouble();
            }
          }
        }

        return Opacity(
          opacity: baseOpacity,
          child: CustomPaint(
            painter: _BackgroundPainter(
              progress: _controller.value,
              particles: _particles,
              streams: _streams,
              showWifiArcs: widget.showWifiArcs,
              showParticles: widget.showParticles,
              showDataStreams: widget.showDataStreams,
              showGrid: widget.showGrid,
              intensity: widget.intensity,
            ),
          ),
        );
      },
    );
  }
}

class _Particle {
  double x;
  double y;
  double speed;
  double size;
  Color color;
  double opacity;

  _Particle({
    required this.x,
    required this.y,
    required this.speed,
    required this.size,
    required this.color,
    required this.opacity,
  });
}

class _DataStream {
  double x;
  double y;
  double speed;
  double length;
  Color color;

  _DataStream({
    required this.x,
    required this.y,
    required this.speed,
    required this.length,
    required this.color,
  });
}

class _BackgroundPainter extends CustomPainter {
  final double progress;
  final List<_Particle> particles;
  final List<_DataStream> streams;
  final bool showWifiArcs;
  final bool showParticles;
  final bool showDataStreams;
  final bool showGrid;
  final String intensity;

  _BackgroundPainter({
    required this.progress,
    required this.particles,
    required this.streams,
    required this.showWifiArcs,
    required this.showParticles,
    required this.showDataStreams,
    required this.showGrid,
    required this.intensity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw base gradient
    final baseGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        AppColors.primaryBackground,
        intensity == "home" ? const Color(0xFF060B14) : AppColors.primaryBackground,
      ],
    );
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), Paint()..shader = baseGradient.createShader(Rect.fromLTWH(0, 0, size.width, size.height)));

    // 2. Draw Glow Orbs
    _drawGlowOrbs(canvas, size);

    // 3. Draw Perspective Grid
    if (showGrid) {
      _drawGrid(canvas, size);
    }

    // 4. Draw Wifi signal arcs
    if (showWifiArcs) {
      _drawWifiArcs(canvas, size);
    }

    // 5. Draw Data Streams
    if (showDataStreams) {
      _drawDataStreams(canvas, size);
    }

    // 6. Draw Particles
    if (showParticles) {
      _drawParticles(canvas, size);
    }
  }

  void _drawGlowOrbs(Canvas canvas, Size size) {
    final orb1 = Paint()
      ..color = AppColors.primaryAccentBlue.withOpacity(0.06)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 80);
    canvas.drawCircle(Offset(size.width * 0.8, size.height * 0.2), 120 + sin(progress * 2 * pi) * 20, orb1);

    final orb2 = Paint()
      ..color = AppColors.successGreen.withOpacity(0.04)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 70);
    canvas.drawCircle(Offset(size.width * 0.2, size.height * 0.8), 100 + cos(progress * 2 * pi) * 15, orb2);

    final orb3 = Paint()
      ..color = AppColors.purple5G.withOpacity(0.04)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 80);
    canvas.drawCircle(Offset(size.width * 0.5, size.height * 0.5), 110 + sin(progress * pi) * 10, orb3);
  }

  void _drawGrid(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppColors.primaryAccentBlue.withOpacity(intensity == "login" ? 0.03 : 0.06)
      ..strokeWidth = 1.0;

    double offset = (progress * 60) % 60;
    
    // Draw horizontal grid lines moving up
    for (double y = size.height; y > 0; y -= 60) {
      double currentY = y - offset;
      canvas.drawLine(Offset(0, currentY), Offset(size.width, currentY), gridPaint);
    }

    // Draw perspective vertical lines radiating outward
    int lines = 10;
    double step = size.width / (lines - 1);
    for (int i = 0; i < lines; i++) {
      double startX = i * step;
      canvas.drawLine(Offset(startX, 0), Offset(startX, size.height), gridPaint);
    }
  }

  void _drawWifiArcs(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.3);
    
    // Draw 4 stagered concentric signal waves
    for (int i = 0; i < 4; i++) {
      double scaleProgress = (progress + (i * 0.25)) % 1.0;
      double radius = 30 + (scaleProgress * 150);
      double opacity = (1.0 - scaleProgress) * 0.15;
      if (intensity == "login") opacity *= 0.6;

      final Color color;
      if (i == 0) color = AppColors.successGreen;
      else if (i == 1) color = AppColors.primaryAccentBlue;
      else if (i == 2) color = AppColors.purple5G;
      else color = AppColors.primaryAccentBlue;

      final wavePaint = Paint()
        ..color = color.withOpacity(opacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = max(0.5, 3.0 - (scaleProgress * 2.0));

      canvas.drawCircle(center, radius, wavePaint);
    }
  }

  void _drawDataStreams(Canvas canvas, Size size) {
    final streamPaint = Paint()..strokeWidth = 1.0;
    for (var s in streams) {
      final y = s.y * size.height;
      final x = s.x * size.width;

      final shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [s.color.withOpacity(0.0), s.color.withOpacity(0.25)],
      ).createShader(Rect.fromLTWH(x, y, 1, s.length));

      streamPaint.shader = shader;
      canvas.drawLine(Offset(x, y), Offset(x, y + s.length), streamPaint);
    }
  }

  void _drawParticles(Canvas canvas, Size size) {
    final pPaint = Paint()..style = PaintingStyle.fill;
    for (var p in particles) {
      pPaint.color = p.color.withOpacity(p.opacity);
      canvas.drawCircle(Offset(p.x * size.width, p.y * size.height), p.size, pPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _BackgroundPainter oldDelegate) => true;
}
