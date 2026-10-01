#!/usr/bin/env bash
# Medical Tourism ortak agent ortamı doğrulaması.
# Salt okunur: dosya oluşturmaz, değiştirmez veya silmez.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_HOME="${HOME:-}"
VAULT="${MEDICAL_TOURISM_BRAIN:-${REPO_ROOT}-brain}"
CODEX_CONFIG="${CODEX_HOME:-${USER_HOME}/.codex}/config.toml"
fail=0

ok()   { printf '✓ %s\n' "$1"; }
bad()  { printf '✗ %s (%s)\n' "$1" "$2"; fail=1; }
info() { printf '• %s\n' "$1"; }

check_file() {
  if [ -f "$2" ]; then ok "$1"; else bad "$1" "bulunamadı: $2"; fi
}

check_contains() {
  if [ -f "$2" ] && grep -q "$3" "$2" 2>/dev/null; then ok "$1"; else bad "$1" "aranan ifade bulunamadı: $3"; fi
}

printf '%s\n' 'Medical Tourism agent environment check'
printf 'Code root: %s\nMedical Tourism brain vault: %s\n\n' "$REPO_ROOT" "$VAULT"

check_file "AGENTS.md" "$REPO_ROOT/AGENTS.md"
check_file "CONTEXT.md" "$REPO_ROOT/CONTEXT.md"
check_file "CLAUDE.md" "$REPO_ROOT/CLAUDE.md"
check_contains "Claude adapter" "$REPO_ROOT/CLAUDE.md" '@AGENTS\.md'
check_contains "Claude context adapter" "$REPO_ROOT/CLAUDE.md" '@CONTEXT\.md'

check_contains "Uygulama görevi protokolü" "$REPO_ROOT/AGENTS.md" '## Uygulama görevi protokolü'
check_contains "Tek yazan ajan kuralı" "$REPO_ROOT/AGENTS.md" 'aynı anda yalnızca bir ajan dosyalara yazabilir'
check_contains "Worktree yasağı" "$REPO_ROOT/AGENTS.md" 'Worktree, ikinci checkout veya repository kopyası oluşturulmaz'
check_contains "Laya kuralları" "$REPO_ROOT/AGENTS.md" 'Laya routing ve karar katmanı'
check_contains "Serena kuralları" "$REPO_ROOT/AGENTS.md" 'Serena ilgili dosya ve sembolleri bulmak için kullanılır'
check_contains "Playwright kuralları" "$REPO_ROOT/AGENTS.md" 'Playwright ile gerçek tarayıcıda test edilir'
check_contains "Memory kapanış kuralı" "$REPO_ROOT/AGENTS.md" 'kalıcı özet yaz'

for spec in \
  docs/specs/001-message-governance-and-lead-follow-up.md \
  docs/specs/002-platform-foundation-and-modular-monolith.md \
  docs/specs/003-identity-session-consent-and-roles.md \
  docs/specs/004-patient-profile-and-preferences.md \
  docs/specs/005-organization-doctor-treatment-verification.md \
  docs/specs/006-discovery-search-filters-and-favorites.md \
  docs/specs/007-treatment-inquiry-lead-assignment-and-history.md \
  docs/specs/008-private-file-storage-and-authorized-access.md \
  docs/specs/009-quote-lifecycle.md \
  docs/specs/010-appointment-and-treatment-journey.md \
  docs/specs/011-notification-center-and-delivery.md \
  docs/specs/012-privacy-account-deletion-audit-operations.md; do
  check_file "Spec $spec" "$REPO_ROOT/$spec"
done

check_file "Obsidian vault marker" "$VAULT/.obsidian/app.json"
check_file "Current State" "$VAULT/50-Journal/Current State.md"
check_file "Agent Context" "$VAULT/90-Agent Context/Agent Context.md"
check_file "Memory Protocol" "$VAULT/90-Agent Context/Memory Protocol.md"

check_file "Claude project MCP" "$REPO_ROOT/.mcp.json"
check_file "Antigravity project MCP" "$REPO_ROOT/.agents/mcp_config.json"
for server in laya serena playwright; do
  check_contains "Claude MCP: $server" "$REPO_ROOT/.mcp.json" "\"$server\""
  check_contains "Antigravity MCP: $server" "$REPO_ROOT/.agents/mcp_config.json" "\"$server\""
done

if command -v laya-mcp-server >/dev/null 2>&1; then ok "Laya command ($(command -v laya-mcp-server))"; else bad "Laya command" 'laya-mcp-server PATH içinde değil'; fi
if command -v uvx >/dev/null 2>&1; then ok "Serena launcher ($(command -v uvx))"; else bad "Serena launcher" 'uvx PATH içinde değil'; fi
if command -v npx >/dev/null 2>&1; then ok "Playwright launcher ($(command -v npx))"; else bad "Playwright launcher" 'npx PATH içinde değil'; fi

if [ -d "$VAULT/.obsidian" ] && [ -r "$VAULT" ] && [ -w "$VAULT" ]; then
  ok 'Yerel Obsidian vault okuma/yazma'
else
  bad 'Yerel Obsidian vault okuma/yazma' "$VAULT"
fi

if [ -d "$REPO_ROOT/.git" ] || git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  wt_count="$(git -C "$REPO_ROOT" worktree list 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${wt_count:-1}" -le 1 ]; then ok 'Worktree yok'; else bad 'Worktree yasağı' "$wt_count worktree var"; fi
  if git -C "$REPO_ROOT" check-ignore -q .serena/cache 2>/dev/null \
    && git -C "$REPO_ROOT" check-ignore -q .serena/logs 2>/dev/null \
    && git -C "$REPO_ROOT" check-ignore -q .playwright-mcp 2>/dev/null; then
    ok 'Serena/Playwright çıktıları .gitignore içinde'
  else
    bad 'Serena/Playwright çıktıları' '.gitignore kayıtları eksik'
  fi
else
  info 'Git checkout yok; git status/worktree/check-ignore kontrolleri uygulanamaz, kurulum hatası sayılmadı'
fi

for global_file in \
  "${USER_HOME}/.gemini/config/mcp_config.json" \
  "${USER_HOME}/.omp/agent/mcp.json" \
  "$CODEX_CONFIG"; do
  if [ -f "$global_file" ]; then
    for server in laya serena playwright; do
      if grep -q "$server" "$global_file" 2>/dev/null; then ok "Global MCP: $server ($global_file)"; else info "Global MCP kaydı yok: $server ($global_file)"; fi
    done
  else
    info "Global MCP dosyası yok: $global_file"
  fi
done

if command -v python3 >/dev/null 2>&1; then
  if python3 - "$REPO_ROOT/.mcp.json" "$REPO_ROOT/.agents/mcp_config.json" <<'PY'
import json, sys
expected = {"laya", "serena", "playwright"}
for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as handle:
        names = set(json.load(handle).get("mcpServers", {}))
    if names != expected:
        raise SystemExit(f"{path}: expected {expected}, got {names}")
PY
  then ok 'MCP JSON sözleşmesi ve tekil server isimleri'; else bad 'MCP JSON sözleşmesi' 'JSON veya server listesi geçersiz'; fi
else
  info 'python3 yok; MCP JSON ayrıntılı parse kontrolü atlandı'
fi

printf '\n'
if [ "$fail" -eq 0 ]; then
  echo 'Universal agent environment ready.'
else
  echo 'Universal agent environment NOT ready — yukarıdaki ✗ satırlarına bakın.'
fi
exit "$fail"
