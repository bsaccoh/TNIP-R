import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';

class BillingDetailsScreen extends ConsumerStatefulWidget {
  const BillingDetailsScreen({super.key});

  @override
  ConsumerState<BillingDetailsScreen> createState() => _BillingDetailsScreenState();
}

class _BillingDetailsScreenState extends ConsumerState<BillingDetailsScreen> {
  final TextEditingController _transRefController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  DateTime? _selectedDate;

  // Sub-categories depend on the parent issue type
  List<String> get _subCategories {
    final draft = ref.read(draftReportProvider);
    if (draft.issueType == 'Mobile Money') {
      return ['Failed Transfer', 'Delayed Credit', 'Wrong Amount', 'Unauthorized Transaction', 'Agent Issue'];
    }
    return ['Overcharge', 'Wrong Tariff', 'Unauthorized Deduction', 'Bundle Not Applied', 'Roaming Charges'];
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final draft = ref.read(draftReportProvider);
      _transRefController.text = draft.transactionRef ?? '';
      if (draft.disputedAmount != null) {
        _amountController.text = draft.disputedAmount!.toStringAsFixed(0);
      }
      if (draft.transactionDate != null) {
        _selectedDate = DateTime.tryParse(draft.transactionDate!);
      }
    });
  }

  @override
  void dispose() {
    _transRefController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primaryBlue,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
      ref.read(draftReportProvider.notifier).updateTransactionDate(
          "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}");
    }
  }

  void _proceed() {
    // Save any typed values to state
    final ref0 = _transRefController.text.trim();
    if (ref0.isNotEmpty) {
      ref.read(draftReportProvider.notifier).updateTransactionRef(ref0);
    }
    final amtText = _amountController.text.trim();
    if (amtText.isNotEmpty) {
      final amt = double.tryParse(amtText);
      if (amt != null) {
        ref.read(draftReportProvider.notifier).updateDisputedAmount(amt);
      }
    }
    context.push('/report/location');
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(draftReportProvider);
    final isMobileMoney = draft.issueType == 'Mobile Money';

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          isMobileMoney ? "Mobile Money Details" : "Billing Details",
          style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Progress dots: step 1.5 of 3
          const SizedBox(height: 10),
          _buildProgressIndicator(),
          const SizedBox(height: 16),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header icon card ──
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isMobileMoney
                            ? [const Color(0xFF1A3C8F).withOpacity(0.08), const Color(0xFF1A3C8F).withOpacity(0.02)]
                            : [AppColors.warningOrange.withOpacity(0.08), AppColors.warningOrange.withOpacity(0.02)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isMobileMoney ? Icons.account_balance_wallet_rounded : Icons.receipt_long_rounded,
                          color: isMobileMoney ? AppColors.primaryBlue : AppColors.warningOrange,
                          size: 28,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isMobileMoney ? "Mobile Money Complaint" : "Billing Dispute",
                                style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "Provide transaction details for faster resolution",
                                style: AppTextStyles.micro.copyWith(color: AppColors.textLight),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── 1. Sub-category chips ──
                  Text("What happened?", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _subCategories.map((cat) {
                      final isSelected = draft.billingSubCategory == cat;
                      return GestureDetector(
                        onTap: () => ref.read(draftReportProvider.notifier).updateBillingSubCategory(cat),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primaryBlue : AppColors.dynamicCard,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? AppColors.primaryBlue : AppColors.border,
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Text(
                            cat,
                            style: AppTextStyles.small.copyWith(
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              color: isSelected ? Colors.white : AppColors.textPrimary,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  // ── 2. Transaction Reference ──
                  Text("Transaction Reference (optional)", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _transRefController,
                    style: AppTextStyles.body,
                    decoration: InputDecoration(
                      hintText: "e.g. TXN-20260715-001",
                      hintStyle: AppTextStyles.small.copyWith(color: AppColors.textMuted),
                      prefixIcon: const Icon(Icons.tag_rounded, size: 18, color: AppColors.textLight),
                      filled: true,
                      fillColor: AppColors.dynamicCard,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.primaryBlue, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── 3. Amount Disputed ──
                  Text("Amount Disputed", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    style: AppTextStyles.body,
                    decoration: InputDecoration(
                      hintText: "0",
                      hintStyle: AppTextStyles.small.copyWith(color: AppColors.textMuted),
                      prefixIcon: Padding(
                        padding: const EdgeInsets.only(left: 14, right: 4),
                        child: Text("SLE", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryBlue)),
                      ),
                      prefixIconConstraints: const BoxConstraints(minWidth: 44),
                      filled: true,
                      fillColor: AppColors.dynamicCard,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.primaryBlue, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── 4. Date of Transaction ──
                  Text("Date of Transaction", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _pickDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.dynamicCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.textLight),
                          const SizedBox(width: 10),
                          Text(
                            _selectedDate != null
                                ? "${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}"
                                : "Select date",
                            style: AppTextStyles.body.copyWith(
                              color: _selectedDate != null ? AppColors.textPrimary : AppColors.textMuted,
                            ),
                          ),
                          const Spacer(),
                          const Icon(Icons.arrow_drop_down_rounded, color: AppColors.textLight),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),

          // ── Next Step CTA ──
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _proceed,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                    elevation: 2,
                  ),
                  child: const Text("Next: Confirm Location", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _progressDot(true),
        _progressConnector(true),
        _progressDot(true),
        _progressConnector(false),
        _progressDot(false),
        _progressConnector(false),
        _progressDot(false),
      ],
    );
  }

  Widget _progressDot(bool isActive) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive ? AppColors.primaryBlue : AppColors.border,
      ),
    );
  }

  Widget _progressConnector(bool isActive) {
    return Container(
      width: 30,
      height: 2,
      color: isActive ? AppColors.primaryBlue : AppColors.border,
    );
  }
}
