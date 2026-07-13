import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/models/app_models.dart';
import '../../../app/providers/state_providers.dart';

class DriveTestPage extends ConsumerStatefulWidget {
  const DriveTestPage({super.key});

  @override
  ConsumerState<DriveTestPage> createState() => _DriveTestPageState();
}

class _DriveTestPageState extends ConsumerState<DriveTestPage> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  int _seconds = 0; 
  Timer? _stopwatchTimer;
  String _activeTab = "Overview"; // Overview, Signal, Assigned Tasks
  bool _isRunning = false;

  // Selected config
  String _selectedOperator = "Sierra Tel";
  String _selectedRegion = "Western Area Urban";
  String _routeText = "Manual Route";
  String _sitesText = "";
  CampaignItem? _activeCampaign;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  void _startTest() {
    setState(() {
      _isRunning = true;
    });
    _stopwatchTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _seconds++;
        });
      }
    });
  }

  void _stopTest() {
    _stopwatchTimer?.cancel();
    _stopwatchTimer = null;
    setState(() {
      _isRunning = false;
    });
    _showStopConfirmDialog(context);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _stopwatchTimer?.cancel();
    super.dispose();
  }

  String _formatDuration(int totalSeconds) {
    int hours = totalSeconds ~/ 3600;
    int minutes = (totalSeconds % 3600) ~/ 60;
    int seconds = totalSeconds % 60;
    return "${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}";
  }

  int _getOperatorId(String name) {
    if (name.toLowerCase().contains("orange")) return 2;
    if (name.toLowerCase().contains("africell")) return 3;
    if (name.toLowerCase().contains("qcell")) return 4;
    return 1; // Sierra Tel
  }

  Color _getOperatorColor(String name) {
    if (name.toLowerCase().contains("orange")) return AppColors.orangeOperator;
    if (name.toLowerCase().contains("africell")) return AppColors.africellPurple;
    if (name.toLowerCase().contains("qcell")) return AppColors.qcellPurple;
    return AppColors.sierraTelColor;
  }

  @override
  Widget build(BuildContext context) {
    final assignedCampaigns = ref.watch(campaignsProvider);

    return AppScaffold(
      currentTabIndex: 2,
      showHeader: true,
      title: "Drive Test",
      subtitle: "Regulatory RF logging console",
      headerActions: [
        IconButton(
          icon: const Icon(Icons.settings_outlined, color: AppColors.textPrimary),
          onPressed: () {},
        ),
      ],
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          children: [
            // 1. Status Bar Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardWhite,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      if (_isRunning) ...[
                        ScaleTransition(
                          scale: Tween<double>(begin: 0.8, end: 1.2).animate(
                            CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
                          ),
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(color: AppColors.errorRed, shape: BoxShape.circle),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text("Recording...", style: TextStyle(color: AppColors.errorRed, fontSize: 13, fontWeight: FontWeight.bold)),
                      ] else ...[
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(color: AppColors.textMuted, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 8),
                        const Text("Standby / Ready", style: TextStyle(color: AppColors.textMuted, fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                      const SizedBox(width: 10),
                      Text(
                        _formatDuration(_seconds),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: const [
                      Text("GPS Accuracy", style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      Text("High (5m)", style: TextStyle(fontSize: 12, color: AppColors.successGreen, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 2. Tab Bar Row
            _buildTabBar(),
            const SizedBox(height: 20),

            // Toggleable Tab Content
            if (_activeTab == "Assigned Tasks") ...[
              _buildAssignedTasksTab(assignedCampaigns)
            ] else ...[
              // 3. Signal Gauge Hero section
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.cardWhite,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    // Semi-circular gauge painter
                    SizedBox(
                      height: 160,
                      width: 240,
                      child: CustomPaint(
                        painter: _SignalGaugePainter(value: -85.0),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Quality indicators
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(6)),
                          child: const Text("Good", style: TextStyle(color: AppColors.successGreen, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 10),
                        const Text("Signal Strength", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 4. Metrics Grid Row
              Row(
                children: [
                  _metricBox("RSRP", "-85 dBm"),
                  const SizedBox(width: 10),
                  _metricBox("RSRQ", "-10 dB"),
                  const SizedBox(width: 10),
                  _metricBox("SINR", "15 dB"),
                ],
              ),
              const SizedBox(height: 16),

              // 5. Setup / Operator info card
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
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(color: _getOperatorColor(_selectedOperator).withOpacity(0.12), shape: BoxShape.circle),
                          child: Icon(Icons.corporate_fare_rounded, color: _getOperatorColor(_selectedOperator), size: 18),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_selectedOperator, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 13)),
                              const SizedBox(height: 2),
                              Text(_activeCampaign != null ? "Task: ${_activeCampaign!.reference}" : "Manual Drive Test Session", style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.surfaceGray, borderRadius: BorderRadius.circular(6)),
                          child: const Text("LTE", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        ),
                      ],
                    ),
                    const Divider(color: AppColors.borderLight, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _smallSpecCol("REGION", _selectedRegion),
                        _smallSpecCol("ROUTE / AREA", _routeText.isNotEmpty ? _routeText : "N/A"),
                        _smallSpecCol("TARGET SITES", _sitesText.isNotEmpty ? _sitesText : "All Nearby"),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 6. Start / Stop Test CTA Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (_isRunning) {
                      _stopTest();
                    } else {
                      // For manual start, prompt for operator/region setup
                      _showConfigureManualDialog();
                    }
                  },
                  icon: Icon(_isRunning ? Icons.stop_rounded : Icons.play_arrow_rounded, color: Colors.white, size: 20),
                  label: Text(_isRunning ? "Stop Test" : "Start Drive Test", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isRunning ? AppColors.errorRed : AppColors.successGreen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    final tabs = ["Overview", "Signal", "Assigned Tasks"];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: tabs.map((tab) {
        final active = tab == _activeTab;
        return GestureDetector(
          onTap: () => setState(() => _activeTab = tab),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: active ? AppColors.lightBlue : Colors.transparent,
                  width: 2.0,
                ),
              ),
            ),
            child: Text(
              tab,
              style: TextStyle(
                color: active ? AppColors.lightBlue : AppColors.textMuted,
                fontWeight: active ? FontWeight.bold : FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAssignedTasksTab(List<CampaignItem> campaigns) {
    if (campaigns.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        alignment: Alignment.center,
        child: const Text(
          "No drive test tasks assigned to you.",
          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
        ),
      );
    }

    return Column(
      children: campaigns.map((campaign) {
        final Color statusColor;
        final String statusLabel;
        switch (campaign.status) {
          case 'IN_PROGRESS':
            statusColor = AppColors.warningAmber;
            statusLabel = "In Progress";
            break;
          case 'COMPLETED':
            statusColor = AppColors.successGreen;
            statusLabel = "Completed";
            break;
          default:
            statusColor = AppColors.accentBlue;
            statusLabel = "Planning";
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.cardWhite,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: IntrinsicHeight(
            child: Row(
              children: [
                // Status Left Accent Line
                Container(
                  width: 5,
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      bottomLeft: Radius.circular(12),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                campaign.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                statusLabel,
                                style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          campaign.description,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 12,
                          runSpacing: 6,
                          children: [
                            _miniInfoTag(Icons.business_rounded, campaign.operatorName),
                            _miniInfoTag(Icons.map_rounded, campaign.targetArea),
                            _miniInfoTag(Icons.signal_cellular_alt_rounded, campaign.technology),
                          ],
                        ),
                        if (campaign.status != 'COMPLETED') ...[
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: 38,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                _launchCampaignDriveTest(campaign);
                              },
                              icon: const Icon(Icons.play_arrow_rounded, size: 16, color: Colors.white),
                              label: Text(
                                campaign.status == 'IN_PROGRESS' ? "RESUME TASK" : "LAUNCH TASK DRIVE TEST",
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryBlue,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  void _launchCampaignDriveTest(CampaignItem campaign) {
    setState(() {
      _activeCampaign = campaign;
      _selectedOperator = campaign.operatorName;
      _selectedRegion = campaign.targetArea;
      _routeText = campaign.name;
      _sitesText = "Assigned Coverage Area Sites";
      _activeTab = "Overview"; // Swap back to overview console
    });
    
    // Launch the logger timer
    _startTest();

    // Sync status change (In Progress) to backend API
    ref.read(campaignsProvider.notifier).updateStatus(campaign.id, 'IN_PROGRESS');
  }

  Widget _miniInfoTag(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.textMuted),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _smallSpecCol(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        const SizedBox(height: 3),
        Text(
          value.length > 20 ? "${value.substring(0, 17)}..." : value, 
          style: const TextStyle(fontSize: 11, color: AppColors.textPrimary, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  void _showConfigureManualDialog() {
    String operator = "Sierra Tel";
    String region = "Western Area Urban";
    final routeController = TextEditingController(text: "Freetown Central Route");
    final sitesController = TextEditingController(text: "SL0012, SL0015");

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: AppColors.cardWhite,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          padding: EdgeInsets.only(
            top: 20,
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: AppColors.borderLight, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  "Configure Drive Test Session",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 16),
                
                // 1. Operator Selection
                const Text("Target Operator", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: operator,
                  dropdownColor: AppColors.cardWhite,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: ["Sierra Tel", "Orange", "Africell", "Qcell"].map((op) => DropdownMenuItem(
                    value: op,
                    child: Text(op, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                  )).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setModalState(() => operator = val);
                    }
                  },
                ),
                const SizedBox(height: 16),

                // 2. Region Selection
                const Text("Region / Target Province", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: region,
                  dropdownColor: AppColors.cardWhite,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: ["Western Area Urban", "Western Area Rural", "Northern Province", "Southern Province", "Eastern Province"].map((r) => DropdownMenuItem(
                    value: r,
                    child: Text(r, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                  )).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setModalState(() => region = val);
                    }
                  },
                ),
                const SizedBox(height: 16),

                // 3. Area or Route name
                const Text("Area or Route Name", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                TextField(
                  controller: routeController,
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: "e.g. Makeni Highway Route",
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 16),

                // 4. Sites covered
                const Text("Target Cell Sites Covered", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                TextField(
                  controller: sitesController,
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: "e.g. SL0023, SL0024",
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 24),

                // Action CTA
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      setState(() {
                        _activeCampaign = null;
                        _selectedOperator = operator;
                        _selectedRegion = region;
                        _routeText = routeController.text.trim();
                        _sitesText = sitesController.text.trim();
                      });
                      _startTest();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.successGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text("Launch Drive Test Session", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _metricBox(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.cardWhite,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.borderLight),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ],
        ),
      ),
    );
  }

  void _showStopConfirmDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.cardWhite,
        title: const Text("Stop Logging Test", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        content: const Text(
          "Are you sure you want to stop this live drive test logging session? All recorded coordinates and KPI benchmarks will be saved to your logs database and synced to the TNIP-R backend.", 
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context), 
            child: const Text("CANCEL", style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              
              // 1. Create Route points
              final now = DateTime.now();
              final Random rand = Random();
              final List<RoutePoint> routePoints = [];
              for (int i = 0; i < 6; i++) {
                routePoints.add(RoutePoint(
                  lat: 8.4845 - (i * 0.0008),
                  lng: -13.2341 + (i * 0.0006),
                  rsrp: -80 - rand.nextInt(35),
                  sinr: 10 + rand.nextInt(12),
                  ping: 15 + rand.nextInt(20),
                  speed: 30.0 + rand.nextDouble() * 20.0,
                  quality: "Good",
                  timestamp: "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}",
                  handover: false,
                ));
              }

              // 2. Build SessionItem
              final dateStr = "Today, ${now.day} Jul ${now.year}";
              final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
              final durationStr = _formatDuration(_seconds);

              final newSession = SessionItem(
                id: "session-${DateTime.now().millisecondsSinceEpoch}",
                testName: _routeText.isNotEmpty ? _routeText : "Manual Drive Test",
                operatorName: _selectedOperator,
                technology: "LTE",
                date: dateStr,
                time: timeStr,
                distance: 1.2 + rand.nextDouble() * 3.0,
                duration: durationStr,
                quality: "Good",
                points: routePoints,
              );

              // 3. Save locally and auto-sync
              ref.read(historyProvider.notifier).saveAndSyncSession(
                newSession,
                operatorId: _getOperatorId(_selectedOperator),
              );

              // 4. If assigned task is active, update status to COMPLETED
              if (_activeCampaign != null) {
                ref.read(campaignsProvider.notifier).updateStatus(_activeCampaign!.id, 'COMPLETED');
                setState(() {
                  _activeCampaign = null;
                });
              }

              // 5. Navigate to history logs screen
              context.go('/drive-test-history');
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
            child: const Text("STOP AND SAVE"),
          ),
        ],
      ),
    );
  }
}

class _SignalGaugePainter extends CustomPainter {
  final double value; // e.g. -85 dBm

  _SignalGaugePainter({required this.value});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.95);
    final radius = size.height * 0.85;

    // 1. Draw gauge background arc
    final bgPaint = Paint()
      ..color = AppColors.borderLight
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14.0
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi,
      pi,
      false,
      bgPaint,
    );

    // 2. Draw gauge color fills (Red -> Orange -> Green)
    final fillPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14.0;

    double pct = ((value + 120) / 80).clamp(0.0, 1.0);

    // Red sweep
    fillPaint.color = AppColors.errorRed;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), pi, pi * 0.3, false, fillPaint);

    // Amber sweep
    fillPaint.color = AppColors.warningAmber;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), pi + pi * 0.3, pi * 0.4, false, fillPaint);

    // Green sweep
    fillPaint.color = AppColors.successGreen;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), pi + pi * 0.7, pi * 0.3, false, fillPaint);

    // 3. Draw needle indicator
    final needlePaint = Paint()
      ..color = AppColors.textPrimary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5;

    double angle = pi + (pct * pi);
    double needleLength = radius - 12;
    double needleX = center.dx + needleLength * cos(angle);
    double needleY = center.dy + needleLength * sin(angle);

    canvas.drawLine(center, Offset(needleX, needleY), needlePaint);
    canvas.drawCircle(center, 7, Paint()..color = AppColors.textPrimary);

    // 4. Value text
    final valPainter = TextPainter(
      text: TextSpan(
        text: "${value.toInt()}",
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 34, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    valPainter.paint(canvas, Offset(center.dx - valPainter.width / 2, center.dy - 55));

    final unitPainter = TextPainter(
      text: const TextSpan(
        text: "dBm",
        style: TextStyle(color: AppColors.textMuted, fontSize: 13, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    unitPainter.paint(canvas, Offset(center.dx - unitPainter.width / 2, center.dy - 20));

    final labelPainter = TextPainter(
      text: const TextSpan(
        text: "RSRP",
        style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    labelPainter.paint(canvas, Offset(center.dx - labelPainter.width / 2, center.dy - 8));
  }

  @override
  bool shouldRepaint(covariant _SignalGaugePainter oldDelegate) => oldDelegate.value != value;
}
