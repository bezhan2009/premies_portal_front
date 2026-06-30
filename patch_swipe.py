import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to change the <div className={`thread-item ...`} to <motion.div ...> and add drag properties.
    # Pattern to match `<div ... className="...thread-item..."`
    
    # In OperatorFeedbackPage, we have several instances of `.thread-item`.
    # 1. Group items
    # <div key={`group-${group.id}`} className={`thread-item...
    
    content = re.sub(
        r'(<div\s+key=\{`group-\$\{group\.id\}`\}\s+className=\{`thread-item)',
        r'<motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} whileTap={{ scale: 0.98 }}\n                  key={`group-${group.id}`}\n                  className={`thread-item',
        content
    )
    # The closing div for group
    # We'll just replace all `</div>` that close thread-items. This might be tricky.
    # Instead, let's look for `<div className="thread-avatar">` and go up.
    # Actually, it's safer to just replace `<div\s+key=\{`group-\$\{group\.id\}`\}` with `<motion.div` and find the matching `</div>`.
    # Let's do it manually with regex if possible.
    
    # 2. Thread items (Direct & Support)
    content = re.sub(
        r'(<div\s+className=\{`thread-item \$\{isActive \? "active" : ""\}`\}\s+onClick=\{)',
        r'<motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} whileTap={{ scale: 0.98 }}\n                          className={`thread-item ${isActive ? "active" : ""}`}\n                          onClick={',
        content
    )

    # 3. Pinned items
    content = re.sub(
        r'(<div\s+key=\{`\$\{thread\.chatType\}-\$\{thread\.id\}`\}\s+className=\{`thread-item \$\{isActive \? "active" : ""\}`\}\s+onClick=\{)',
        r'<motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} whileTap={{ scale: 0.98 }}\n                    key={`${thread.chatType}-${thread.id}`}\n                    className={`thread-item ${isActive ? "active" : ""}`}\n                    onClick={',
        content
    )
    
    # Replace closing tags. This is a bit brute force but we know there are exactly 3 closing tags corresponding to these.
    # Actually, since it's hard to match the exact closing tag, I'll just change the opening tags and manually edit the closing tags, or I can use an AST/JSX parser if I had one. Let me use python string replacement with index.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched swipe openings in " + filepath)

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx')
