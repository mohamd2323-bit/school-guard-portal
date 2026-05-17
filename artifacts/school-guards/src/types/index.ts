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
}
