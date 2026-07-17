import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class SimRegistrationScreen extends StatefulWidget {
  const SimRegistrationScreen({super.key});

  @override
  State<SimRegistrationScreen> createState() => _SimRegistrationScreenState();
}

class _SimRegistrationScreenState extends State<SimRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _ninController = TextEditingController();
  
  bool _isLoading = false;
  bool _hasResult = false;
  bool _isVerified = false;

  void _verifySim() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
        _hasResult = false;
      });

      // Simulate a network request to NCRA / Operator database
      await Future.delayed(const Duration(seconds: 2));

      // Mock Logic: If NIN ends with '0', we say it's unverified. Otherwise verified.
      bool verified = !_ninController.text.trim().endsWith('0');

      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasResult = true;
          _isVerified = verified;
        });
      }
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _ninController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text("SIM Verification", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.primaryBlue),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "Verify if your mobile number is properly linked to your National Identification Number (NIN) as per NatCA regulations.",
                        style: TextStyle(color: AppColors.isDark ? Colors.white70 : AppColors.textSecondary, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: AppColors.dynamicTextPrimary),
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        hintText: 'e.g. 077123456',
                        prefixIcon: const Icon(Icons.phone_android_rounded),
                        filled: true,
                        fillColor: AppColors.dynamicCard,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Enter your phone number';
                        if (value.length < 8) return 'Enter a valid phone number';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _ninController,
                      keyboardType: TextInputType.text,
                      style: TextStyle(color: AppColors.dynamicTextPrimary),
                      decoration: InputDecoration(
                        labelText: 'National ID Number (NIN)',
                        hintText: 'e.g. SL-1234567-8',
                        prefixIcon: const Icon(Icons.badge_outlined),
                        filled: true,
                        fillColor: AppColors.dynamicCard,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Enter your NIN';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _verifySim,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryBlue,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _isLoading 
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text("VERIFY REGISTRATION", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),

              if (_hasResult) ...[
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.dynamicCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _isVerified ? AppColors.successGreen : AppColors.errorRed, width: 2),
                    boxShadow: [
                      BoxShadow(color: (_isVerified ? AppColors.successGreen : AppColors.errorRed).withOpacity(0.1), blurRadius: 10, spreadRadius: 2),
                    ],
                  ),
                  child: Column(
                    children: [
                      Icon(
                        _isVerified ? Icons.check_circle_rounded : Icons.cancel_rounded,
                        color: _isVerified ? AppColors.successGreen : AppColors.errorRed,
                        size: 64,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _isVerified ? "SIM is Verified" : "SIM Not Linked",
                        style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: _isVerified ? AppColors.successGreen : AppColors.errorRed),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _isVerified 
                            ? "Your phone number ${_phoneController.text} is successfully linked to NIN ${_ninController.text}."
                            : "Your phone number is not linked to this NIN. Please visit your operator's nearest office to update your records to avoid disconnection, or self-register now.",
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
                      ),
                      if (!_isVerified) ...[
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              context.push('/kyc-registration?phone=${Uri.encodeComponent(_phoneController.text)}&nin=${Uri.encodeComponent(_ninController.text)}');
                            },
                            icon: const Icon(Icons.person_add_alt_1),
                            label: const Text("SELF-REGISTER NOW"),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.errorRed,
                              side: const BorderSide(color: AppColors.errorRed),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
