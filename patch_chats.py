import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add handleDeleteGroup
    if "const handleDeleteGroup =" not in content:
        delete_group_fn = """
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("ВНИМАНИЕ: Вы уверены, что хотите удалить группу? Все сообщения будут стерты навсегда!")) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (activeThreadId === groupId || activeGroup?.id === groupId) {
        setActiveThreadId(null);
        if (typeof setActiveGroup === 'function') setActiveGroup(null);
        setActiveChatType(null);
        setMessages([]);
      }
      if (typeof fetchGroups === 'function') fetchGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
    }
  };
"""
        # Insert after handleDeleteChat
        content = re.sub(
            r'(const handleDeleteChat = async.*?};\n)',
            r'\1' + delete_group_fn,
            content,
            flags=re.DOTALL
        )

    # 2. Update contextMenu rendering for thread and group
    # Change {contextMenu.type === "thread" && ( to {['thread', 'group'].includes(contextMenu.type) && (
    content = content.replace('{contextMenu.type === "thread" && (', "{['thread', 'group'].includes(contextMenu.type) && (")

    # Replace handleDeleteChat(contextMenu.target.id); with conditional
    conditional_delete = """if (contextMenu.type === "group") {
                      handleDeleteGroup(contextMenu.target.id);
                    } else {
                      handleDeleteChat(contextMenu.target.id);
                    }"""
    content = content.replace('handleDeleteChat(contextMenu.target.id);', conditional_delete)

    # 3. Add onContextMenu to group item and update onClick
    # In OperatorFeedbackPage: setActiveThreadId(group.id); ...
    # Find the group render div
    group_div_pattern = r'(<div\s+key={`group-\${group\.id}`}\s+className={`thread-item \${isActive \? "active" : ""}`})'
    replacement = r'\1\n                  onContextMenu={(e) => triggerContextMenu(e, group, "group")}'
    content = re.sub(group_div_pattern, replacement, content)

    # We also need to fix onClick for group to support selection mode.
    # We will find the onClick block for group and prepend the check.
    # In OperatorFeedbackPage:
    operator_group_click_pattern = r'(onClick={\(\) => {\s+setActiveChatType\("group"\);\s+setActiveThreadId\((group\.id|group)\);)'
    
    def repl(m):
        return f"onClick={{() => {{\n                    if (isChatSelectionMode) {{\n                      handleSelectChat(group.id);\n                      return;\n                    }}\n                    setActiveChatType(\"group\");\n                    setActiveThreadId({m.group(2)});"

    content = re.sub(operator_group_click_pattern, repl, content)

    # In FeedbackPage:
    # setActiveChatType("group"); setActiveGroup(group);
    feedback_group_click_pattern = r'(onClick={\(\) => {\s+setActiveChatType\("group"\);\s+setActiveGroup\(group\);)'
    
    def repl2(m):
        return f"onClick={{() => {{\n                    if (isChatSelectionMode) {{\n                      handleSelectChat(group.id);\n                      return;\n                    }}\n                    setActiveChatType(\"group\");\n                    setActiveGroup(group);"

    content = re.sub(feedback_group_click_pattern, repl2, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx')
patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\general\FeedbackPage.jsx')
