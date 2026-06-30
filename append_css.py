import os

css_to_append = """
/* Telegram-style Animated Gradient Background */
@keyframes telegramGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.chat-background-animated {
  background: linear-gradient(-45deg, #f0f4f8, #e0e7ff, #f3e8ff, #f0fdfa);
  background-size: 400% 400%;
  animation: telegramGradient 15s ease infinite;
}

[data-theme="dark"] .chat-background-animated {
  background: linear-gradient(-45deg, #1e293b, #0f172a, #312e81, #1e1b4b);
  background-size: 400% 400%;
  animation: telegramGradient 15s ease infinite;
}

@media (prefers-reduced-motion: reduce) {
  .chat-background-animated {
    animation: none;
    background-size: auto;
  }
}
"""

with open(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\styles\components\OperatorFeedback.scss', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

with open(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\styles\components\Feedback.scss', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

print("CSS appended.")
