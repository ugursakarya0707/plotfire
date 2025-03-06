import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { FavoriteTeacherService } from '../services/favorite-teacher.service';
import { CreateFavoriteTeacherDto } from '../dto/create-favorite-teacher.dto';
import { FavoriteTeacher } from '../schemas/favorite-teacher.schema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StudentRoleGuard } from '../guards/student-role.guard';

@Controller('favorite-teachers')
@UseGuards(JwtAuthGuard, StudentRoleGuard)
export class FavoriteTeacherController {
  constructor(private readonly favoriteTeacherService: FavoriteTeacherService) {}

  @Post()
  async addFavorite(
    @Request() req,
    @Body() createFavoriteTeacherDto: CreateFavoriteTeacherDto,
  ): Promise<FavoriteTeacher> {
    try {
      const studentId = req.user.sub || req.user.id; // JWT token'dan kullanıcı ID'sini al
      return await this.favoriteTeacherService.addFavorite(studentId, createFavoriteTeacherDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to add favorite: ${error.message}`);
    }
  }

  @Delete(':teacherId')
  async removeFavorite(@Request() req, @Param('teacherId') teacherId: string): Promise<void> {
    try {
      const studentId = req.user.sub || req.user.id;
      return await this.favoriteTeacherService.removeFavorite(studentId, teacherId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to remove favorite: ${error.message}`);
    }
  }

  @Get()
  async getFavorites(@Request() req): Promise<FavoriteTeacher[]> {
    try {
      const studentId = req.user.sub || req.user.id;
      return await this.favoriteTeacherService.getFavorites(studentId);
    } catch (error) {
      throw new BadRequestException(`Failed to get favorites: ${error.message}`);
    }
  }

  @Get('check/:teacherId')
  async isFavorite(@Request() req, @Param('teacherId') teacherId: string): Promise<{ isFavorite: boolean }> {
    try {
      const studentId = req.user.sub || req.user.id;
      const isFavorite = await this.favoriteTeacherService.isFavorite(studentId, teacherId);
      return { isFavorite };
    } catch (error) {
      throw new BadRequestException(`Failed to check favorite status: ${error.message}`);
    }
  }
}
