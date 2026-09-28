export type RowImportStatus = 'VALID' | 'INVALID' | 'DUPLICATE';

export interface ParsedStudentRow {
  registerNumber: string;
  collegeEmail: string;
  firstName: string;
  lastName?: string;
  departmentCode: string;
  courseCode: string;
  batchName: string;
  phoneNumber?: string;
}

export interface StudentRowPreview {
  rowNumber: number;
  status: RowImportStatus;
  data: ParsedStudentRow;
  errors: string[];
}

export interface ImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  canImport: boolean;
  rows: StudentRowPreview[];
}
