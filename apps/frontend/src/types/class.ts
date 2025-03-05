export interface Class {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacher?: string; // Teacher name (populated from API)
  image?: string;
  tags: string[];
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  class?: Class;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
