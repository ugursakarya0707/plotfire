import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from '../entities/class.entity';

@Injectable()
export class ClassRepository {
  constructor(
    @InjectRepository(ClassEntity)
    private classRepository: Repository<ClassEntity>,
  ) {}

  async findAll(): Promise<ClassEntity[]> {
    return this.classRepository.find();
  }

  async findById(id: string): Promise<ClassEntity> {
    return this.classRepository.findOneBy({ id });
  }

  async findByTeacherId(teacherId: string): Promise<ClassEntity[]> {
    return this.classRepository.findBy({ teacherId });
  }

  async create(classData: Partial<ClassEntity>): Promise<ClassEntity> {
    const newClass = this.classRepository.create(classData);
    return this.classRepository.save(newClass);
  }

  async update(id: string, classData: Partial<ClassEntity>): Promise<ClassEntity> {
    await this.classRepository.update(id, classData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.classRepository.delete(id);
  }
}
