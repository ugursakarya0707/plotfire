import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassRepository } from '../repositories/class.repository';
import { ClassEntity } from '../entities/class.entity';
import { EnrollmentRepository } from '../repositories/enrollment.repository';

@Injectable()
export class ClassService {
  constructor(
    private classRepository: ClassRepository,
    private enrollmentRepository: EnrollmentRepository,
  ) {}

  async findAll(): Promise<ClassEntity[]> {
    return this.classRepository.findAll();
  }

  async findById(id: string): Promise<ClassEntity> {
    const classEntity = await this.classRepository.findById(id);
    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }
    return classEntity;
  }

  async findByTeacherId(teacherId: string): Promise<ClassEntity[]> {
    return this.classRepository.findByTeacherId(teacherId);
  }

  async create(classData: Partial<ClassEntity>): Promise<ClassEntity> {
    return this.classRepository.create(classData);
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity> {
    await this.findById(id); // Ensure class exists
    return this.classRepository.update(id, classData);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure class exists
    await this.classRepository.delete(id);
  }

  async getStudentCount(classId: string): Promise<number> {
    const enrollments = await this.enrollmentRepository.findByClassId(classId);
    return enrollments.length;
  }

  async updateStudentCount(classId: string): Promise<void> {
    const count = await this.getStudentCount(classId);
    await this.classRepository.update(classId, { studentCount: count });
  }
}
