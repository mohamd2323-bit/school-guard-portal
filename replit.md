# بوابة الحراسات المدرسية

نظام إدارة الحراس المدرسيين — يتيح استيراد بيانات الحراس والمدارس من Excel وعرضها وإدارتها.

## Run & Operate

- `pnpm --filter @workspace/school-guards run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4
- Arabic RTL, Cairo font
- State: localStorage (no backend required)
- Excel import: xlsx library

## Where things live

- `artifacts/school-guards/src/App.tsx` — main router (wouter)
- `artifacts/school-guards/src/pages/` — Dashboard, Guards, Schools, DataManagement
- `artifacts/school-guards/src/components/Layout.tsx` — sidebar + top bar
- `artifacts/school-guards/src/components/GuardProfile.tsx` — guard profile modal
- `artifacts/school-guards/src/store/useStore.ts` — shared localStorage state
- `artifacts/school-guards/src/types/index.ts` — Guard and School types

## Architecture decisions

- Pure frontend app — all data stored in localStorage, no database or API needed
- Excel import uses the `xlsx` library; reads Schools sheet first, then Guards sheet
- Guards linked to schools: first by principal national ID, then by principal name, then by school name
- Shared global state via a simple listener pattern (no Redux/Zustand) to avoid heavy deps
- RTL enforced at the `<html dir="rtl">` level and in body CSS

## Product

- **لوحة التحكم**: إجمالي الحراس، المدارس، الحراس الذكور، الحارسات الإناث، مدارس بدون حارس
- **إدارة الحراس**: جدول مع بحث، زر ملف لكل حارس
- **إدارة المدارس**: جدول مع بحث
- **إدارة البيانات**: استيراد Excel (ورقتان: Guards + Schools)، ملخص الاستيراد، حذف البيانات
- **ملف الحارس**: بيانات الحارس + المدرسة + المدير/ة في modal

## User preferences

- لا بيانات تجريبية نهائياً — "لا توجد بيانات حالياً" عند الفراغ
- عربي RTL
- ألوان حكومية: تيل وأبيض

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
