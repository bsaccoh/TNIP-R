import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:local_auth/local_auth.dart';
import '../../app/theme/app_theme.dart';

class BiometricSetupScreen extends StatefulWidget {
  const BiometricSetupScreen({super.key});

  @override
  State<BiometricSetupScreen> createState() => _BiometricSetupScreenState();
}

class _BiometricSetupScreenState extends State<BiometricSetupScreen> {
  final LocalAuthentication _auth = LocalAuthentication();
  bool _checkingAvailability = false;

  Future<void> _enableBiometric() async {
    setState(() {
      _checkingAvailability = true;
    });

    try {
      final isAvailable = await _auth.canCheckBiometrics;
      final bool canAuthenticate = isAvailable || await _auth.isDeviceSupported();
      
      setState(() {
        _checkingAvailability = false;
      });

      if (!canAuthenticate) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Biometrics not supported on this device")),
          );
          context.go('/dashboard');
        }
        return;
      }

      final authenticated = await _auth.authenticate(
        localizedReason: 'Confirm identity to enable biometric login credentials',
        options: const AuthenticationOptions(stickyAuth: true),
      );

      if (authenticated && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Biometrics enabled successfully")),
        );
        context.go('/dashboard');
      }
    } catch (_) {
      setState(() {
        _checkingAvailability = false;
      });
      if (mounted) {
        context.go('/dashboard');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          TextButton(
            onPressed: () => context.go('/dashboard'),
            child: Text(
              "Skip",
              style: AppTextStyles.small.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Icon illustration
            Center(
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppColors.primaryBlue.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.fingerprint_rounded, size: 72, color: AppColors.primaryBlue),
              ),
            ),
            const SizedBox(height: 32),

            Text(
              "Enable Biometric Login",
              style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryBlue),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              "Use your fingerprint or Face ID for quick and secure access to your account details.",
              style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),

            // Features checklist
            _bulletItem("Faster login — no password needed"),
            const SizedBox(height: 12),
            _bulletItem("Secure — credentials are stored on your device only"),
            const SizedBox(height: 12),
            _bulletItem("Private — NatCA cannot access your biometric logs"),
            const SizedBox(height: 48),

            // CTAs
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _checkingAvailability ? null : _enableBiometric,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                ),
                child: _checkingAvailability
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text("Enable Biometric Login", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                onPressed: () => context.go('/dashboard'),
                child: Text(
                  "Skip for now",
                  style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bulletItem(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_outline_rounded, color: AppColors.accentGreen, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.small.copyWith(color: AppColors.dynamicTextPrimary),
          ),
        ),
      ],
    );
  }
}
