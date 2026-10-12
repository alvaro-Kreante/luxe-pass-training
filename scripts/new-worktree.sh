#!/usr/bin/env bash
# Crea un worktree hermano del repo con una rama nueva desde dev actualizada,
# copia los .env ignorados por git e instala dependencias.
#
# Uso:  bash scripts/new-worktree.sh <prefijo>/<descripcion> [puerto-dev]
# Ej.:  bash scripts/new-worktree.sh fix/login-lockout-plural 3001
set -euo pipefail

branch="${1:-}"
port="${2:-}"

if [[ ! "$branch" =~ ^(feat|fix|refactor|test|chore|docs)/[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Rama inválida: '$branch'. Formato: <feat|fix|refactor|test|chore|docs>/<descripcion-en-kebab>" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
target="$(dirname "$root")/$(basename "$root")--${branch//\//-}"

if [[ -e "$target" ]]; then
  echo "Ya existe $target" >&2
  exit 1
fi

git -C "$root" fetch origin dev
git -C "$root" worktree add "$target" -b "$branch" origin/dev
git -C "$target" branch --unset-upstream 2>/dev/null || true

for f in .env .env.local; do
  [[ -f "$root/$f" ]] && cp "$root/$f" "$target/$f" && echo "Copiado $f"
done

(cd "$target" && npm install)

echo
echo "Worktree listo: $target  (rama $branch, base origin/dev)"
echo "  code \"$target\""
if [[ -n "$port" ]]; then
  echo "  dev server: npm run dev -- -p $port"
fi
echo "Recuerda: Supabase local y la suite de tests son compartidos entre worktrees."
echo "Para borrarlo: git worktree remove \"$target\""
