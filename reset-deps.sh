#!/bin/bash
# Enhanced script to reset dependencies in monorepo
set -e  # Exit on any error

echo "🧹 Step 1/5: Cleaning old dependencies..."
rm -rf node_modules
rm -rf site/node_modules admin/node_modules workspace/node_modules platform/node_modules shared/node_modules
rm -rf pnpm-lock.yaml

echo ""
echo "🗑️  Step 2/5: Cleaning build artifacts..."
rm -rf .next
rm -rf site/.next admin/.next workspace/.next platform/.next

echo ""
echo "📦 Step 3/5: Installing dependencies..."
pnpm install

echo ""
echo "🔍 Step 4/5: Verifying critical dependencies..."
echo ""
echo "Checking next-intl in applications:"
pnpm --filter site list next-intl --depth=0 2>/dev/null && echo "  ✅ site: next-intl found" || echo "  ⚠️  site: next-intl NOT found"
pnpm --filter admin list next-intl --depth=0 2>/dev/null && echo "  ✅ admin: next-intl found" || echo "  ⚠️  admin: next-intl NOT found"
pnpm --filter workspace list next-intl --depth=0 2>/dev/null && echo "  ✅ workspace: next-intl found" || echo "  ⚠️  workspace: next-intl NOT found"
pnpm --filter platform list next-intl --depth=0 2>/dev/null && echo "  ✅ platform: next-intl found" || echo "  ⚠️  platform: next-intl NOT found"

echo ""
echo "Checking shared package linkage:"
pnpm --filter site list shared --depth=0 2>/dev/null && echo "  ✅ site → shared" || echo "  ❌ site → shared FAILED"
pnpm --filter admin list shared --depth=0 2>/dev/null && echo "  ✅ admin → shared" || echo "  ❌ admin → shared FAILED"
pnpm --filter workspace list shared --depth=0 2>/dev/null && echo "  ✅ workspace → shared" || echo "  ❌ workspace → shared FAILED"
pnpm --filter platform list shared --depth=0 2>/dev/null && echo "  ✅ platform → shared" || echo "  ❌ platform → shared FAILED"

echo ""
echo "🏗️  Step 5/5: Testing build (site)..."
if pnpm --filter site run build; then
  echo "  ✅ Site build successful"
else
  echo "  ⚠️  Site build failed (check errors above)"
fi

echo ""
echo "✅ Done! Summary:"
echo "   - Dependencies installed"
echo "   - Critical packages verified"
echo "   - Build tested"
echo ""
echo "⚠️  Don't forget to restart TypeScript Server:"
echo "   Cmd+Shift+P → 'TypeScript: Restart TS Server'"
echo "   Or restart your IDE"
