import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController(text: "analyst@natca.gov.sl");
  final _passwordController = TextEditingController(text: "password123");
  
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;
  bool _emailHasError = false;
  bool _passwordHasError = false;

  void _handleLogin() {
    setState(() {
      _errorMessage = null;
      _emailHasError = false;
      _passwordHasError = false;
    });

    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty) {
      setState(() => _emailHasError = true);
    }
    if (password.isEmpty) {
      setState(() => _passwordHasError = true);
    }

    if (email.isEmpty || password.isEmpty) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    Timer(const Duration(milliseconds: 1000), () {
      if (!mounted) return;
      
      if (email == "analyst@natca.gov.sl" && password == "password123") {
        setState(() {
          _isLoading = false;
        });
        context.go('/dashboard');
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = "Invalid email or password. Please try again.";
        });
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Navy background gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF1A237E),
                    Color(0xFF0D47A1),
                  ],
                ),
              ),
            ),
          ),

          // 2. Wave decoration background
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: MediaQuery.of(context).size.height * 0.25,
            child: Opacity(
              opacity: 0.25,
              child: CustomPaint(
                painter: _LoginWavesPainter(),
              ),
            ),
          ),

          // 3. Central Login Form
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Top App Identity
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.cell_tower_rounded, color: Colors.white, size: 28),
                        SizedBox(width: 8),
                        Text(
                          "NatCA",
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // Card Form
                    Container(
                      padding: const EdgeInsets.all(28),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 16,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Sign In",
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            "Telecommunications Network\nIntelligence Platform",
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                          ),
                          const SizedBox(height: 24),

                          // Error banner if any
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEEBEE),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.errorRed.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded, color: AppColors.errorRed, size: 18),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: AppColors.errorRed, fontSize: 12, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Email Address field
                          const Text(
                            "Email Address",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 52,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F7FA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _emailHasError ? AppColors.errorRed : const Color(0xFFE8ECF0),
                              ),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Row(
                              children: [
                                Icon(Icons.email_outlined, size: 18, color: _emailHasError ? AppColors.errorRed : AppColors.textMuted),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: TextField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                                    decoration: const InputDecoration(
                                      hintText: "analyst@natca.gov.sl",
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_emailHasError) ...[
                            const SizedBox(height: 4),
                            const Text("This field is required", style: TextStyle(color: AppColors.errorRed, fontSize: 10)),
                          ],
                          const SizedBox(height: 16),

                          // Password field
                          const Text(
                            "Password",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 52,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F7FA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _passwordHasError ? AppColors.errorRed : const Color(0xFFE8ECF0),
                              ),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Row(
                              children: [
                                Icon(Icons.lock_outline_rounded, size: 18, color: _passwordHasError ? AppColors.errorRed : AppColors.textMuted),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: TextField(
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                                    decoration: const InputDecoration(
                                      hintText: "••••••••",
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => setState(() => _obscurePassword = !_obscurePassword),
                                  child: Icon(
                                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    size: 18,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_passwordHasError) ...[
                            const SizedBox(height: 4),
                            const Text("This field is required", style: TextStyle(color: AppColors.errorRed, fontSize: 10)),
                          ],
                          const SizedBox(height: 8),

                          // Forgot Password
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () => _showForgotPasswordDialog(context),
                              child: const Text(
                                "Forgot Password?",
                                style: TextStyle(color: AppColors.primaryBlue, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Sign In CTA
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryBlue,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 2,
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    )
                                  : const Text("Sign In", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // SSO Option
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: OutlinedButton.icon(
                              onPressed: () => _showSSODialog(context),
                              icon: const Icon(Icons.corporate_fare_rounded, size: 18, color: AppColors.textSecondary),
                              label: const Text("Sign in with Organization SSO", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFE8ECF0)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Version Footer info
                    const Text(
                      "NatCA Regulator Platform v2.1.0",
                      style: TextStyle(color: Colors.white60, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showForgotPasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        title: const Text("Reset Credentials", style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text("Please contact the NatCA System Administrator or Regulator IT helpdesk to request a password reset.", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("OK", style: TextStyle(color: AppColors.primaryBlue))),
        ],
      ),
    );
  }

  void _showSSODialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        title: const Text("ADFS SSO Portal", style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text("Redirecting to the NatCA Active Directory Single Sign-On gateway...", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("CANCEL", style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/dashboard');
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
            child: const Text("CONTINUE"),
          )
        ],
      ),
    );
  }
}

class _LoginWavesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final wave1 = Paint()..color = const Color(0xFF1565C0).withOpacity(0.4)..style = PaintingStyle.fill;
    final wave2 = Paint()..color = const Color(0xFF1E88E5).withOpacity(0.3)..style = PaintingStyle.fill;

    final path1 = Path();
    final path2 = Path();

    path1.moveTo(0, size.height);
    path2.moveTo(0, size.height);

    for (double x = 0; x <= size.width; x++) {
      double y1 = size.height * 0.5 + sin(x / size.width * 2 * pi) * 20;
      path1.lineTo(x, y1);

      double y2 = size.height * 0.6 + cos(x / size.width * 2 * pi) * 15;
      path2.lineTo(x, y2);
    }

    path1.lineTo(size.width, size.height);
    path2.lineTo(size.width, size.height);

    canvas.drawPath(path1, wave1);
    canvas.drawPath(path2, wave2);
  }

  @override
  bool shouldRepaint(covariant _LoginWavesPainter oldDelegate) => false;
}
