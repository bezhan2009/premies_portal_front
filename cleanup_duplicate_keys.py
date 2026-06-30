files_to_cleanup = [
    r"d:\Work\Activ bank\activ daily\premies_portal_front\src\pages\dashboard\dashboard_operator\OperatorFeedbackPage.jsx",
    r"d:\Work\Activ bank\activ daily\premies_portal_front\src\pages\general\FeedbackPage.jsx"
]

target_str = 'position: "fixed", transformOrigin: "top left", backdropFilter: "blur(12px)", background: "rgba(255, 255, 255, 0.8)",'

for file_path in files_to_cleanup:
    print(f"Cleaning up {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Restore the target string everywhere first
    # (Since we already replaced it, let's restore the file first using git checkout)
    # Actually, we can just run `git checkout` on them via git restore, and then run a clean replace.

print("Done preparing.")
