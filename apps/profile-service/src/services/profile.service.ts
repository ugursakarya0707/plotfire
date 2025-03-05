import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from '../repositories/profile.repository';
import { ProfileEntity } from '../entities/profile.entity';

@Injectable()
export class ProfileService {
  constructor(private profileRepository: ProfileRepository) {}

  async findAll(): Promise<ProfileEntity[]> {
    return this.profileRepository.findAll();
  }

  async findById(id: string): Promise<ProfileEntity> {
    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async findByUserId(userId: string): Promise<ProfileEntity> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(`Profile for user with ID ${userId} not found`);
    }
    return profile;
  }

  async create(profileData: Partial<ProfileEntity>): Promise<ProfileEntity> {
    return this.profileRepository.create(profileData);
  }

  async update(id: string, profileData: Partial<ProfileEntity>): Promise<ProfileEntity> {
    await this.findById(id); // Ensure profile exists
    return this.profileRepository.update(id, profileData);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure profile exists
    await this.profileRepository.delete(id);
  }

  async findOrCreateProfile(userId: string, userType: string): Promise<ProfileEntity> {
    try {
      return await this.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Profile doesn't exist, create a new one
        return this.profileRepository.create({
          userId,
          userType: userType as any,
          interests: [],
          skills: [],
          education: []
        });
      }
      throw error;
    }
  }
}
