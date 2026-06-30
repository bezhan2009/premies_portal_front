import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Search for className="chat-messages" and replace with className="chat-messages chat-background-animated"
    content = content.replace('className="chat-messages"', 'className="chat-messages chat-background-animated"')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Applied background to " + filepath)

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx')
patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\general\FeedbackPage.jsx')
