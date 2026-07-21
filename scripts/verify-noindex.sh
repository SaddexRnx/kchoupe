#!/usr/bin/env bash
# End-to-end verification of noindex headers + robots.txt behavior.
# Usage: BASE=http://localhost:8080 bash scripts/verify-noindex.sh
set -u
BASE="${BASE:-http://localhost:8080}"
FAIL=0
pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }

hdr() { curl -sI "$BASE$1" | tr -d '\r' | awk -F': ' -v k="$2" 'tolower($1)==k{print tolower($2)}'; }
body() { curl -s "$BASE$1"; }

expect_noindex() {
  local path="$1" h c; h="$(hdr "$path" x-robots-tag)"; c="$(hdr "$path" cache-control)"
  if [[ "$h" == *"noindex"* ]]; then pass "noindex header on $path  ($h)"
  else fail "MISSING noindex header on $path  (got: '${h:-<none>}')"; fi
  if [[ "$c" == *"no-store"* && "$c" == *"private"* ]]; then pass "no-store cache on $path  ($c)"
  else fail "MISSING private/no-store Cache-Control on $path  (got: '${c:-<none>}')"; fi
}
expect_indexable() {
  local path="$1" h; h="$(hdr "$path" x-robots-tag)"
  if [[ -z "$h" || "$h" != *"noindex"* ]]; then pass "indexable $path  (X-Robots-Tag: '${h:-<none>}')"
  else fail "$path should be indexable but got X-Robots-Tag: '$h'"; fi
}
robots_disallows() {
  local path="$1"
  if grep -qE "^Disallow:[[:space:]]*${path}" <<<"$ROBOTS"; then pass "robots.txt Disallow: $path"
  else fail "robots.txt missing Disallow for $path"; fi
}

echo "== Base: $BASE"
echo "== 1. robots.txt"
ROBOTS="$(body /robots.txt)"
[[ -n "$ROBOTS" ]] && pass "robots.txt served" || fail "robots.txt not served"
for p in /dashboard /admin /products /orders /conversations /integrations /settings \
         /ai-employees /knowledge /playground /support /onboarding \
         /login /signup /reset-password /api/ /mcp /.well-known/; do
  robots_disallows "$p"
done

echo "== 2. Authenticated app surfaces → noindex header"
for p in /dashboard /admin /products /orders /conversations /integrations /settings \
         /ai-employees /knowledge /playground /support /onboarding; do
  expect_noindex "$p"
done

echo "== 3. Auth flows → noindex header"
for p in /login /signup /reset-password; do expect_noindex "$p"; done

echo "== 4. API / MCP / well-known → noindex header"
for p in /api/public/webhooks/inbound /mcp /.well-known/oauth-protected-resource; do
  expect_noindex "$p"
done

echo "== 5. Unknown route (default-private) → noindex header"
expect_noindex "/this-page-does-not-exist-$(date +%s)"

echo "== 6. Public marketing pages → indexable"
for p in / /about /contact /privacy /terms /security /status /sitemap; do
  expect_indexable "$p"
done

echo "== 7. sitemap.xml sanity"
SM="$(body /sitemap.xml)"
if grep -qE '<loc>[^<]+/(dashboard|admin|products|orders|conversations|integrations|settings|ai-employees|knowledge|playground|support|onboarding|login|signup|reset-password)</loc>' <<<"$SM"; then
  fail "sitemap.xml leaks a private URL"
else
  pass "sitemap.xml contains no private URLs"
fi

echo
if [[ $FAIL -eq 0 ]]; then printf "\033[32mAll checks passed.\033[0m\n"; exit 0
else printf "\033[31m%d check(s) failed.\033[0m\n" "$FAIL"; exit 1; fi
