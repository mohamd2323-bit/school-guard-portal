export interface School {
  id: string;
  name: string;
  governorate: string;
  level: string;
  type: "بنين" | "بنات" | "مختلط";
  principalName: string;
  principalNationalId: string;
  principalPhone: string;
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
}
