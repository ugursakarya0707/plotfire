import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrollmentEntity } from '../entities/enrollment.entity';

@Injectable()
export class EnrollmentRepository {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private enrollmentRepository: Repository<EnrollmentEntity>,
  ) {}

  async findAll(): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepository.find({ relations: ['class'] });
  }

  async findById(id: string): Promise<EnrollmentEntity> {
    return this.enrollmentRepository.findOne({ 
      where: { id },
      relations: ['class']
    });
  }

  async findByStudentId(studentId: string): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepository.find({ 
      where: { studentId, active: true },
      relations: ['class']
    });
  }

  async findByClassId(classId: string): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepository.find({ 
      where: { classId, active: true }
    });
  }

  async create(enrollmentData: Partial<EnrollmentEntity>): Promise<EnrollmentEntity> {
    const newEnrollment = this.enrollmentRepository.create(enrollmentData);
    return this.enrollmentRepository.save(newEnrollment);
  }

  async update(id: string, enrollmentData: Partial<EnrollmentEntity>): Promise<EnrollmentEntity> {
    await this.enrollmentRepository.update(id, enrollmentData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.enrollmentRepository.delete(id);
  }
}
