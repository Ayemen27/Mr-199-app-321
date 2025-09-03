#!/usr/bin/env bash
set -euo pipefail

LOGFILE="./audit-report.txt"

echo "=== Audit started: $(date -u) ===" > "$LOGFILE"

echo "# 1. Basic environment info" | tee -a "$LOGFILE"
echo "User: $(whoami)" | tee -a "$LOGFILE"
echo "Node: $(node -v 2>/dev/null || echo 'node not found')" | tee -a "$LOGFILE"
echo "NPM/Yarn: $(npm -v 2>/dev/null || echo 'npm not found')" | tee -a "$LOGFILE"
echo "Disk usage (df -h):" | tee -a "$LOGFILE"
df -h | tee -a "$LOGFILE"
echo "Project size (du -sh .):" | tee -a "$LOGFILE"
du -sh . | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

echo "# 2. Git status" | tee -a "$LOGFILE"
git status --porcelain 2>/dev/null | tee -a "$LOGFILE" || echo "Not a git repository or git not available" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

echo "# 3. Package.json dependencies check" | tee -a "$LOGFILE"
if [ -f "package.json" ]; then
  echo "Package.json exists. Checking critical dependencies..." | tee -a "$LOGFILE"
  grep -E '("react"|"express"|"typescript"|"@supabase/supabase-js")' package.json | tee -a "$LOGFILE" || echo "Some key dependencies not found" | tee -a "$LOGFILE"
else
  echo "No package.json found!" | tee -a "$LOGFILE"
fi
echo "" | tee -a "$LOGFILE"

echo "# 4. TypeScript compilation check" | tee -a "$LOGFILE"
if command -v npx &> /dev/null; then
  echo "Running TypeScript compilation check..." | tee -a "$LOGFILE"
  npx tsc --noEmit --skipLibCheck 2>&1 | head -20 | tee -a "$LOGFILE" || echo "TypeScript compilation failed or tsc not found" | tee -a "$LOGFILE"
else
  echo "npx not available, skipping TypeScript check" | tee -a "$LOGFILE"
fi
echo "" | tee -a "$LOGFILE"

echo "# 5. Build attempt" | tee -a "$LOGFILE"
if [ -f "package.json" ] && grep -q "build" package.json; then
  echo "Attempting build (limited output)..." | tee -a "$LOGFILE"
  timeout 120s npm run build 2>&1 | tail -10 | tee -a "$LOGFILE" || echo "Build failed or timeout" | tee -a "$LOGFILE"
else
  echo "No build script found in package.json" | tee -a "$LOGFILE"
fi
echo "" | tee -a "$LOGFILE"

echo "# 6. Critical file structure" | tee -a "$LOGFILE"
echo "Checking key files/dirs..." | tee -a "$LOGFILE"
for path in "client/src" "server" "api" "shared" ".env" "vercel.json" "tsconfig.json"; do
  if [ -e "$path" ]; then
    echo "✓ $path exists" | tee -a "$LOGFILE"
  else
    echo "✗ $path missing" | tee -a "$LOGFILE"
  fi
done
echo "" | tee -a "$LOGFILE"

echo "# 7. Search for common error patterns" | tee -a "$LOGFILE"
echo "Looking for potential issues in code..." | tee -a "$LOGFILE"
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -100 | xargs grep -l "\.find(" 2>/dev/null | head -5 | tee -a "$LOGFILE" || echo "No .find() usage files found" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

echo "# 8. Process check" | tee -a "$LOGFILE"
echo "Current running processes (filtered):" | tee -a "$LOGFILE"
ps aux | grep -E "(node|npm|tsx)" | head -5 | tee -a "$LOGFILE" || echo "No Node processes found" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

echo "# 9. Environment variables (redacted)" | tee -a "$LOGFILE"
env | grep -E "^(NODE_|NPM_|API_BASE_URL|VERCEL)" | sed 's/=.*/=***/' | tee -a "$LOGFILE" || echo "No relevant env vars found" | tee -a "$LOGFILE"
echo "" | tee -a "$LOGFILE"

echo "=== Audit completed: $(date -u) ===" | tee -a "$LOGFILE"
echo "Results saved to $LOGFILE"