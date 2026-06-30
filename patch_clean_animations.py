import re

# 1. OperatorFeedbackPage.jsx
operator_path = r"d:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx"
print(f"Patching {operator_path}...")
with open(operator_path, 'r', encoding='utf-8') as f:
    operator_content = f.read()

# Remove blur from message bubbles initial state
operator_content = operator_content.replace(
    'initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(2px)" }}',
    'initial={{ opacity: 0, y: 20, scale: 0.9 }}'
)

# Remove isSelfTyping JSX block
is_self_typing_operator_block = """                      {isSelfTyping && (
                        <div style={{ padding: "0 4px 6px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                            {[0, 0.18, 0.36].map((delay, i) => (
                              <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8", display: "inline-block", animation: "typingDot 1.2s ease-in-out infinite", animationDelay: `${delay}s` }} />
                            ))}
                          </div>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>печатаете...</span>
                        </div>
                      )}"""
operator_content = operator_content.replace(is_self_typing_operator_block, "")

# Remove states
operator_content = operator_content.replace(
    "  const [isSelfTyping, setIsSelfTyping] = useState(false);\n  const selfTypingTimerRef = useRef(null);",
    ""
)

# Simplify handleTypingChange
old_handle_typing_operator = """  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
    setIsSelfTyping(true);
    if (selfTypingTimerRef.current) clearTimeout(selfTypingTimerRef.current);
    selfTypingTimerRef.current = setTimeout(() => setIsSelfTyping(false), 2000);
  };"""

new_handle_typing_operator = """  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
  };"""

operator_content = operator_content.replace(old_handle_typing_operator, new_handle_typing_operator)

with open(operator_path, 'w', encoding='utf-8') as f:
    f.write(operator_content)
print("OperatorFeedbackPage patched.")


# 2. FeedbackPage.jsx
feedback_path = r"d:\Work\Activ bank\activ daily\premies_portal_front\src\pages\general\FeedbackPage.jsx"
print(f"Patching {feedback_path}...")
with open(feedback_path, 'r', encoding='utf-8') as f:
    feedback_content = f.read()

# Remove blur from message bubbles initial state
feedback_content = feedback_content.replace(
    'initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(2px)" }}',
    'initial={{ opacity: 0, y: 20, scale: 0.9 }}'
)

# Remove isSelfTyping JSX block
is_self_typing_feedback_block = """                {isSelfTyping && (
                  <div style={{ padding: "0 16px 6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8", display: "inline-block", animation: "typingDot 1.2s ease-in-out infinite", animationDelay: `${delay}s` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>печатаете...</span>
                  </div>
                )}"""
feedback_content = feedback_content.replace(is_self_typing_feedback_block, "")

# Remove states
feedback_content = feedback_content.replace(
    "  const [isSelfTyping, setIsSelfTyping] = useState(false);\n  const selfTypingTimerRef = useRef(null);",
    ""
)

# Simplify handleTypingChange
old_handle_typing_feedback = """  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
    setIsSelfTyping(true);
    if (selfTypingTimerRef.current) clearTimeout(selfTypingTimerRef.current);
    selfTypingTimerRef.current = setTimeout(() => setIsSelfTyping(false), 2000);
  };"""

new_handle_typing_feedback = """  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
  };"""

feedback_content = feedback_content.replace(old_handle_typing_feedback, new_handle_typing_feedback)

with open(feedback_path, 'w', encoding='utf-8') as f:
    f.write(feedback_content)
print("FeedbackPage patched.")
