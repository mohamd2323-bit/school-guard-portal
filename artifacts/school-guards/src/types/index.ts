export interface School {
  id: string;
  name: string;
  governorate: string;
  level: string;
  type: "بنين" | "بنات" | "مختلط";
  principalName: string;
  principalNationalId: string;
  principalPhone: string;
  isDemo?: boolean;
}

export interface Guard {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  gender: "ذكر" | "أنثى";
  status: "نشط" | "غير نشط";
  schoolId: string | null;
  schoolName: string | null;
  jobType?: string;
  jobTitle?: string;
  rank?: string;
  appointmentCategory?: string;
  region?: string;
  governorate?: string;
  isDemo?: boolean;
}

export type NeedStatus = "جديد" | "تحت الإجراء" | "تم التغطية" | "مغلق";
export type NeedType = "حارس" | "حارسة";

export interface Need {
  id: string;
  schoolId: string | null;
  schoolName: string;
  governorate: string;
  principalName: string;
  principalNationalId: string;
  principalPhone: string;
  needType: NeedType;
  reason: string;
  requestDate: string;
  status: NeedStatus;
  createdAt: string;
}

export type TicketStatus = "جديد" | "تحت الإجراء" | "مغلق";
export type TicketType =
  | "شكوى"
  | "طلب صيانة"
  | "طلب دعم فني"
  | "بلاغ حادثة"
  | "متابعة"
  | "أخرى";

export interface Ticket {
  id: string;
  ticketNumber: string;
  schoolId: string | null;
  schoolName: string;
  governorate: string;
  principalName: string;
  principalPhone: string;
  ticketType: TicketType;
  description: string;
  status: TicketStatus;
  ticketDate: string;
  actions: string;
  createdAt: string;
}

export type OperationType =
  | "نقل حارس"
  | "إضافة حارس"
  | "تكليف حارس"
  | "بدل حارس"
  | "تعديل بيانات";

export interface Operation {
  id: string;
  type: OperationType;
  guardId: string | null;
  guardName: string;
  date: string;
  notes: string;
  createdAt: string;
  details: Record<string, string>;
}

export type ViolationStatus = "جديد" | "تحت الإجراء" | "مغلق";
export type ViolationType = "شكوى" | "ملاحظة" | "بلاغ" | "مخالفة" | "أخرى";
export type ReporterSource =
  | "مدير مدرسة"
  | "ولي أمر"
  | "مشرف"
  | "جهة حكومية"
  | "أخرى";

export interface Violation {
  id: string;
  caseNumber: string;
  type: ViolationType;
  reporterName: string;
  reporterSource: ReporterSource;
  schoolId: string | null;
  schoolName: string;
  governorate: string;
  guardId: string | null;
  guardName: string;
  description: string;
  reportDate: string;
  status: ViolationStatus;
  actionTaken: string;
  notes: string;
  createdAt: string;
}

export interface ImportSummary {
  guardsImported: number;
  schoolsImported: number;
  linkedRecords: number;
  failedRecords: number;
  errors: string[];
}

export interface AppData {
  guards: Guard[];
  schools: School[];
  needs: Need[];
  tickets: Ticket[];
  operations: Operation[];
  violations: Violation[];
}
