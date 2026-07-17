import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class TariffPlan {
  final String operatorName;
  final String planName;
  final double price;
  final String allowance;
  final String validity;
  final Color color;

  TariffPlan({
    required this.operatorName,
    required this.planName,
    required this.price,
    required this.allowance,
    required this.validity,
    required this.color,
  });
}

class TariffComparisonScreen extends StatefulWidget {
  const TariffComparisonScreen({super.key});

  @override
  State<TariffComparisonScreen> createState() => _TariffComparisonScreenState();
}

class _TariffComparisonScreenState extends State<TariffComparisonScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<TariffPlan> dataPlans = [
    TariffPlan(operatorName: 'Orange', planName: 'Daily 1GB', price: 15.0, allowance: '1 GB', validity: '24 Hours', color: AppColors.warningOrange),
    TariffPlan(operatorName: 'Africell', planName: 'Daily 1.2GB', price: 15.0, allowance: '1.2 GB', validity: '24 Hours', color: AppColors.errorRed),
    TariffPlan(operatorName: 'Qcell', planName: 'Daily 1.5GB', price: 12.0, allowance: '1.5 GB', validity: '24 Hours', color: AppColors.accentGreen),
    TariffPlan(operatorName: 'Orange', planName: 'Weekly 5GB', price: 60.0, allowance: '5 GB', validity: '7 Days', color: AppColors.warningOrange),
    TariffPlan(operatorName: 'Africell', planName: 'Weekly 6GB', price: 60.0, allowance: '6 GB', validity: '7 Days', color: AppColors.errorRed),
    TariffPlan(operatorName: 'Sierra Tel', planName: 'Weekly 10GB', price: 50.0, allowance: '10 GB', validity: '7 Days', color: AppColors.primaryBlue),
  ];

  final List<TariffPlan> voicePlans = [
    TariffPlan(operatorName: 'Orange', planName: 'Standard Voice', price: 1.86, allowance: '60 Seconds', validity: 'Pay as you go', color: AppColors.warningOrange),
    TariffPlan(operatorName: 'Africell', planName: 'Standard Voice', price: 1.86, allowance: '60 Seconds', validity: 'Pay as you go', color: AppColors.errorRed),
    TariffPlan(operatorName: 'Qcell', planName: 'Standard Voice', price: 1.86, allowance: '60 Seconds', validity: 'Pay as you go', color: AppColors.accentGreen),
    TariffPlan(operatorName: 'Sierra Tel', planName: 'Standard Voice', price: 1.86, allowance: '60 Seconds', validity: 'Pay as you go', color: AppColors.primaryBlue),
  ];

  final List<TariffPlan> smsPlans = [
    TariffPlan(operatorName: 'Orange', planName: 'On-Net SMS', price: 0.25, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.warningOrange),
    TariffPlan(operatorName: 'Orange', planName: 'Off-Net SMS', price: 0.90, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.warningOrange),
    TariffPlan(operatorName: 'Africell', planName: 'On-Net SMS', price: 0.25, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.errorRed),
    TariffPlan(operatorName: 'Africell', planName: 'Off-Net SMS', price: 0.90, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.errorRed),
    TariffPlan(operatorName: 'Qcell', planName: 'On-Net SMS', price: 0.25, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.accentGreen),
    TariffPlan(operatorName: 'Qcell', planName: 'Off-Net SMS', price: 0.90, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.accentGreen),
    TariffPlan(operatorName: 'Sierra Tel', planName: 'On-Net SMS', price: 0.25, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.primaryBlue),
    TariffPlan(operatorName: 'Sierra Tel', planName: 'Off-Net SMS', price: 0.90, allowance: '1 SMS', validity: 'Pay as you go', color: AppColors.primaryBlue),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text("Compare Tariffs", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primaryBlue,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primaryBlue,
          tabs: const [
            Tab(text: "Data"),
            Tab(text: "Voice"),
            Tab(text: "SMS"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPlanList(dataPlans),
          _buildPlanList(voicePlans),
          _buildPlanList(smsPlans),
        ],
      ),
    );
  }

  Widget _buildPlanList(List<TariffPlan> plans) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: plans.length,
      itemBuilder: (context, index) {
        final plan = plans[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.dynamicCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.dynamicBorder),
            boxShadow: const [
              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: plan.color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    plan.operatorName[0],
                    style: AppTextStyles.h2.copyWith(color: plan.color),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(plan.operatorName, style: AppTextStyles.small.copyWith(color: plan.color, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(plan.planName, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text("Validity: ${plan.validity}", style: AppTextStyles.micro),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text("SLE ${plan.price.toStringAsFixed(2)}", style: AppTextStyles.h3.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreen.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(plan.allowance, style: AppTextStyles.micro.copyWith(color: AppColors.accentGreen, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
