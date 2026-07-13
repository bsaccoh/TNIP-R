import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class ExportCenterPage extends StatefulWidget {
  const ExportCenterPage({super.key});

  @override
  State<ExportCenterPage> createState() => _ExportCenterPageState();
}

class _ExportCenterPageState extends State<ExportCenterPage> {
  String _activeType = "KPI";
  String _activeFormat = "PDF";
  bool _isGenerating = false;
  double _progress = 0.0;

  final List<Map<String, dynamic>> _history = const [
    {"name": "Monthly KPI Audit Report Jul 2025", "format": "PDF", "size": "2.4 MB", "date": "Jul 11"},
    {"name": "Drive Test Logging Run SL-248", "format": "CSV", "size": "156 KB", "date": "Jul 10"},
    {"name": "Freetown 4G Footprint Heatmap", "format": "KML", "size": "4.1 MB", "date": "Jul 09"},
  ];

  void _handleGenerate() {
    setState(() {
      _isGenerating = true;
      _progress = 0.0;
    });

    // Simulate progress bar
    Future.doWhile(() async {
      await Future.delayed(const Duration(milliseconds: 200));
      if (!mounted) return false;
      setState(() {
        _progress += 0.15;
      });
      if (_progress >= 1.0) {
        setState(() {
          _isGenerating = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Audit file generated and saved successfully!")),
        );
        return false;
      }
      return true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Export Center",
      subtitle: "Regulatory audit reporting center",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Select Report Type grid
          _sectionTitle("Select Report Type"),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.35,
            children: [
              _typeCard("KPI Audit Report", "KPI", Icons.analytics_outlined),
              _typeCard("Coverage Map Layer", "Map", Icons.map_outlined),
              _typeCard("Drive Test Logs", "Drive", Icons.directions_car_filled_outlined),
              _typeCard("Compliance Violations", "Compliance", Icons.gavel_rounded),
            ],
          ),
          const SizedBox(height: 20),

          // 2. Select Format Row
          _sectionTitle("Export Format"),
          _buildFormatSelector(),
          const SizedBox(height: 20),

          // 3. Date selection strip
          _sectionTitle("Date Range Selection"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: const [
                Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.primaryBlue),
                SizedBox(width: 10),
                Text("04 Jul 2025 - 11 Jul 2025", style: TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                Spacer(),
                Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 4. Generate button or progress state
          _isGenerating ? _buildProgressBlock() : _buildGenerateButton(),
          const SizedBox(height: 24),

          // 5. History logs list
          _sectionTitle("Recent Exports History"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: _history.map((h) => _historyRow(h)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _typeCard(String title, String type, IconData icon) {
    final active = type == _activeType;
    return GestureDetector(
      onTap: () => setState(() => _activeType = type),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFE3F2FD) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: active ? AppColors.accentBlue : AppColors.borderLight, width: active ? 1.5 : 1.0),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: active ? AppColors.accentBlue : AppColors.textSecondary, size: 22),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary)),
          ],
        ),
      ),
    );
  }

  Widget _buildFormatSelector() {
    final formats = ["PDF", "CSV", "Excel", "KML"];
    return Row(
      children: formats.map((f) {
        final active = f == _activeFormat;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _activeFormat = f),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              height: 38,
              decoration: BoxDecoration(
                color: active ? AppColors.accentBlue : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? AppColors.accentBlue : AppColors.borderLight),
              ),
              alignment: Alignment.center,
              child: Text(
                f,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: active ? Colors.white : AppColors.textSecondary),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildGenerateButton() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton.icon(
        onPressed: _handleGenerate,
        icon: const Icon(Icons.download_rounded, color: Colors.white, size: 20),
        label: const Text("Generate Export", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentBlue,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildProgressBlock() {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: _progress.clamp(0.0, 1.0),
            minHeight: 8,
            backgroundColor: AppColors.surfaceGray,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentBlue),
          ),
        ),
        const SizedBox(height: 8),
        Text("Generating export reports... ${(_progress * 100).toInt().clamp(0, 100)}%", style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _historyRow(Map<String, dynamic> h) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(h["name"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text("Format: ${h["format"]} · Size: ${h["size"]} · Created ${h["date"]}", style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.download_rounded, color: AppColors.accentBlue, size: 20),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}
