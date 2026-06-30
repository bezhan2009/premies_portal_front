import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    checkbox_code = """
                   {isChatSelectionMode && (
                     <div className="chat-selection-checkbox" onClick={(e) => {
                       e.stopPropagation();
                       handleSelectChat(group.id);
                     }}>
                       {selectedChatIds.includes(group.id) ? (
                         <CheckSquare size={20} color="#3b82f6" fill="rgba(59, 130, 246, 0.1)" />
                       ) : (
                         <Square size={20} color="#cbd5e1" />
                       )}
                     </div>
                   )}
"""
    # Find the group avatar block and insert checkbox before it
    pattern = r'(\s*\{group\.avatar_url \? \()'
    content = re.sub(pattern, checkbox_code + r'\1', content, count=1)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched group checkbox")

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx')
