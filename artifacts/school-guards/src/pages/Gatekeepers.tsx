import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Briefcase,
  Check,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useStore } from "../store/useStore";
import { useUsers } from "../store/useUsers";
import GatekeeperProfile from "../components/GatekeeperProfile";
import type { Gatekeeper, GatekeeperStatus, Operation, School } from "../types";
import { displayGovernorate, governorateKey, uniqueGovernorates } from "../lib/governorates";

const STATUSES: GatekeeperStatus[] = ["على رأس العمل", "منقول", "منقطع", "منتهي العقد", "غير نشط"];
const GENDERS: Gatekeeper["gender"][] = ["ذكر", "أنثى"];
const IMPORT_HEADERS = [
  "اسم البواب",
  "رقم الهوية",
  "رقم الجوال",
  "الجنس",
  "الشركة المشغلة",
  "معرف المدرسة",
  "اسم المدرسة",
  "الحالة",
  "تاريخ المباشرة",
  "ملاحظات",
];

type GatekeeperForm = Omit<Gatekeeper, "id" | "createdAt" | "updatedAt">;

type ImportAccepted = {
  row: number;
  gatekeeper: Gatekeeper;
  school: School;
};

type ImportRejected = {
  row: number;
  name: string;
  reason: string;
};

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function unique(values: (string | undefined | null)[]) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, "ar")
  );
}

function normalizeDigits(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function readCell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function makeOp(type: Operation["type"], gatekeeper: Gatekeeper, details: Record<string, string>, notes = ""): Operation {
  return {
    id: genId(),
    type,
    guardId: null,
    guardName: gatekeeper.name,
    date: todayStr(),
    notes,
    createdAt: new Date().toISOString(),
    details: { gatekeeperId: gatekeeper.id, ...details },
  };
}

function statusBadge(status: GatekeeperStatus) {
  if (status === "على رأس العمل") return "bg-green-100 text-green-800";
  if (status === "منقول") return "bg-blue-100 text-blue-800";
  if (status === "منتهي العقد") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function SchoolSelect({
  schools,
  value,
  onChange,
}: {
  schools: School[];
  value: string;
  onChange: (schoolId: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      required
    >
      <option value="">اختر المدرسة</option>
      {schools.map((school) => (
        <option key={school.id} value={school.id}>
          {school.name} - {displayGovernorate(school.governorate)}
        </option>
      ))}
    </select>
  );
}

function GatekeeperFormModal({
  initial,
  schools,
  onSave,
  onClose,
  duplicateIds,
}: {
  initial?: Gatekeeper;
  schools: School[];
  onSave: (form: GatekeeperForm) => void;
  onClose: () => void;
  duplicateIds: Set<string>;
}) {
  const [form, setForm] = useState<GatekeeperForm>({
    name: initial?.name ?? "",
    nationalId: initial?.nationalId ?? "",
    phone: initial?.phone ?? "",
    gender: initial?.gender ?? "ذكر",
    company: initial?.company ?? "",
    schoolId: initial?.schoolId ?? "",
    status: initial?.status ?? "على رأس العمل",
    startDate: initial?.startDate ?? todayStr(),
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState("");
  const selectedSchool = schools.find((school) => school.id === form.schoolId) ?? null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nationalId = normalizeDigits(form.nationalId);
    const phone = normalizeDigits(form.phone);
    if (!form.name.trim()) return setError("يرجى إدخال اسم البواب");
    if (!/^\d{10}$/.test(nationalId)) return setError("رقم الهوية يجب أن يتكون من 10 أرقام");
    if (!/^05\d{8}$/.test(phone)) return setError("رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام");
    if (!form.company.trim()) return setError("يرجى إدخال الشركة المشغلة");
    if (!selectedSchool) return setError("يرجى اختيار مدرسة من القائمة");
    if (duplicateIds.has(nationalId)) return setError("رقم الهوية مسجل مسبقاً");
    onSave({ ...form, name: form.name.trim(), nationalId, phone, company: form.company.trim(), notes: form.notes?.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <form onSubmit={submit} className="flex max-h-[95vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4" style={{ background: "hsl(174 65% 28%)" }}>
          <h2 className="font-bold text-white">{initial ? "تعديل بيانات البواب" : "إضافة بواب"}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold">
              اسم البواب
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              رقم الهوية أو السجل المدني
              <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              رقم الجوال
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              الجنس
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gatekeeper["gender"] })} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30">
                {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              الشركة المشغلة
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              الحالة
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GatekeeperStatus })} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30">
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              تاريخ المباشرة
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">
              المدرسة
              <SchoolSelect schools={schools} value={form.schoolId} onChange={(schoolId) => setForm({ ...form, schoolId })} />
            </label>
          </div>

          {selectedSchool && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="mb-2 font-bold text-primary">بيانات المدرسة الحالية</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <span>المحافظة: {displayGovernorate(selectedSchool.governorate)}</span>
                <span>المرحلة: {selectedSchool.level || "-"}</span>
                <span>النوع: {selectedSchool.type}</span>
                <span>المدير/ة: {selectedSchool.principalName || "-"}</span>
                <span>سجل المدير/ة: {selectedSchool.principalNationalId || "-"}</span>
                <span>جوال المدير/ة: {selectedSchool.principalPhone || "-"}</span>
              </div>
            </div>
          )}

          <label className="space-y-1.5 text-sm font-semibold">
            ملاحظات
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30" />
          </label>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
        </div>
        <div className="flex gap-3 border-t border-border p-6">
          <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90">
            <Check className="h-4 w-4" />
            حفظ البيانات
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Gatekeepers() {
  const { gatekeepers, schools, operations, addGatekeeper, updateGatekeeper, deleteGatekeeper, importGatekeepers } = useStore();
  const { isAdmin } = useUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [governorateFilter, setGovernorateFilter] = useState("");
  const [selected, setSelected] = useState<Gatekeeper | null>(null);
  const [formTarget, setFormTarget] = useState<Gatekeeper | "add" | null>(null);
  const [transferTarget, setTransferTarget] = useState<Gatekeeper | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Gatekeeper | null>(null);
  const [transferSchoolId, setTransferSchoolId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [importPreview, setImportPreview] = useState<{ accepted: ImportAccepted[]; rejected: ImportRejected[] } | null>(null);

  const schoolsById = useMemo(() => new Map(schools.map((school) => [school.id, school])), [schools]);
  const nationalIds = useMemo(() => new Set(gatekeepers.map((g) => g.nationalId)), [gatekeepers]);
  const activeCount = gatekeepers.filter((g) => g.status === "على رأس العمل").length;
  const linkedSchoolCount = new Set(gatekeepers.filter((g) => g.status === "على رأس العمل").map((g) => g.schoolId)).size;

  const options = useMemo(
    () => ({
      companies: unique(gatekeepers.map((g) => g.company)),
      governorates: uniqueGovernorates(schools.map((school) => school.governorate)),
    }),
    [gatekeepers, schools]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return gatekeepers.filter((gatekeeper) => {
      const school = schoolsById.get(gatekeeper.schoolId);
      const matchesSearch =
        !q ||
        gatekeeper.name.includes(q) ||
        gatekeeper.nationalId.includes(q) ||
        gatekeeper.phone.includes(q) ||
        gatekeeper.company.includes(q) ||
        school?.name.includes(q);
      const matchesStatus = !statusFilter || gatekeeper.status === statusFilter;
      const matchesGender = !genderFilter || gatekeeper.gender === genderFilter;
      const matchesCompany = !companyFilter || gatekeeper.company === companyFilter;
      const matchesGovernorate = !governorateFilter || governorateKey(school?.governorate) === governorateKey(governorateFilter);
      return matchesSearch && matchesStatus && matchesGender && matchesCompany && matchesGovernorate;
    });
  }, [companyFilter, gatekeepers, genderFilter, governorateFilter, schoolsById, search, statusFilter]);

  function saveGatekeeper(form: GatekeeperForm) {
    if (formTarget && formTarget !== "add") {
      const previousSchool = schoolsById.get(formTarget.schoolId);
      const nextSchool = schoolsById.get(form.schoolId);
      const op = makeOp(
        formTarget.schoolId !== form.schoolId ? "نقل بواب" : "تعديل بيانات بواب",
        { ...formTarget, ...form },
        {
          fromSchoolName: previousSchool?.name ?? "",
          toSchoolName: nextSchool?.name ?? "",
          summary: formTarget.schoolId !== form.schoolId ? "نقل البواب إلى مدرسة أخرى" : "تعديل بيانات البواب",
        }
      );
      updateGatekeeper(formTarget.id, form, op);
    } else {
      const gatekeeper: Gatekeeper = { ...form, id: genId(), createdAt: new Date().toISOString() };
      const school = schoolsById.get(form.schoolId);
      addGatekeeper(
        gatekeeper,
        makeOp("إضافة بواب", gatekeeper, { toSchoolName: school?.name ?? "", summary: "إضافة بواب جديد" })
      );
    }
    setFormTarget(null);
  }

  function confirmTransfer() {
    if (!transferTarget || !transferSchoolId) return;
    const fromSchool = schoolsById.get(transferTarget.schoolId);
    const toSchool = schoolsById.get(transferSchoolId);
    const op = makeOp(
      "نقل بواب",
      transferTarget,
      {
        fromSchoolName: fromSchool?.name ?? "",
        fromSchoolId: fromSchool?.id ?? "",
        toSchoolName: toSchool?.name ?? "",
        toSchoolId: toSchool?.id ?? "",
        reason: transferReason.trim(),
        summary: "نقل البواب إلى مدرسة أخرى",
      },
      transferReason.trim()
    );
    updateGatekeeper(transferTarget.id, { schoolId: transferSchoolId, status: "منقول" }, op);
    setTransferTarget(null);
    setTransferSchoolId("");
    setTransferReason("");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteGatekeeper(deleteTarget.id, makeOp("حذف بواب", deleteTarget, { summary: "حذف بيانات البواب" }, "حذف بيانات البواب"));
    setDeleteTarget(null);
  }

  function exportExcel() {
    const rows = filtered.map((gatekeeper) => {
      const school = schoolsById.get(gatekeeper.schoolId);
      return {
        "اسم البواب": gatekeeper.name,
        "رقم الهوية": gatekeeper.nationalId,
        "رقم الجوال": gatekeeper.phone,
        "الجنس": gatekeeper.gender,
        "الشركة المشغلة": gatekeeper.company,
        "الحالة": gatekeeper.status,
        "تاريخ المباشرة": gatekeeper.startDate,
        "اسم المدرسة": school?.name ?? "",
        "معرف المدرسة": school?.id ?? "",
        "المحافظة": school ? displayGovernorate(school.governorate) : "",
        "المرحلة": school?.level ?? "",
        "نوع المدرسة": school?.type ?? "",
        "اسم المدير/ة": school?.principalName ?? "",
        "سجل المدير/ة": school?.principalNationalId ?? "",
        "جوال المدير/ة": school?.principalPhone ?? "",
        "ملاحظات": gatekeeper.notes ?? "",
      };
    });
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "البوابين");
    XLSX.writeFile(wb, `البوابين-${todayStr()}.xlsx`);
  }

  function exportTemplate() {
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    const template = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS]);
    const schoolsSheet = XLSX.utils.json_to_sheet(
      schools.map((school) => ({
        "معرف المدرسة": school.id,
        "اسم المدرسة": school.name,
        "المحافظة": displayGovernorate(school.governorate),
        "المرحلة": school.level,
        "النوع": school.type,
      }))
    );
    XLSX.utils.book_append_sheet(wb, template, "نموذج البوابين");
    XLSX.utils.book_append_sheet(wb, schoolsSheet, "المدارس المعتمدة");
    XLSX.writeFile(wb, `نموذج-استيراد-البوابين-${todayStr()}.xlsx`);
  }

  function parseImport(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target?.result, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const accepted: ImportAccepted[] = [];
      const rejected: ImportRejected[] = [];
      const existing = new Set(gatekeepers.map((g) => g.nationalId));
      const incoming = new Set<string>();
      const schoolById = new Map(schools.map((school) => [school.id, school]));
      const schoolByName = new Map(schools.map((school) => [school.name.trim(), school]));

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const name = readCell(row, ["اسم البواب", "الاسم", "name"]);
        const nationalId = normalizeDigits(readCell(row, ["رقم الهوية", "السجل المدني", "nationalId"]));
        const phone = normalizeDigits(readCell(row, ["رقم الجوال", "الجوال", "phone"]));
        const gender = readCell(row, ["الجنس", "gender"]) as Gatekeeper["gender"];
        const company = readCell(row, ["الشركة المشغلة", "الشركة", "company"]);
        const schoolId = readCell(row, ["معرف المدرسة", "school_id", "schoolId"]);
        const schoolName = readCell(row, ["اسم المدرسة", "المدرسة", "schoolName"]);
        const status = (readCell(row, ["الحالة", "status"]) || "على رأس العمل") as GatekeeperStatus;
        const startDate = readCell(row, ["تاريخ المباشرة", "startDate"]) || todayStr();
        const notes = readCell(row, ["ملاحظات", "notes"]);
        const school = schoolById.get(schoolId) ?? schoolByName.get(schoolName.trim());

        const reasons: string[] = [];
        if (!name) reasons.push("اسم البواب مفقود");
        if (!/^\d{10}$/.test(nationalId)) reasons.push("رقم الهوية غير صحيح");
        if (!/^05\d{8}$/.test(phone)) reasons.push("رقم الجوال غير صحيح");
        if (gender !== "ذكر" && gender !== "أنثى") reasons.push("الجنس يجب أن يكون ذكر أو أنثى");
        if (!company) reasons.push("الشركة المشغلة مفقودة");
        if (!STATUSES.includes(status)) reasons.push("الحالة غير معتمدة");
        if (!school) reasons.push("المدرسة غير مطابقة للمدارس المعتمدة");
        if (existing.has(nationalId) || incoming.has(nationalId)) reasons.push("رقم الهوية مكرر");

        if (reasons.length || !school) {
          rejected.push({ row: rowNumber, name: name || "-", reason: reasons.join("، ") });
          return;
        }

        incoming.add(nationalId);
        accepted.push({
          row: rowNumber,
          school,
          gatekeeper: {
            id: genId(),
            name,
            nationalId,
            phone,
            gender,
            company,
            schoolId: school.id,
            status,
            startDate,
            notes,
            createdAt: new Date().toISOString(),
          },
        });
      });

      setImportPreview({ accepted, rejected });
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  function commitImport() {
    if (!importPreview) return;
    const ops = importPreview.accepted.map(({ gatekeeper, school }) =>
      makeOp("إضافة بواب", gatekeeper, { toSchoolName: school.name, summary: "استيراد بواب من Excel" })
    );
    importGatekeepers(importPreview.accepted.map((item) => item.gatekeeper), ops);
    setImportPreview(null);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-5 overflow-hidden" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة البوابين</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">إجمالي: {gatekeepers.length.toLocaleString("ar-SA")} بواب - على رأس العمل: {activeCount.toLocaleString("ar-SA")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="w-56 rounded-lg border border-border bg-white py-2 pl-4 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={exportTemplate} className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/60">
            <FileText className="h-4 w-4" />
            نموذج Excel
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10">
            <Upload className="h-4 w-4" />
            استيراد Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && parseImport(e.target.files[0])} />
          <button onClick={exportExcel} disabled={filtered.length === 0} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50">
            <Download className="h-4 w-4" />
            تصدير Excel
          </button>
          <button onClick={() => setFormTarget("add")} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            إضافة بواب
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "إجمالي البوابين", value: gatekeepers.length, color: "bg-white border-border text-foreground" },
          { label: "على رأس العمل", value: activeCount, color: "bg-green-50 border-green-200 text-green-800" },
          { label: "مدارس مرتبطة ببوابين", value: linkedSchoolCount, color: "bg-teal-50 border-teal-200 text-teal-800" },
          { label: "الشركات المشغلة", value: options.companies.length, color: "bg-blue-50 border-blue-200 text-blue-800" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 text-center ${item.color}`}>
            <p className="text-xl font-bold">{item.value.toLocaleString("ar-SA")}</p>
            <p className="mt-0.5 text-xs opacity-80">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={governorateFilter} onChange={(e) => setGovernorateFilter(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">المحافظة: الكل</option>
            {options.governorates.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
          </select>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">الشركة: الكل</option>
            {options.companies.map((company) => <option key={company} value={company}>{company}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">الحالة: الكل</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">الجنس: الكل</option>
            {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">لا توجد بيانات مطابقة</div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="data-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>إجراءات</th>
                  <th>اسم البواب</th>
                  <th>السجل المدني</th>
                  <th>رقم الجوال</th>
                  <th>المدرسة</th>
                  <th>المحافظة</th>
                  <th>الشركة المشغلة</th>
                  <th>الجنس</th>
                  <th>الحالة</th>
                  <th>تاريخ المباشرة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((gatekeeper) => {
                  const school = schoolsById.get(gatekeeper.schoolId);
                  return (
                    <tr key={gatekeeper.id}>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button onClick={() => setSelected(gatekeeper)} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80">
                            <Eye className="h-3.5 w-3.5" />
                            ملف
                          </button>
                          <button onClick={() => setFormTarget(gatekeeper)} className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                          <button onClick={() => { setTransferTarget(gatekeeper); setTransferSchoolId(""); setTransferReason(""); }} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            نقل
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteTarget(gatekeeper)} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="font-semibold">{gatekeeper.name}</td>
                      <td className="font-mono text-sm">{gatekeeper.nationalId}</td>
                      <td className="font-mono text-sm" dir="ltr">{gatekeeper.phone}</td>
                      <td>{school?.name ?? "غير محددة"}</td>
                      <td>{school ? displayGovernorate(school.governorate) : "-"}</td>
                      <td>{gatekeeper.company}</td>
                      <td>{gatekeeper.gender}</td>
                      <td><span className={`badge ${statusBadge(gatekeeper.status)}`}>{gatekeeper.status}</span></td>
                      <td>{gatekeeper.startDate || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <GatekeeperProfile gatekeeper={selected} school={schoolsById.get(selected.schoolId) ?? null} operations={operations} onClose={() => setSelected(null)} />}

      {formTarget && (
        <GatekeeperFormModal
          initial={formTarget === "add" ? undefined : formTarget}
          schools={schools}
          duplicateIds={new Set([...nationalIds].filter((id) => formTarget === "add" || id !== formTarget.nationalId))}
          onSave={saveGatekeeper}
          onClose={() => setFormTarget(null)}
        />
      )}

      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <h3 className="font-bold">نقل البواب</h3>
            </div>
            <div className="space-y-4">
              <SchoolSelect schools={schools.filter((school) => school.id !== transferTarget.schoolId)} value={transferSchoolId} onChange={setTransferSchoolId} />
              <textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="سبب النقل..." className="min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={confirmTransfer} disabled={!transferSchoolId} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50">اعتماد النقل</button>
              <button onClick={() => setTransferTarget(null)} className="rounded-xl bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-bold">حذف البواب</h3>
            </div>
            <p className="text-sm text-muted-foreground">سيتم حذف بيانات {deleteTarget.name} من سجل البوابين فقط.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">حذف</button>
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-2xl px-6 py-4" style={{ background: "hsl(174 65% 28%)" }}>
              <h2 className="font-bold text-white">تقرير استيراد البوابين</h2>
              <button onClick={() => setImportPreview(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-green-800">
                  <p className="text-2xl font-bold">{importPreview.accepted.length.toLocaleString("ar-SA")}</p>
                  <p className="text-sm">صفوف مقبولة</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-800">
                  <p className="text-2xl font-bold">{importPreview.rejected.length.toLocaleString("ar-SA")}</p>
                  <p className="text-sm">صفوف مرفوضة</p>
                </div>
              </div>
              {importPreview.rejected.length > 0 && (
                <div className="rounded-xl border border-border">
                  <div className="border-b border-border px-4 py-3 text-sm font-bold">أسباب الرفض</div>
                  <div className="max-h-64 overflow-auto">
                    <table className="data-table">
                      <thead><tr><th>الصف</th><th>الاسم</th><th>السبب</th></tr></thead>
                      <tbody>{importPreview.rejected.map((item) => <tr key={`${item.row}-${item.name}`}><td>{item.row}</td><td>{item.name}</td><td>{item.reason}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 border-t border-border p-6">
              <button onClick={commitImport} disabled={importPreview.accepted.length === 0} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50">اعتماد الاستيراد</button>
              <button onClick={() => setImportPreview(null)} className="rounded-xl bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
