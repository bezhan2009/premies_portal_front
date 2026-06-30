import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update message bubble animations (look for initial={{ opacity: 0, y: 15, scale: 0.96 }})
    content = content.replace(
        'initial={{ opacity: 0, y: 15, scale: 0.96 }}',
        'initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(2px)" }}'
    )
    content = content.replace(
        'transition={{ duration: 0.22, ease: "easeOut" }}',
        'transition={{ type: "spring", stiffness: 400, damping: 28 }}'
    )

    # 2. Update Context Menu animations
    # initial={{ opacity: 0, scale: 0.95, y: -5 }}
    content = content.replace(
        'initial={{ opacity: 0, scale: 0.95, y: -5 }}',
        'initial={{ opacity: 0, scale: 0.7, y: -10, filter: "blur(5px)" }}'
    )
    # animate={{ opacity: 1, scale: 1, y: 0 }}
    content = content.replace(
        'animate={{ opacity: 1, scale: 1, y: 0 }}',
        'animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}'
    )
    # transition={{ duration: 0.12, ease: "easeOut" }} -> transition={{ type: "spring", stiffness: 350, damping: 25 }}
    content = content.replace(
        'transition={{ duration: 0.12, ease: "easeOut" }}',
        'transition={{ type: "spring", stiffness: 350, damping: 25 }}'
    )
    
    # 3. Add transformOrigin and backdropBlur to Context Menu
    # Context menu has style={{ position: "fixed", top: `${contextMenu.y}px`, left: ...
    # We will just replace `position: "fixed",` with `position: "fixed", transformOrigin: "top left", backdropFilter: "blur(12px)", background: "rgba(255, 255, 255, 0.8)",`
    content = content.replace(
        'position: "fixed",\n',
        'position: "fixed", transformOrigin: "top left", backdropFilter: "blur(12px)", background: "rgba(255, 255, 255, 0.8)",\n'
    )

    # 4. Hold to send - finding the send button
    # <motion.button type="submit" className="chat-send-btn" ...
    # Let's add onContextMenu to the send button, or onPointerDown
    # For now, let's just create the HoldToSend UI state if it doesn't exist.
    if "const [showHoldMenu, setShowHoldMenu] = useState(false);" not in content:
        # Insert state
        content = re.sub(
            r'(const \[showEmojiPicker, setShowEmojiPicker\] = useState\(false\);)',
            r'\1\n  const [showHoldMenu, setShowHoldMenu] = useState(false);\n  const holdTimerRef = useRef(null);',
            content
        )
        
        # Add hold logic to send button
        # The send button might be `<button type="submit"` or `<motion.button type="submit"`
        send_btn_pattern = r'(className="chat-send-btn"[^>]*>)'
        
        hold_handlers = """ onPointerDown={(e) => {
                                holdTimerRef.current = setTimeout(() => {
                                  setShowHoldMenu(true);
                                }, 500);
                              }}
                              onPointerUp={() => clearTimeout(holdTimerRef.current)}
                              onPointerLeave={() => clearTimeout(holdTimerRef.current)}
        """
        
        # We need to insert hold_handlers inside the button tag
        content = re.sub(
            r'(className="chat-send-btn"\s*disabled=\{sending\})',
            r'\1' + hold_handlers,
            content
        )

        # We also need to render the hold menu above the send button
        hold_menu_jsx = """
                            <AnimatePresence>
                              {showHoldMenu && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                  style={{
                                    position: "absolute",
                                    bottom: "100%",
                                    right: 0,
                                    marginBottom: "10px",
                                    background: "rgba(255, 255, 255, 0.9)",
                                    backdropFilter: "blur(10px)",
                                    borderRadius: "12px",
                                    padding: "8px",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                    zIndex: 50,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    minWidth: "180px"
                                  }}
                                >
                                  <button type="button" onClick={() => { setShowHoldMenu(false); handleSend(null, true); }} style={{ padding: "10px", border: "none", background: "transparent", textAlign: "left", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                                    Без звука
                                  </button>
                                  <button type="button" onClick={() => { setShowHoldMenu(false); alert("Schedule feature coming soon!"); }} style={{ padding: "10px", border: "none", background: "transparent", textAlign: "left", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                                    Отложенное
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
        """
        # Insert before the send button
        content = re.sub(
            r'(<button type="submit" className="chat-send-btn"|<motion\.button\s+type="submit"\s+className="chat-send-btn")',
            hold_menu_jsx + r'\n\1',
            content
        )
        
        # Modify handleSend to accept a silent flag if necessary, or just skip it for now.
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched animations in {filepath}")

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx')
patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\general\FeedbackPage.jsx')
