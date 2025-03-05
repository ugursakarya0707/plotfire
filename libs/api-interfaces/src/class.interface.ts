import { 
  ClassDto, 
  ClassDetailDto, 
  CreateClassDto, 
  UpdateClassDto,
  CreateClassMaterialDto,
  ClassMaterialDto
} from '@postply/models';

export interface ClassServiceInterface {
  createClass(teacherId: string, createClassDto: CreateClassDto): Promise<ClassDto>;
  updateClass(teacherId: string, classId: string, updateClassDto: UpdateClassDto): Promise<ClassDto>;
  deleteClass(teacherId: string, classId: string): Promise<boolean>;
  getClassById(classId: string): Promise<ClassDetailDto>;
  getClassesByTeacherId(teacherId: string): Promise<ClassDto[]>;
  getAllClasses(query?: string): Promise<ClassDto[]>;
  
  // Class materials
  addClassMaterial(teacherId: string, classId: string, createMaterialDto: CreateClassMaterialDto, file: any): Promise<ClassMaterialDto>;
  getClassMaterials(classId: string): Promise<ClassMaterialDto[]>;
  deleteClassMaterial(teacherId: string, materialId: string): Promise<boolean>;
}

// API Routes
export const CLASS_SERVICE_ROUTES = {
  CREATE_CLASS: '/classes',
  GET_ALL_CLASSES: '/classes',
  GET_TEACHER_CLASSES: '/classes/teacher/:teacherId',
  GET_CLASS_BY_ID: '/classes/:classId',
  UPDATE_CLASS: '/classes/:classId',
  DELETE_CLASS: '/classes/:classId',
  
  // Materials
  ADD_CLASS_MATERIAL: '/classes/:classId/materials',
  GET_CLASS_MATERIALS: '/classes/:classId/materials',
  DELETE_CLASS_MATERIAL: '/classes/materials/:materialId',
};
