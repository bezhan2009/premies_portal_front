import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_bulk_delete = """
  const handleBulkDeleteChats = async () => {
    if (selectedChatIds.length === 0) return;
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedChatIds.length} выбранных чатов?`)) return;
    try {
      for (const threadId of selectedChatIds) {
        if (activeTab === "groups") {
          await axios.delete(`${API_URL}/api/groups/${threadId}`, axiosConfig);
        } else {
          let url = `${API_URL}/api/feedback/chat`;
          if (activeTab === "direct") {
            url += `?chatWith=${threadId}`;
          } else {
            url += `?userId=${threadId}`;
          }
          await axios.delete(url, axiosConfig);
        }
      }
      setSelectedChatIds([]);
      setIsChatSelectionMode(false);
      fetchSupportThreads();
      fetchDirectThreads();
      fetchGroups();
    } catch (err) {
      console.error("Error bulk deleting chats:", err);
    }
  };
"""
    # Replace handleBulkDeleteChats
    content = re.sub(
        r'(const handleBulkDeleteChats = async \(\) => \{.*?\n  \};\n)',
        new_bulk_delete.strip() + '\n',
        content,
        flags=re.DOTALL
    )

    new_bulk_mute = """
  const handleBulkMuteChats = () => {
    setMutedChats(prev => {
      const allSelectedMuted = selectedChatIds.every(id => prev.includes(id));
      let updated;
      if (allSelectedMuted) {
        updated = prev.filter(id => !selectedChatIds.includes(id));
      } else {
        const uniqueSelected = selectedChatIds.filter(id => !prev.includes(id));
        updated = [...prev, ...uniqueSelected];
      }
      localStorage.setItem("muted_chats", JSON.stringify(updated));
      return updated;
    });
    setSelectedChatIds([]);
    setIsChatSelectionMode(false);
  };
"""
    # Just to be safe, leave handleBulkMuteChats as is since it doesn't do network requests, only localStorage.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched bulk delete")

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx')
