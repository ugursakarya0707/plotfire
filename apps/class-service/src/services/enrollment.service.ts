import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { ClassService } from './class.service';

@Injectable()
export class EnrollmentService {
  constructor(
    private enrollmentRepository: EnrollmentRepository,
    private classService: ClassService,
  ) {}

  async findAll(): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepository.findAll();
  }

  async findById(id: string): Promise<EnrollmentEntity> {
    const enrollment = await this.enrollmentRepository.findById(id);
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }
    return enrollment;
  }

  async findByStudentId(studentId: string): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepository.findByStudentId(studentId);
  }

  async findByClassId(classId: string): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepository.findByClassId(classId);
  }

  async create(enrollmentData: Partial<EnrollmentEntity>): Promise<EnrollmentEntity> {
    // Check if class exists
    await this.classService.findById(enrollmentData.classId);
    
    // Check if student is already enrolled
    const existingEnrollments = await this.enrollmentRepository.findByStudentId(enrollmentData.studentId);
    const alreadyEnrolled = existingEnrollments.some(e => e.classId === enrollmentData.classId && e.active);
    
    if (alreadyEnrolled) {
      throw new ConflictException(`Student is already enrolled in this class`);
    }
    
    const enrollment = await this.enrollmentRepository.create(enrollmentData);
    
    // Update student count for the class
    await this.classService.updateStudentCount(enrollmentData.classId);
    
    return enrollment;
  }

  async update(id: string, enrollmentData: Partial<EnrollmentEntity>): Promise<EnrollmentEntity> {
    await this.findById(id); // Ensure enrollment exists
    const enrollment = await this.enrollmentRepository.update(id, enrollmentData);
    
    // Update student count if active status changed
    if (enrollmentData.active !== undefined) {
      await this.classService.updateStudentCount(enrollment.classId);
    }
    
    return enrollment;
  }

  async delete(id: string): Promise<void> {
    const enrollment = await this.findById(id); // Ensure enrollment exists
    await this.enrollmentRepository.delete(id);
    
    // Update student count
    await this.classService.updateStudentCount(enrollment.classId);
  }
}
