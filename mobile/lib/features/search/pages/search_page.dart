import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _searchController = TextEditingController();
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _isTyping = _searchController.text.isNotEmpty;
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceGray,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Container(
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.surfaceGray,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: TextField(
            controller: _searchController,
            autofocus: true,
            decoration: InputDecoration(
              hintText: "Search sites, operators, alerts...",
              prefixIcon: const Icon(Icons.search_rounded, size: 18),
              suffixIcon: _isTyping
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      onPressed: () => _searchController.clear(),
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 8),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
            ),
            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isTyping ? _buildSearchResults() : _buildSearchBrowseView(),
    );
  }

  Widget _buildSearchBrowseView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. Recent Searches
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text("Recent Searches", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
            Text("Clear all", style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 10),
        _recentItem("Freetown cell sites"),
        _recentItem("Sierra Tel call drop alerts"),
        _recentItem("SL001245 tower logs"),
        const SizedBox(height: 24),

        // 2. Browse by Category grid
        const Text("Browse by Category", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.5,
          children: [
            _categoryCard("Cell Sites", Icons.cell_tower_rounded, AppColors.accentBlue, '/sites'),
            _categoryCard("Operators", Icons.corporate_fare_rounded, AppColors.successGreen, '/operators'),
            _categoryCard("System Alerts", Icons.warning_amber_rounded, AppColors.errorRed, '/alerts'),
            _categoryCard("Regulatory Reports", Icons.description_outlined, AppColors.primaryBlue, '/reports'),
          ],
        ),
      ],
    );
  }

  Widget _recentItem(String term) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          const Icon(Icons.history_rounded, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(child: Text(term, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary))),
          const Icon(Icons.close_rounded, size: 16, color: AppColors.textMuted),
        ],
      ),
    );
  }

  Widget _categoryCard(String label, IconData icon, Color color, String route) {
    return GestureDetector(
      onTap: () => context.go(route),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary)),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResults() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _resultGroupHeader("CELL SITES"),
        _resultSiteTile("SL001245", "Freetown, Western Area", "Active", AppColors.successGreen),
        _resultSiteTile("SL001246", "Makeni, Northern Province", "Maintenance", AppColors.warningAmber),
        const SizedBox(height: 16),
        _resultGroupHeader("SYSTEM ALERTS"),
        _resultAlertTile("High Call Drop Rate", "Sierra Tel", "10 min ago", AppColors.errorRed),
        _resultAlertTile("Low 4G Footprint", "Orange", "25 min ago", AppColors.warningAmber),
      ],
    );
  }

  Widget _resultGroupHeader(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, top: 8.0),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.textMuted, letterSpacing: 0.8)),
    );
  }

  Widget _resultSiteTile(String id, String loc, String status, Color color) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: AppColors.surfaceGray, shape: BoxShape.circle),
        child: const Icon(Icons.cell_tower_rounded, color: AppColors.accentBlue, size: 18),
      ),
      title: Text("Site ID: $id", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
      subtitle: Text(loc, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
        child: Text(status, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
      ),
      onTap: () => context.push('/site-details/$id'),
      dense: true,
    );
  }

  Widget _resultAlertTile(String title, String op, String time, Color color) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
        child: Icon(Icons.warning_amber_rounded, color: color, size: 18),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
      subtitle: Text("$op · $time", style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      onTap: () => context.push('/alerts'),
      dense: true,
    );
  }
}
