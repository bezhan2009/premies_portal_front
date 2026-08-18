#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repository_root/deploy/backup-git-worktree.sh"

fixture="$(mktemp -d)"
trap 'rm -rf "$fixture" "${ignored_fixture:-}" "${directory_fixture:-}" "${literal_fixture:-}"' EXIT

git -C "$fixture" init -q
git -C "$fixture" config user.name "Deploy Test"
git -C "$fixture" config user.email "deploy-test@example.com"

printf 'canonical tracked\n' >"$fixture/tracked.txt"
git -C "$fixture" add tracked.txt
git -C "$fixture" commit -q -m "base"
base_sha="$(git -C "$fixture" rev-parse HEAD)"

git -C "$fixture" switch -q -c deployment-target
printf 'canonical collision\n' >"$fixture/collision.txt"
git -C "$fixture" add collision.txt
git -C "$fixture" commit -q -m "add canonical collision path"
target_sha="$(git -C "$fixture" rev-parse HEAD)"

git -C "$fixture" checkout -q "$base_sha"
printf 'server tracked change\n' >"$fixture/tracked.txt"
printf 'server collision content\n' >"$fixture/collision.txt"
mkdir -p "$fixture/certs"
printf 'runtime certificate\n' >"$fixture/certs/runtime.crt"

cd "$fixture"
backup_tracked_worktree_changes "fixture"
backup_untracked_checkout_conflicts "fixture" "$target_sha"
git checkout -q -B main "$target_sha"

test "$(cat tracked.txt)" = "canonical tracked"
test "$(cat collision.txt)" = "canonical collision"
test "$(cat certs/runtime.crt)" = "runtime certificate"
test "$(git show 'stash@{0}^3:collision.txt')" = "server collision content"
test "$(git show 'stash@{1}:tracked.txt')" = "server tracked change"

if git cat-file -e 'stash@{0}^3:certs/runtime.crt' 2>/dev/null; then
    echo "runtime certificate was incorrectly included in the collision stash" >&2
    exit 1
fi

ignored_fixture="$(mktemp -d)"
git -C "$ignored_fixture" init -q
git -C "$ignored_fixture" config user.name "Deploy Test"
git -C "$ignored_fixture" config user.email "deploy-test@example.com"
printf 'certs/\n' >"$ignored_fixture/.gitignore"
git -C "$ignored_fixture" add .gitignore
git -C "$ignored_fixture" commit -q -m "ignore runtime certificates"
ignored_base_sha="$(git -C "$ignored_fixture" rev-parse HEAD)"
git -C "$ignored_fixture" switch -q -c deployment-target
mkdir -p "$ignored_fixture/certs"
printf 'canonical certificate\n' >"$ignored_fixture/certs/runtime.crt"
git -C "$ignored_fixture" add -f certs/runtime.crt
git -C "$ignored_fixture" commit -q -m "track certificate path"
ignored_target_sha="$(git -C "$ignored_fixture" rev-parse HEAD)"
git -C "$ignored_fixture" checkout -q "$ignored_base_sha"
mkdir -p "$ignored_fixture/certs"
printf 'server certificate\n' >"$ignored_fixture/certs/runtime.crt"
printf 'unrelated server key\n' >"$ignored_fixture/certs/unrelated.key"

cd "$ignored_fixture"
backup_untracked_checkout_conflicts "ignored-fixture" "$ignored_target_sha"
git checkout -q -B main "$ignored_target_sha"
test "$(cat certs/runtime.crt)" = "canonical certificate"
test "$(cat certs/unrelated.key)" = "unrelated server key"
test "$(git show 'stash@{0}^3:certs/runtime.crt')" = "server certificate"
if git cat-file -e 'stash@{0}^3:certs/unrelated.key' 2>/dev/null; then
    echo "unrelated ignored key was incorrectly included in the collision stash" >&2
    exit 1
fi

directory_fixture="$(mktemp -d)"
git -C "$directory_fixture" init -q
git -C "$directory_fixture" config user.name "Deploy Test"
git -C "$directory_fixture" config user.email "deploy-test@example.com"
printf 'base\n' >"$directory_fixture/base.txt"
git -C "$directory_fixture" add base.txt
git -C "$directory_fixture" commit -q -m "base"
directory_base_sha="$(git -C "$directory_fixture" rev-parse HEAD)"
git -C "$directory_fixture" switch -q -c deployment-target
printf 'canonical runtime file\n' >"$directory_fixture/runtime"
git -C "$directory_fixture" add runtime
git -C "$directory_fixture" commit -q -m "replace runtime directory"
directory_target_sha="$(git -C "$directory_fixture" rev-parse HEAD)"
git -C "$directory_fixture" checkout -q "$directory_base_sha"
mkdir -p "$directory_fixture/runtime"
printf 'server runtime child\n' >"$directory_fixture/runtime/child.txt"

cd "$directory_fixture"
backup_untracked_checkout_conflicts "directory-fixture" "$directory_target_sha"
git checkout -q -B main "$directory_target_sha"
test "$(cat runtime)" = "canonical runtime file"
test "$(git show 'stash@{0}^3:runtime/child.txt')" = "server runtime child"

literal_fixture="$(mktemp -d)"
git -C "$literal_fixture" init -q
git -C "$literal_fixture" config user.name "Deploy Test"
git -C "$literal_fixture" config user.email "deploy-test@example.com"
printf 'base\n' >"$literal_fixture/base.txt"
git -C "$literal_fixture" add base.txt
git -C "$literal_fixture" commit -q -m "base"
literal_base_sha="$(git -C "$literal_fixture" rev-parse HEAD)"
git -C "$literal_fixture" switch -q -c deployment-target
printf 'canonical bracket certificate\n' >"$literal_fixture/cert[1].pem"
git -C "$literal_fixture" --literal-pathspecs add 'cert[1].pem'
git -C "$literal_fixture" commit -q -m "track literal path"
literal_target_sha="$(git -C "$literal_fixture" rev-parse HEAD)"
git -C "$literal_fixture" checkout -q "$literal_base_sha"
printf 'server bracket certificate\n' >"$literal_fixture/cert[1].pem"
printf 'unrelated certificate\n' >"$literal_fixture/cert1.pem"

cd "$literal_fixture"
backup_untracked_checkout_conflicts "literal-fixture" "$literal_target_sha"
git checkout -q -B main "$literal_target_sha"
test "$(cat 'cert[1].pem')" = "canonical bracket certificate"
test "$(cat cert1.pem)" = "unrelated certificate"
test "$(git show 'stash@{0}^3:cert[1].pem')" = "server bracket certificate"
if git cat-file -e 'stash@{0}^3:cert1.pem' 2>/dev/null; then
    echo "pathspec metacharacters captured an unrelated file" >&2
    exit 1
fi

echo "deploy backup integration test passed"
