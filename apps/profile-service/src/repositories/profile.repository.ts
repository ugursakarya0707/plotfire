import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from '../entities/profile.entity';

@Injectable()
export class ProfileRepository {
  constructor(
    @InjectRepository(ProfileEntity)
    private profileRepository: Repository<ProfileEntity>,
  ) {}

  async findAll(): Promise<ProfileEntity[]> {
    return this.profileRepository.find();
  }

  async findById(id: string): Promise<ProfileEntity> {
    return this.profileRepository.findOneBy({ id });
  }

  async findByUserId(userId: string): Promise<ProfileEntity> {
    return this.profileRepository.findOneBy({ userId });
  }

  async create(profileData: Partial<ProfileEntity>): Promise<ProfileEntity> {
    const newProfile = this.profileRepository.create(profileData);
    return this.profileRepository.save(newProfile);
  }

  async update(id: string, profileData: Partial<ProfileEntity>): Promise<ProfileEntity> {
    await this.profileRepository.update(id, profileData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.profileRepository.delete(id);
  }
}
