import 'package:flutter/material.dart';
import '../../app/theme/app_theme.dart';
import '../../core/models/app_models.dart';

class ComplaintDetailsScreen extends StatefulWidget {
  final ComplaintItem complaint;

  const ComplaintDetailsScreen({super.key, required this.complaint});

  @override
  State<ComplaintDetailsScreen> createState() => _ComplaintDetailsScreenState();
}

class _ComplaintDetailsScreenState extends State<ComplaintDetailsScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(widget.complaint.status);
    final statusLabel = _getStatusLabel(widget.complaint.status);

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text("Complaint Details", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: AppColors.textPrimary, size: 22),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Title and Badge row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(widget.complaint.issueType, style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    statusLabel,
                    style: AppTextStyles.small.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Metadata card (2x2 grid with dividers)
            _buildMetadataCard(),
            const SizedBox(height: 24),

            // Description
            Text("DESCRIPTION", style: AppTextStyles.micro.copyWith(letterSpacing: 1.0, color: AppColors.textLight)),
            const SizedBox(height: 6),
            Text(
              widget.complaint.description,
              style: AppTextStyles.body.copyWith(height: 1.6),
            ),
            const SizedBox(height: 24),

            // Updates Timeline
            Text("Updates", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _buildTimeline(),
            const SizedBox(height: 30),

            // Add Comment Bottom link
            Center(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add_comment_outlined, size: 16, color: AppColors.primaryBlue),
                    const SizedBox(width: 6),
                    Text(
                      "Add Comment",
                      style: AppTextStyles.body.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetadataCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              _gridCell("Complaint ID", widget.complaint.reference),
              const SizedBox(
                height: 40,
                child: VerticalDivider(color: AppColors.border, width: 24),
              ),
              _gridCell("Reported on", widget.complaint.createdAt),
            ],
          ),
          const Divider(height: 24, color: AppColors.border),
          Row(
            children: [
              _gridCell("Operator", widget.complaint.operatorName),
              const SizedBox(
                height: 40,
                child: VerticalDivider(color: AppColors.border, width: 24),
              ),
              _gridCell("Location", "${widget.complaint.areaDetail}, ${widget.complaint.district}"),
            ],
          ),
        ],
      ),
    );
  }

  Widget _gridCell(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline() {
    // Determine timeline events based on complaint state
    final events = [
      UpdateTimelineEvent(
        title: "Complaint Received",
        timestamp: widget.complaint.createdAt,
        description: "Complaint received and is being reviewed.",
        dotColor: AppColors.primaryBlue,
      ),
      if (widget.complaint.status != 'NEW')
        const UpdateTimelineEvent(
          title: "Assigned to Tech Team",
          timestamp: "11 Jul 2025, 01:30 PM",
          description: "Issue assigned to technical team.",
          dotColor: AppColors.accentGreen,
        ),
      if (widget.complaint.status == 'IN_PROGRESS')
        const UpdateTimelineEvent(
          title: "In Progress",
          timestamp: "Active Working State",
          description: "We are working to resolve this issue.",
          dotColor: AppColors.progressYellow,
        ),
      if (widget.complaint.status == 'RESOLVED')
        const UpdateTimelineEvent(
          title: "Resolved",
          timestamp: "Completion State",
          description: "This network anomaly has been resolved.",
          dotColor: AppColors.successGreen,
        ),
      if (widget.complaint.status == 'CLOSED')
        const UpdateTimelineEvent(
          title: "Closed",
          timestamp: "Verification State",
          description: "This complaint is closed.",
          dotColor: AppColors.closedGrey,
        ),
    ];

    return Column(
      children: List.generate(events.length, (index) {
        final ev = events[index];
        final isLast = index == events.length - 1;
        final isPulsing = ev.title == "In Progress" && widget.complaint.status == 'IN_PROGRESS';

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Column vertical indicator
              Column(
                children: [
                  isPulsing
                      ? ScaleTransition(
                          scale: Tween<double>(begin: 0.9, end: 1.3).animate(
                            CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
                          ),
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: ev.dotColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        )
                      : Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: ev.dotColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                  if (!isLast)
                    Expanded(
                      child: Container(
                        width: 2,
                        color: AppColors.border,
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),
              // Content Column
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ev.title == "In Progress" ? "In Progress" : ev.timestamp,
                        style: AppTextStyles.small.copyWith(
                          fontWeight: FontWeight.bold,
                          color: ev.title == "In Progress" ? AppColors.warningOrange : AppColors.dynamicTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        ev.description,
                        style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      }),
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
