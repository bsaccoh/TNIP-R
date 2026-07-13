import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  String _selectedDistrict = "Western Area Urban";
  String _selectedOperator = "Sierra Tel";
  bool _showPassword = false;
  bool _termsAccepted = false;
  bool _loading = false;

  final List<String> _districts = const [
    'Western Area Urban', 'Western Area Rural',
    'Bo', 'Bombali', 'Bonthe', 'Falaba',
    'Kailahun', 'Kambia', 'Karene', 'Kenema',
    'Koinadugu', 'Kono', 'Moyamba', 'Port Loko',
    'Pujehun', 'Tonkolili'
  ];

  final List<String> _operators = const ['Orange', 'Africell', 'Qcell', 'Sierra Tel'];

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  double _calculatePasswordStrength(String password) {
    if (password.isEmpty) return 0.0;
    double strength = 0.0;
    if (password.length >= 8) strength += 0.25;
    if (password.contains(RegExp(r'[A-Z]'))) strength += 0.25;
    if (password.contains(RegExp(r'[0-9]'))) strength += 0.25;
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) strength += 0.25;
    return strength;
  }

  Color _getStrengthColor(double strength) {
    if (strength <= 0.25) return AppColors.errorRed;
    if (strength <= 0.5) return AppColors.warningOrange;
    if (strength <= 0.75) return AppColors.progressYellow;
    return AppColors.successGreen;
  }

  String _getStrengthText(double strength) {
    if (strength <= 0.25) return "Weak";
    if (strength <= 0.5) return "Fair";
    if (strength <= 0.75) return "Strong";
    return "Very Strong";
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("You must accept the Terms and Conditions")),
      );
      return;
    }

    setState(() {
      _loading = true;
    });

    // Simulate API registration call
    await Future.delayed(const Duration(milliseconds: 1000));

    setState(() {
      _loading = false;
    });

    if (mounted) {
      final phone = "+232${_phoneController.text}";
      context.go('/otp-verification?phone=$phone');
    }
  }

  @override
  Widget build(BuildContext context) {
    final strength = _calculatePasswordStrength(_passwordController.text);
    final strengthColor = _getStrengthColor(strength);
    final strengthText = _getStrengthText(strength);

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.go('/'),
        ),
        title: Text("Create Account", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Full Name
              Text("Full Name", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _fullNameController,
                style: AppTextStyles.body,
                decoration: InputDecoration(
                  hintText: "Enter your full name",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (val) => (val == null || val.length < 2) ? "Enter at least 2 characters" : null,
              ),
              const SizedBox(height: 16),

              // Phone Number
              Text("Phone Number", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: AppTextStyles.body,
                decoration: InputDecoration(
                  prefixText: "+232 ",
                  prefixStyle: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  hintText: "76 XXXXXX",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return "Phone number is required";
                  final slRegex = RegExp(r'^[0-9]{8}$');
                  if (!slRegex.hasMatch(val)) return "Enter a valid 8-digit mobile number (e.g. 76123456)";
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Email
              Text("Email Address (Optional)", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: AppTextStyles.body,
                decoration: InputDecoration(
                  hintText: "Enter your email address",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),

              // District selector
              Text("District", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedDistrict,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: _districts.map((d) {
                  return DropdownMenuItem(value: d, child: Text(d, style: AppTextStyles.body));
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedDistrict = val;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),

              // Operator selector
              Text("Primary Operator", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              SizedBox(
                height: 38,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _operators.length,
                  itemBuilder: (context, index) {
                    final op = _operators[index];
                    final isSelected = _selectedOperator == op;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOperator = op;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.blueLightBG : AppColors.dynamicCard,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? AppColors.primaryBlue : AppColors.border,
                            width: 1.5,
                          ),
                        ),
                        child: Text(
                          op,
                          style: AppTextStyles.small.copyWith(
                            color: isSelected ? AppColors.primaryBlue : AppColors.textSecondary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),

              // Password
              Text("Password", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _passwordController,
                obscureText: !_showPassword,
                style: AppTextStyles.body,
                decoration: InputDecoration(
                  hintText: "Enter password",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  suffixIcon: IconButton(
                    icon: Icon(_showPassword ? Icons.visibility : Icons.visibility_off, color: AppColors.textLight),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                ),
                onChanged: (_) => setState(() {}),
                validator: (val) {
                  if (val == null || val.length < 8) return "Password must be at least 8 characters";
                  if (!val.contains(RegExp(r'[A-Z]'))) return "Must contain at least 1 uppercase letter";
                  if (!val.contains(RegExp(r'[0-9]'))) return "Must contain at least 1 number";
                  return null;
                },
              ),
              if (_passwordController.text.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: LinearProgressIndicator(
                        value: strength,
                        backgroundColor: AppColors.border,
                        color: strengthColor,
                        minHeight: 4,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      strengthText,
                      style: TextStyle(color: strengthColor, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 16),

              // Confirm Password
              Text("Confirm Password", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _confirmPasswordController,
                obscureText: true,
                style: AppTextStyles.body,
                decoration: InputDecoration(
                  hintText: "Re-enter password",
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (val) => (val != _passwordController.text) ? "Passwords do not match" : null,
              ),
              const SizedBox(height: 16),

              // Terms & Conditions Checkbox
              Row(
                children: [
                  Checkbox(
                    value: _termsAccepted,
                    activeColor: AppColors.primaryBlue,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _termsAccepted = val;
                        });
                      }
                    },
                  ),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(text: "I agree to the ", style: AppTextStyles.small.copyWith(color: AppColors.textSecondary)),
                          TextSpan(
                            text: "Terms & Conditions",
                            style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 30),

              // Register CTA
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: (_loading || !_termsAccepted) ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text("Create Account", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
