import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:camera/camera.dart';
import '../../app/theme/app_theme.dart';

class KycRegistrationScreen extends StatefulWidget {
  final String phoneNumber;
  final String nin;

  const KycRegistrationScreen({
    super.key,
    required this.phoneNumber,
    required this.nin,
  });

  @override
  State<KycRegistrationScreen> createState() => _KycRegistrationScreenState();
}

class _KycRegistrationScreenState extends State<KycRegistrationScreen> with SingleTickerProviderStateMixin {
  int _currentStep = 0;
  
  // Step 1: Personal Details
  final _formKey = GlobalKey<FormState>();
  final _ninController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();

  // Step 2: ID Upload
  bool _idFrontUploaded = false;
  bool _idBackUploaded = false;

  // Step 3: Face Scan
  bool _faceScanComplete = false;
  bool _isScanning = false;
  CameraController? _cameraController;
  late AnimationController _scanAnimationController;
  bool _isCameraInitialized = false;
  String _cameraError = "";

  // Step 4: Submission
  bool _isSubmitting = false;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _ninController.text = widget.nin;
    _scanAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ninController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _scanAnimationController.dispose();
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    if (_isCameraInitialized) return;

    try {
      final cameras = await availableCameras();
      // Try to find the front camera
      final frontCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      if (mounted) {
        setState(() {
          _isCameraInitialized = true;
          _cameraError = "";
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _cameraError = "Could not initialize camera: ${e.toString()}";
        });
      }
    }
  }

  void _simulateIdUpload(bool isFront) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );
    Future.delayed(const Duration(seconds: 1), () {
      Navigator.pop(context);
      setState(() {
        if (isFront) _idFrontUploaded = true;
        else _idBackUploaded = true;
      });
    });
  }

  void _startFaceScan() async {
    if (!_isCameraInitialized || _cameraController == null) return;
    
    setState(() {
      _isScanning = true;
    });

    try {
      // Simulate taking a picture and comparing
      await _cameraController!.takePicture();
      
      // Simulate heavy ML comparison delay
      await Future.delayed(const Duration(seconds: 3));

      if (mounted) {
        setState(() {
          _isScanning = false;
          _faceScanComplete = true;
        });
        // Stop camera to save resources once verified
        _cameraController?.dispose();
        _cameraController = null;
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _cameraError = "Failed to capture image.";
        });
      }
    }
  }

  void _submitRegistration() async {
    setState(() {
      _isSubmitting = true;
    });
    // Simulate network delay for submission
    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _isSubmitting = false;
      _isSuccess = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isSuccess) {
      return _buildSuccessScreen();
    }

    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text("KYC Self-Registration", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: Stepper(
        type: StepperType.vertical,
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep == 0) {
            if (!_formKey.currentState!.validate()) return;
          } else if (_currentStep == 1) {
            if (!_idFrontUploaded || !_idBackUploaded) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please upload both sides of your ID')));
              return;
            }
          } else if (_currentStep == 2) {
            if (!_faceScanComplete) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please complete the face scan')));
              return;
            }
          } else if (_currentStep == 3) {
            _submitRegistration();
            return;
          }
          
          setState(() {
            if (_currentStep < 3) {
              _currentStep += 1;
              // Initialize camera only when entering step 2
              if (_currentStep == 2 && !_faceScanComplete) {
                _initializeCamera();
              }
            }
          });
        },
        onStepCancel: () {
          setState(() {
            if (_currentStep > 0) {
              _currentStep -= 1;
            }
          });
        },
        controlsBuilder: (context, details) {
          if (_currentStep == 3 && _isSubmitting) {
            return const Padding(
              padding: EdgeInsets.only(top: 16.0),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          return Padding(
            padding: const EdgeInsets.only(top: 16.0),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: details.onStepContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(_currentStep == 3 ? 'SUBMIT REGISTRATION' : 'CONTINUE', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
                if (_currentStep > 0) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      onPressed: details.onStepCancel,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.primaryBlue),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: const Text('BACK', style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
        steps: [
          Step(
            title: Text("Personal Details", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 0,
            state: _currentStep > 0 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _formKey,
              child: Column(
                children: [
                  _buildTextField("National ID Number (NIN)", _ninController),
                  const SizedBox(height: 12),
                  _buildTextField("First Name", _firstNameController),
                  const SizedBox(height: 12),
                  _buildTextField("Last Name", _lastNameController),
                  const SizedBox(height: 12),
                  _buildTextField("Date of Birth (YYYY-MM-DD)", _dobController),
                  const SizedBox(height: 12),
                  _buildTextField("Residential Address", _addressController),
                ],
              ),
            ),
          ),
          Step(
            title: Text("ID Verification", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 1,
            state: _currentStep > 1 ? StepState.complete : StepState.indexed,
            content: Column(
              children: [
                const Text("Please upload clear photos of your National ID Card.", style: TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                _buildIdUploadCard("Front of ID", _idFrontUploaded, () => _simulateIdUpload(true)),
                const SizedBox(height: 12),
                _buildIdUploadCard("Back of ID", _idBackUploaded, () => _simulateIdUpload(false)),
              ],
            ),
          ),
          Step(
            title: Text("Face Scan", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 2,
            state: _currentStep > 2 ? StepState.complete : StepState.indexed,
            content: _buildFaceScanUI(),
          ),
          Step(
            title: Text("Review & Submit", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 3,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildReviewItem("Phone Number", widget.phoneNumber),
                _buildReviewItem("NIN", _ninController.text),
                _buildReviewItem("Name", "${_firstNameController.text} ${_lastNameController.text}"),
                _buildReviewItem("Date of Birth", _dobController.text),
                _buildReviewItem("Address", _addressController.text),
                _buildReviewItem("ID Documents", "Front & Back Uploaded"),
                _buildReviewItem("Liveness Check", "Verified"),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller) {
    return TextFormField(
      controller: controller,
      style: TextStyle(color: AppColors.dynamicTextPrimary),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: AppColors.dynamicCard,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: (val) => (val == null || val.isEmpty) ? 'Required' : null,
    );
  }

  Widget _buildIdUploadCard(String title, bool isUploaded, VoidCallback onTap) {
    return GestureDetector(
      onTap: isUploaded ? null : onTap,
      child: Container(
        height: 100,
        width: double.infinity,
        decoration: BoxDecoration(
          color: isUploaded ? AppColors.successGreen.withOpacity(0.1) : AppColors.dynamicCard,
          border: Border.all(color: isUploaded ? AppColors.successGreen : AppColors.dynamicBorder, style: isUploaded ? BorderStyle.solid : BorderStyle.none),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isUploaded ? Icons.check_circle : Icons.upload_file, color: isUploaded ? AppColors.successGreen : AppColors.primaryBlue, size: 32),
            const SizedBox(height: 8),
            Text(isUploaded ? "$title Uploaded" : "Tap to upload $title", style: TextStyle(color: isUploaded ? AppColors.successGreen : AppColors.textPrimary, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildFaceScanUI() {
    if (_faceScanComplete) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.successGreen.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.successGreen),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.face_retouching_natural, color: AppColors.successGreen, size: 32),
            SizedBox(width: 12),
            Text("Face Scan Verified!", style: TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
      );
    }

    if (_cameraError.isNotEmpty) {
      return Center(child: Text(_cameraError, style: const TextStyle(color: AppColors.errorRed)));
    }

    return Column(
      children: [
        const Text("Position your face within the frame. We will capture your face and compare it securely with your uploaded ID.", textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
        const SizedBox(height: 24),
        Container(
          width: 220,
          height: 220,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.dynamicCard,
            border: Border.all(color: _isScanning ? AppColors.primaryBlue : AppColors.dynamicBorder, width: 4),
          ),
          clipBehavior: Clip.antiAlias, // Ensures the camera preview is clipped to a circle
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (!_isCameraInitialized)
                const CircularProgressIndicator()
              else if (_cameraController != null)
                SizedBox(
                  width: double.infinity,
                  height: double.infinity,
                  // Use AspectRatio and fit to fill the circle
                  child: FittedBox(
                    fit: BoxFit.cover,
                    child: SizedBox(
                      width: _cameraController!.value.previewSize?.height ?? 1,
                      height: _cameraController!.value.previewSize?.width ?? 1,
                      child: CameraPreview(_cameraController!),
                    ),
                  ),
                ),
              if (_isScanning)
                AnimatedBuilder(
                  animation: _scanAnimationController,
                  builder: (context, child) {
                    return Positioned(
                      top: _scanAnimationController.value * 200,
                      child: Container(
                        width: 200,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen,
                          boxShadow: [BoxShadow(color: AppColors.accentGreen.withOpacity(0.5), blurRadius: 8, spreadRadius: 2)],
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        if (!_isScanning)
          ElevatedButton.icon(
            onPressed: _isCameraInitialized ? _startFaceScan : null,
            icon: const Icon(Icons.face_retouching_natural),
            label: const Text("CAPTURE & COMPARE"),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
          ),
        if (_isScanning)
          const Text("Comparing with ID... please wait.", style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildReviewItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
          Expanded(child: Text(value, style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  Widget _buildSuccessScreen() {
    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified, color: AppColors.successGreen, size: 100),
              const SizedBox(height: 24),
              Text("Registration Submitted!", style: AppTextStyles.h1.copyWith(color: AppColors.successGreen), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const Text(
                "Your KYC details have been successfully submitted for verification. Your SIM will be linked shortly.",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => context.go('/dashboard'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text("RETURN TO DASHBOARD", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
