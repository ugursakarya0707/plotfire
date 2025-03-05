import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { ProfileEntity } from '../entities/profile.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('profiles')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req): Promise<ProfileEntity> {
    try {
      return await this.profileService.findByUserId(req.user.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // If profile doesn't exist, create a new one
        return this.profileService.create({
          userId: req.user.id,
          userType: req.user.userType,
          interests: [],
          skills: [],
          education: []
        });
      }
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<ProfileEntity[]> {
    return this.profileService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string): Promise<ProfileEntity> {
    return this.profileService.findById(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUserId(@Param('userId') userId: string): Promise<ProfileEntity> {
    return this.profileService.findByUserId(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() profileData: Partial<ProfileEntity>, @Request() req): Promise<ProfileEntity> {
    // Ensure the user can only create a profile for themselves
    if (profileData.userId && profileData.userId !== req.user.id) {
      throw new ForbiddenException('You can only create a profile for yourself');
    }
    
    // Set the userId from the JWT token
    profileData.userId = req.user.id;
    
    // Convert education to string array if it's an object array
    if (profileData.education && Array.isArray(profileData.education) && profileData.education.length > 0 && typeof profileData.education[0] === 'object') {
      profileData.education = profileData.education.map(edu => JSON.stringify(edu));
    }
    
    return this.profileService.create(profileData);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() profileData: Partial<ProfileEntity>,
    @Request() req,
  ): Promise<ProfileEntity> {
    // Check if the profile belongs to the user
    const profile = await this.profileService.findById(id);
    if (profile.userId !== req.user.id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    
    // Convert education to string array if it's an object array
    if (profileData.education && Array.isArray(profileData.education) && profileData.education.length > 0 && typeof profileData.education[0] === 'object') {
      profileData.education = profileData.education.map(edu => JSON.stringify(edu));
    }
    
    return this.profileService.update(id, profileData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    // Check if the profile belongs to the user
    const profile = await this.profileService.findById(id);
    if (profile.userId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own profile');
    }
    
    await this.profileService.delete(id);
  }
}
