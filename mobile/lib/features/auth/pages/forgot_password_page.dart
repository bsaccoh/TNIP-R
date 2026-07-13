import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _emailController = TextEditingController();
  bool _success = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _handleReset() {
    if (_emailController.text.isNotEmpty) {
      setState(() {
        _success = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primaryBlue, Color(0xFF1565C0)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Stack(
          children: [
            // Line art icon background
            Positioned(
              top: 80,
              left: 0,
              right: 0,
              child: Opacity(
                opacity: 0.1,
                child: const Icon(Icons.cell_tower_rounded, size: 200, color: Colors.white),
              ),
            ),

            SafeArea(
              child: Column(
                children: [
                  const Spacer(),
                  // Top Title
                  Column(
                    children: const [
                      Icon(Icons.cell_tower_outlined, color: Colors.white, size: 48),
                      SizedBox(height: 8),
                      Text("NatCA", style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: 2)),
                      SizedBox(height: 4),
                      Text("Reset Console Credentials", style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                  const Spacer(),

                  // Reset Card
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    child: AnimatedCrossFade(
                      duration: const Duration(milliseconds: 300),
                      crossFadeState: _success ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                      firstChild: _buildForm(),
                      secondChild: _buildSuccessState(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Reset Password", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 6),
        const Text("Enter your registered email address to receive a secure password reset link.", style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 24),

        // Email Field
        const Text("Email Address", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
        const SizedBox(height: 6),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            hintText: "analyst@natca.gov.sl",
            prefixIcon: Icon(Icons.email_outlined, size: 18),
          ),
        ),
        const SizedBox(height: 24),

        // Reset Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _handleReset,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text("Send Reset Link", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 20),

        // Back link
        Center(
          child: TextButton.icon(
            onPressed: () => context.go('/login'),
            icon: const Icon(Icons.arrow_back_rounded, size: 16),
            label: const Text("Back to Sign In", style: TextStyle(fontWeight: FontWeight.bold)),
            style: TextButton.styleFrom(foregroundColor: AppColors.accentBlue),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessState() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: const BoxDecoration(color: Color(0xFFE8F5E9), shape: BoxShape.circle),
          child: const Icon(Icons.check_circle_outline_rounded, color: AppColors.successGreen, size: 36),
        ),
        const SizedBox(height: 20),
        const Text("Email Sent!", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        Text("A secure password reset link has been dispatched to ${_emailController.text}.", textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 24),

        // Return Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: () => context.go('/login'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text("Return to Login", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}
