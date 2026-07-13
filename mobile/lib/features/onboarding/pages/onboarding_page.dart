import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<Map<String, String>> _slides = [
    {
      "title": "Monitor Network Quality",
      "subtitle": "Track real-time signal strength, coverage, and performance across all serving telecom operators in Sierra Leone.",
      "image": "📶",
    },
    {
      "title": "Analyze Coverage Maps",
      "subtitle": "Visualize network footprints using interactive contour heatmaps and identify coverage gaps in rural districts.",
      "image": "🗺️",
    },
    {
      "title": "Regulate with Data",
      "subtitle": "Generate compliance KPI audit files and verify QoS obligations match regulatory framework tolerances.",
      "image": "📊",
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Slide Content
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (idx) {
                  setState(() {
                    _currentIndex = idx;
                  });
                },
                itemBuilder: (context, idx) {
                  final slide = _slides[idx];
                  return Column(
                    children: [
                      // Graphic Area
                      Expanded(
                        child: Container(
                          width: double.infinity,
                          margin: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceGray,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          alignment: Alignment.center,
                          child: Text(slide["image"]!, style: const TextStyle(fontSize: 100)),
                        ),
                      ),
                      // Text info
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
                        child: Column(
                          children: [
                            Text(slide["title"]!, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            const SizedBox(height: 10),
                            Text(slide["subtitle"]!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4)),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

            // Navigation Row & Page Indicator Dots
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Skip button
                  _currentIndex < 2
                      ? TextButton(
                          onPressed: () => context.go('/login'),
                          child: const Text("Skip", style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        )
                      : const SizedBox(width: 60),

                  // Dots Indicator
                  Row(
                    children: List.generate(_slides.length, (idx) {
                      final active = idx == _currentIndex;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: active ? 24 : 8,
                        height: 8,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(
                          color: active ? AppColors.accentBlue : AppColors.borderLight,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),

                  // Next / Get Started button
                  _currentIndex < 2
                      ? TextButton(
                          onPressed: () {
                            _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                          },
                          child: const Text("Next →", style: TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.bold)),
                        )
                      : ElevatedButton(
                          onPressed: () => context.go('/login'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accentBlue,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Text("Get Started", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
