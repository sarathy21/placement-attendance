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
