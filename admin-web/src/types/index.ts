export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    courses: number;
  };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  department?: Department;
  createdAt: string;
  updatedAt: string;
  _count?: {
    batches: number;
  };
}

export interface Batch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  courseId: string;
  course?: Course;
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
  };
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    classSessions: number;
  };
}

export interface Venue {
  id: string;
  name: string;
  building?: string | null;
  capacity?: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    classSessions: number;
    placementDrives: number;
  };
}

// Form DTOs
export interface CreateDepartmentInput {
  code: string;
  name: string;
}

export interface UpdateDepartmentInput {
  code?: string;
  name?: string;
}

export interface CreateCourseInput {
  code: string;
  name: string;
  departmentId: string;
}

export interface UpdateCourseInput {
  code?: string;
  name?: string;
  departmentId?: string;
}

export interface CreateBatchInput {
  name: string;
  startYear: number;
  endYear: number;
  courseId: string;
}

export interface UpdateBatchInput {
  name?: string;
  startYear?: number;
  endYear?: number;
  courseId?: string;
}

export interface CreateSubjectInput {
  code: string;
  title: string;
  description?: string;
}

export interface UpdateSubjectInput {
  code?: string;
  title?: string;
  description?: string;
}

export interface CreateVenueInput {
  name: string;
  building?: string;
  capacity?: number;
}

export interface UpdateVenueInput {
  name?: string;
  building?: string;
  capacity?: number;
}

export interface Staff {
  id: string;
  userId: string;
  staffId: string;
  firstName: string;
  lastName?: string | null;
  designation?: string | null;
  phoneNumber?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface GetStaffFilterParams {
  departmentId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StaffListResponse {
  data: Staff[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateStaffInput {
  staffId: string;
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  designation?: string;
  phoneNumber?: string;
  departmentId?: string;
}

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  designation?: string;
  phoneNumber?: string;
  departmentId?: string;
}

export interface UpdateStaffStatusInput {
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ResetStaffPasswordInput {
  password: string;
}

// Student Management Types
export interface Student {
  id: string;
  userId: string;
  registerNumber: string;
  collegeEmail: string;
  firstName: string;
  lastName?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  departmentId: string;
  department?: Department;
  courseId: string;
  course?: Course;
  batchId: string;
  batch?: Batch;
  isPlacementEligible: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface GetStudentsFilterParams {
  departmentId?: string;
  courseId?: string;
  batchId?: string;
  status?: string;
  isPlacementEligible?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentListResponse {
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  departmentId?: string;
  courseId?: string;
  batchId?: string;
  isPlacementEligible?: boolean;
}

export interface UpdateStudentStatusInput {
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface StudentImportRow {
  registerNumber: string;
  collegeEmail: string;
  firstName: string;
  lastName?: string;
  departmentCode: string;
  courseCode: string;
  batchName: string;
  phoneNumber?: string;
}

export interface ConfirmImportInput {
  rows: StudentImportRow[];
}

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

// Placement Drive & Recruitment Calendar Types
export type PlacementDriveStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface DriveRound {
  id: string;
  driveId: string;
  roundName: string;
  roundOrder: number;
  date?: string | null;
  venue?: string | null;
  description?: string | null;
  sessionId?: string | null;
  session?: {
    id: string;
    sessionCode: string;
    topic: string;
    scheduledDate: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementDrive {
  id: string;
  companyName: string;
  driveDate: string;
  venue: string;
  description?: string | null;
  status: PlacementDriveStatus;
  attendanceEnabled: boolean;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    staffId: string;
  } | null;
  rounds: DriveRound[];
  createdAt: string;
  updatedAt: string;
}

export interface GetPlacementDrivesFilterParams {
  status?: PlacementDriveStatus;
  companyName?: string;
  fromDate?: string;
  toDate?: string;
  attendanceEnabled?: boolean;
  page?: number;
  limit?: number;
}

export interface PlacementDriveListResponse {
  data: PlacementDrive[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateDriveRoundInput {
  roundName: string;
  roundOrder: number;
  date?: string;
  venue?: string;
  description?: string;
  sessionId?: string;
}

export interface UpdateDriveRoundInput {
  roundName?: string;
  roundOrder?: number;
  date?: string;
  venue?: string;
  description?: string;
  sessionId?: string;
}

export interface CreatePlacementDriveInput {
  companyName: string;
  driveDate: string;
  venue: string;
  description?: string;
  attendanceEnabled?: boolean;
  rounds?: CreateDriveRoundInput[];
}

export interface UpdatePlacementDriveInput {
  companyName?: string;
  driveDate?: string;
  venue?: string;
  description?: string;
  attendanceEnabled?: boolean;
}

export interface UpdatePlacementDriveStatusInput {
  status: PlacementDriveStatus;
}
