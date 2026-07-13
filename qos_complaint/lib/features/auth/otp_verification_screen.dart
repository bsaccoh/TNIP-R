import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class OTPVerificationScreen extends StatefulWidget {
  final String phoneNumber;

  const OTPVerificationScreen({super.key, required this.phoneNumber});

  @override
  State<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends State<OTPVerificationScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  
  int _timerSeconds = 60;
  Timer? _timer;
  bool _canResend = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _startTimer() {
    setState(() {
      _timerSeconds = 60;
      _canResend = false;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_timerSeconds == 0) {
        setState(() {
          _canResend = true;
        });
        timer.cancel();
      } else {
        setState(() {
          _timerSeconds--;
        });
      }
    });
  }

  void _resendOTP() {
    _startTimer();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("OTP Code resent successfully")),
    );
  }

  Future<void> _handleVerify() async {
    final code = _controllers.map((c) => c.text).join();
    if (code.length < 6) return;

    setState(() {
      _loading = true;
    });

    // Simulate OTP verify call
    await Future.delayed(const Duration(milliseconds: 1000));

    setState(() {
      _loading = false;
    });

    if (mounted) {
      context.go('/biometric-setup');
    }
  }

  @override
  Widget build(BuildContext context) {
    final code = _controllers.map((c) => c.text).join();

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.go('/register'),
        ),
        title: Text("Verify Phone", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 20),
            Text(
              "Verify Phone Number",
              style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryBlue),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              "Enter the 6-digit code sent to ${widget.phoneNumber}",
              style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),

            // 6-digit OTP Inputs Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(6, (index) {
                return SizedBox(
                  width: 44,
                  height: 54,
                  child: TextFormField(
                    controller: _controllers[index],
                    focusNode: _focusNodes[index],
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold),
                    maxLength: 1,
                    decoration: InputDecoration(
                      counterText: "",
                      fillColor: AppColors.blueLightBG,
                      filled: true,
                      contentPadding: EdgeInsets.zero,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
                      ),
                    ),
                    onChanged: (val) {
                      if (val.isNotEmpty) {
                        // Advance focus
                        if (index < 5) {
                          _focusNodes[index + 1].requestFocus();
                        } else {
                          // Keyboard dismiss
                          _focusNodes[index].unfocus();
                          _handleVerify();
                        }
                      } else {
                        // Go back focus
                        if (index > 0) {
                          _focusNodes[index - 1].requestFocus();
                        }
                      }
                      setState(() {});
                    },
                  ),
                );
              }),
            ),

            const SizedBox(height: 32),

            // Countdown timer resend block
            Center(
              child: _canResend
                  ? TextButton(
                      onPressed: _resendOTP,
                      child: Text(
                        "Resend OTP Code",
                        style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold),
                      ),
                    )
                  : Text(
                      "Resend code in 0:${_timerSeconds.toString().padLeft(2, '0')}",
                      style: AppTextStyles.small.copyWith(color: AppColors.textLight),
                    ),
            ),

            const SizedBox(height: 32),

            // Verify Button
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: (code.length < 6 || _loading) ? null : _handleVerify,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                ),
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text("Verify", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
