import 'package:flutter/material.dart';
import '../../app/theme/app_theme.dart';

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  final List<Map<String, dynamic>> _messages = [
    {
      "isBot": true,
      "text": "Hello! I am the NatCA AI Assistant. I can help you understand your consumer rights, find USSD codes, or guide you on how to file a complaint. What do you need help with?",
    }
  ];

  bool _isTyping = false;

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({"isBot": false, "text": text});
      _isTyping = true;
    });
    _controller.clear();
    _scrollToBottom();

    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 1500));

    final botResponse = _getBotResponse(text.toLowerCase());

    if (mounted) {
      setState(() {
        _isTyping = false;
        _messages.add({"isBot": true, "text": botResponse});
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _getBotResponse(String query) {
    if (query.contains("slow") || query.contains("internet") || query.contains("data")) {
      return "If your internet is too slow or dropping, you have the right to complain! NatCA regulations state that operators must maintain a minimum speed. You can run a Speed Test from the home page and submit a complaint directly to us if it fails.";
    } else if (query.contains("tariff") || query.contains("cost") || query.contains("price") || query.contains("expensive")) {
      return "Tariffs are regulated by NatCA. The standard voice rate is 1.86 LE per minute across all networks. If you believe you are being overcharged, please check the 'Tariffs' page or submit a Billing Dispute complaint.";
    } else if (query.contains("sim") || query.contains("nin") || query.contains("register")) {
      return "All SIM cards must be linked to your National Identification Number (NIN). You can verify your status using the 'SIM Check' tool on the dashboard. If unlinked, visit your operator's office with your ID.";
    } else if (query.contains("ussd") || query.contains("code") || query.contains("balance")) {
      return "You can easily access USSD codes for all operators by tapping 'USSD Codes' on the dashboard. For example, Orange balance is *111# and Africell is *123#.";
    } else {
      return "I'm a demo assistant, so I only know about Data Issues, Tariffs, SIM Registration, and USSD codes right now. Try asking about one of those!";
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(color: AppColors.primaryBlue, shape: BoxShape.circle),
              child: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Text("NatCA Assistant", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
          ],
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildChatBubble(msg["text"], msg["isBot"]);
              },
            ),
          ),
          if (_isTyping)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryBlue),
                    ),
                    const SizedBox(width: 12),
                    const Text("Assistant is typing...", style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ],
                ),
              ),
            ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildChatBubble(String text, bool isBot) {
    return Align(
      alignment: isBot ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isBot ? AppColors.dynamicCard : AppColors.primaryBlue,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isBot ? const Radius.circular(4) : const Radius.circular(16),
            bottomRight: isBot ? const Radius.circular(16) : const Radius.circular(4),
          ),
          border: isBot ? Border.all(color: AppColors.dynamicBorder) : null,
          boxShadow: [
            if (!isBot) BoxShadow(color: AppColors.primaryBlue.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4)),
          ],
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isBot ? AppColors.dynamicTextPrimary : Colors.white,
            height: 1.4,
          ),
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -2))],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                style: TextStyle(color: AppColors.dynamicTextPrimary),
                decoration: InputDecoration(
                  hintText: "Ask about your consumer rights...",
                  hintStyle: const TextStyle(color: AppColors.textMuted),
                  filled: true,
                  fillColor: AppColors.isDark ? const Color(0xFF161B33) : AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                ),
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: _sendMessage,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: const BoxDecoration(color: AppColors.primaryBlue, shape: BoxShape.circle),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
