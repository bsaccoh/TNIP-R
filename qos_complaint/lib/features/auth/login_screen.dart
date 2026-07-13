import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:local_auth/local_auth.dart';
import '../../app/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _loading = false;
  final LocalAuthentication _auth = LocalAuthentication();

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _loading = true;
    });

    // Simulate Auth API Call
    await Future.delayed(const Duration(milliseconds: 1000));

    setState(() {
      _loading = false;
    });

    if (mounted) {
      // Check if biometric is supported, then route accordingly
      final isAvailable = await _auth.canCheckBiometrics;
      if (isAvailable) {
        context.go('/biometric-setup');
      } else {
        context.go('/dashboard');
      }
    }
  }

  Future<void> _triggerBiometric() async {
    try {
      final isAvailable = await _auth.canCheckBiometrics;
      if (!isAvailable) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Biometric verification not available on this device")),
        );
        return;
      }
      final authenticated = await _auth.authenticate(
        localizedReason: 'Scan fingerprint or face ID to authenticate',
        options: const AuthenticationOptions(biometricOnly: true),
      );
      if (authenticated && mounted) {
        context.go('/dashboard');
      }
    } catch (_) {
      // Fallback
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo & Header
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryBlue,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.security_rounded, color: Colors.white, size: 36),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    "NatCA QoS",
                    style: AppTextStyles.h1.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryBlue),
                  ),
                ),
                Center(
                  child: Text(
                    "Quality of Service Complaints Portal",
                    style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 40),

                // Identifier
                Text("Phone Number or Email", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _identifierController,
                  style: AppTextStyles.body,
                  decoration: InputDecoration(
                    hintText: "Enter phone or email",
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
                    ),
                  ),
                  validator: (value) => (value == null || value.isEmpty) ? "Field required" : null,
                ),
                const SizedBox(height: 16),

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
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(_showPassword ? Icons.visibility : Icons.visibility_off, color: AppColors.textLight),
                      onPressed: () => setState(() => _showPassword = !_showPassword),
                    ),
                  ),
                  validator: (value) => (value == null || value.isEmpty) ? "Field required" : null,
                ),
                const SizedBox(height: 8),

                // Forgot Password link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Password reset OTP reference triggered")),
                      );
                    },
                    child: Text(
                      "Forgot Password?",
                      style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Sign In Button
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                    ),
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text("Sign In", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 24),

                // Biometrics Button
                Center(
                  child: GestureDetector(
                    onTap: _triggerBiometric,
                    child: Column(
                      children: [
                        const Icon(Icons.fingerprint_rounded, size: 48, color: AppColors.primaryBlue),
                        const SizedBox(height: 6),
                        Text("Use Biometric Login", style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Divider OR
                Row(
                  children: const [
                    Expanded(child: Divider(color: AppColors.border)),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text("OR", style: TextStyle(color: AppColors.textLight, fontSize: 12)),
                    ),
                    Expanded(child: Divider(color: AppColors.border)),
                  ],
                ),
                const SizedBox(height: 16),

                // Guest Login
                SizedBox(
                  height: 50,
                  child: OutlinedButton(
                    onPressed: () => context.go('/dashboard'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primaryBlue,
                      side: const BorderSide(color: AppColors.primaryBlue),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                    ),
                    child: const Text("Continue as Guest", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
