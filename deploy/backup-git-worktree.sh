#!/usr/bin/env bash

backup_tracked_worktree_changes() {
    local project_name="$1"

    if [ -z "$(git status --porcelain --untracked-files=no)" ]; then
        return 0
    fi

    echo "[BACKUP] Server tracked files in ${project_name} are modified; saving them before deployment."
    if ! git stash push -m "auto-deploy backup for ${project_name}"; then
        echo "[ERROR] Could not back up tracked server changes in ${project_name}; deployment stopped without overwriting them."
        return 22
    fi
    echo "[BACKUP] Saved tracked changes as stash $(git rev-parse --short refs/stash)."
}

target_path_conflicts_with_checkout() {
    local target_sha="$1"
    local path="$2"
    local ancestor
    local target_type

    # An exact match conflicts even when one side is a directory and the other
    # is a file. A tracked non-tree ancestor also replaces an untracked tree.
    if git cat-file -e "${target_sha}:${path}" 2>/dev/null; then
        return 0
    fi

    ancestor="$path"
    while [ "${ancestor#*/}" != "$ancestor" ]; do
        ancestor="${ancestor%/*}"
        target_type="$(git cat-file -t "${target_sha}:${ancestor}" 2>/dev/null || true)"
        if [ -n "$target_type" ] && [ "$target_type" != "tree" ]; then
            return 0
        fi
    done

    return 1
}

backup_untracked_checkout_conflicts() {
    local project_name="$1"
    local target_sha="$2"
    local collision_pathspec
    local path
    collision_pathspec="$(mktemp)"

    {
        git ls-files --others --exclude-standard -z
        git ls-files --others --ignored --exclude-standard -z
    } |
        while IFS= read -r -d '' path; do
            if target_path_conflicts_with_checkout "$target_sha" "$path"; then
                printf '%s\0' "$path"
            fi
        done >"$collision_pathspec"

    if [ ! -s "$collision_pathspec" ]; then
        rm -f "$collision_pathspec"
        return 0
    fi

    echo "[BACKUP] Untracked server files in ${project_name} conflict with the target commit; saving only those files."
    if ! git --literal-pathspecs stash push --all \
        -m "auto-deploy untracked backup for ${project_name}" \
        --pathspec-from-file="$collision_pathspec" \
        --pathspec-file-nul; then
        rm -f "$collision_pathspec"
        echo "[ERROR] Could not back up conflicting untracked files in ${project_name}; deployment stopped without overwriting them."
        return 22
    fi

    rm -f "$collision_pathspec"
    echo "[BACKUP] Saved conflicting untracked files as stash $(git rev-parse --short refs/stash)."
}
