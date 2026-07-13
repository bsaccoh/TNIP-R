import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import '../../core/models/app_models.dart';

class ComplaintsScreen extends ConsumerStatefulWidget {
  const ComplaintsScreen({super.key});

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  String _selectedFilter = "All"; // All, Open, In Progress, Resolved, Closed

  final List<String> _filters = ["All", "Open", "In Progress", "Resolved", "Closed"];

  @override
  Widget build(BuildContext context) {
    final complaints = ref.watch(complaintsProvider);

    // Apply active filter
    final filteredComplaints = complaints.where((c) {
      if (_selectedFilter == "All") return true;
      if (_selectedFilter == "Open" && c.status == "NEW") return true;
      if (_selectedFilter == "In Progress" && c.status == "IN_PROGRESS") return true;
      if (_selectedFilter == "Resolved" && c.status == "RESOLVED") return true;
      if (_selectedFilter == "Closed" && c.status == "CLOSED") return true;
      return false;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("My Complaints", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold)),
              IconButton(
                icon: const Icon(Icons.tune_rounded, color: AppColors.textPrimary, size: 24),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // Filter pills row
          const SizedBox(height: 10),
          _buildFilterRow(),
          const SizedBox(height: 16),

          // Complaints list
          Expanded(
            child: filteredComplaints.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredComplaints.length,
                    itemBuilder: (context, index) {
                      final complaint = filteredComplaints[index];
                      return _buildComplaintCard(context, complaint);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterRow() {
    return SizedBox(
      height: 38,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _filters.length,
        itemBuilder: (context, index) {
          final filter = _filters[index];
          final isActive = _selectedFilter == filter;

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedFilter = filter;
              });
            },
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primaryBlue : AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(17),
                border: Border.all(
                  color: isActive ? AppColors.primaryBlue : AppColors.dynamicBorder,
                  width: 1.0,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                filter,
                style: AppTextStyles.small.copyWith(
                  color: isActive ? Colors.white : AppColors.dynamicTextSecondary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.assignment_late_outlined, size: 48, color: AppColors.textLight),
          const SizedBox(height: 12),
          Text(
            "No complaints found for '$_selectedFilter'",
            style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(BuildContext context, ComplaintItem complaint) {
    final statusColor = _getStatusColor(complaint.status);
    return Card(
      color: AppColors.dynamicCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.dynamicBorder),
        ),
        child: InkWell(
          onTap: () => context.push('/complaint-details', extra: complaint),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.dynamicBackground,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.cell_tower_rounded, color: AppColors.textLight, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      complaint.issueType,
                      style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text("Operator: ${complaint.operatorName}", style: AppTextStyles.micro),
                    Text(complaint.areaDetail, style: AppTextStyles.micro),
                    const SizedBox(height: 4),
                    Text(complaint.createdAt, style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusLabel(complaint.status),
                      style: AppTextStyles.micro.copyWith(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textLight, size: 18),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'IN_PROGRESS': return AppColors.progressYellow;
      case 'RESOLVED': return AppColors.successGreen;
      case 'CLOSED': return AppColors.closedGrey;
      default: return AppColors.primaryBlue;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'IN_PROGRESS': return "In Progress";
      case 'RESOLVED': return "Resolved";
      case 'CLOSED': return "Closed";
      default: return "Open";
    }
  }
}
