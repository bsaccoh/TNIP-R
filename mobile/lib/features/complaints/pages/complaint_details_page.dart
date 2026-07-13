import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class ComplaintDetailsPage extends StatelessWidget {
  final String complaintId;

  const ComplaintDetailsPage({super.key, required this.complaintId});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Complaint Details",
      subtitle: "Ticket ID: $complaintId",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Complaint header card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(complaintId, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFFEEBEE), borderRadius: BorderRadius.circular(6)),
                      child: const Text("Open", style: TextStyle(color: AppColors.errorRed, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text("Poor Coverage - No Signal", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                _detailGrid(),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Complainant info
          _sectionTitle("Complainant Info"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("John Doe", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                const Text("Contact Phone: +232 76 123456", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.surfaceGray, borderRadius: BorderRadius.circular(4)),
                  child: const Text("Individual Subscriber", style: TextStyle(fontSize: 9, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Map thumbnail
          _sectionTitle("Incident Location Map"),
          Container(
            height: 120,
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.location_on_rounded, color: AppColors.errorRed, size: 24),
                  SizedBox(height: 4),
                  Text("Incident location pin visual thumbnail", style: TextStyle(color: AppColors.textSecondary, fontSize: 10)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 4. Technical Assessment
          _sectionTitle("Technical Diagnostics"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _assessRow("Reported Signal Level", "-105 dBm (Poor)"),
                _assessRow("Serving Sector Check", "No active RF signal detected"),
                _assessRow("Nearest Cell Site ID", "SL001245 (2.3 km distance)"),
                _assessRow("Operator SLA Status", "Pending response"),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 5. Timeline
          _sectionTitle("Resolution Timeline"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _timelineRow("Jul 11, 2025", "Complaint logged by system subscriber desk"),
                _timelineRow("Jul 12, 2025", "Assigned to Senior Analyst Ahmed for RF logging"),
                _timelineRow("Jul 13, 2025", "Operator NOC dispatched notification check"),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 6. Action buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
                  child: const Text("Acknowledge", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.warningAmber, foregroundColor: Colors.white),
                  child: const Text("Escalate", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.successGreen, foregroundColor: Colors.white),
                  child: const Text("Resolve", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          )
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

  Widget _detailGrid() {
    return Table(
      children: [
        TableRow(children: [
          _cell("Operator:", "Sierra Tel"),
          _cell("Type:", "Coverage Issue"),
        ]),
        TableRow(children: [
          _cell("Priority:", "High"),
          _cell("Filed Date:", "Jul 11, 2025"),
        ]),
      ],
    );
  }

  Widget _cell(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _assessRow(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          Text(val, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _timelineRow(String date, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(date, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.accentBlue)),
          const SizedBox(width: 12),
          Expanded(child: Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary))),
        ],
      ),
    );
  }
}
