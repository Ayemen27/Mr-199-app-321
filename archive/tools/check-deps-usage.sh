#!/usr/bin/env bash
# سكربت فحص استخدام الحزم المرشحة للحذف
# بناءً على نتائج التدقيق الشامل

set -e
echo "🔍 بدء فحص استخدام الحزم..."

mkdir -p audit-results

# الحزم المرشحة للحذف حسب نتائج depcheck
pkgs=(
  "@jridgewell/trace-mapping"
  "connect-pg-simple" 
  "framer-motion"
  "memorystore"
  "next-themes"
  "openid-client"
  "passport"
  "passport-local"
  "react-icons"
  "tw-animate-css"
  "xlsx"
)

echo "📝 إنشاء تقرير استخدام الحزم..."
echo "# تقرير فحص استخدام الحزم" > audit-results/deps-usage.txt
echo "تاريخ الفحص: $(date)" >> audit-results/deps-usage.txt
echo "=================================" >> audit-results/deps-usage.txt
echo "" >> audit-results/deps-usage.txt

for pkg in "${pkgs[@]}"; do
  echo "=== فحص الحزمة: $pkg ===" | tee -a audit-results/deps-usage.txt
  
  # البحث عن الاستيرادات المباشرة
  if rg -n "from ['\"]$pkg['\"]|require\(['\"]$pkg['\"]\)|import.*from.*['\"]$pkg['\"]" . 2>/dev/null; then
    echo "✅ وُجدت استيرادات مباشرة:" | tee -a audit-results/deps-usage.txt
    rg -n "from ['\"]$pkg['\"]|require\(['\"]$pkg['\"]\)|import.*from.*['\"]$pkg['\"]" . 2>/dev/null | tee -a audit-results/deps-usage.txt
  else
    # البحث عن أي ذكر للحزمة
    if rg -i "$pkg" . 2>/dev/null | head -5; then
      echo "⚠️  وُجدت إشارات غير مباشرة - افحص يدوياً:" | tee -a audit-results/deps-usage.txt
      rg -i "$pkg" . 2>/dev/null | head -5 | tee -a audit-results/deps-usage.txt
    else
      echo "❌ لم تُوجد أي إشارات - مرشحة للحذف" | tee -a audit-results/deps-usage.txt
    fi
  fi
  
  echo "" | tee -a audit-results/deps-usage.txt
done

echo "✅ اكتمل فحص الحزم. راجع النتائج في: audit-results/deps-usage.txt"