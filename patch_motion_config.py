import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if "from 'framer-motion'" not in content:
        content = re.sub(
            r"(import React.*?;\n)",
            r"\1import { MotionConfig } from 'framer-motion';\n",
            content
        )
    
    # Wrap in MotionConfig
    if "<MotionConfig" not in content:
        content = content.replace("<>", "<MotionConfig reducedMotion=\"user\">\n      <>")
        content = content.replace("</>", "</>\n    </MotionConfig>")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched App.jsx with MotionConfig")

patch_file(r'd:\Work\Activ bank\activ daily\premies_portal_front\src\App.jsx')
