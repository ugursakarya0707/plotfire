import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FavoriteTeacher, FavoriteTeacherDocument } from '../schemas/favorite-teacher.schema';
import { CreateFavoriteTeacherDto } from '../dto/create-favorite-teacher.dto';
import { TeacherConference, TeacherConferenceDocument } from '../schemas/teacher-conference.schema';

@Injectable()
export class FavoriteTeacherService {
  constructor(
    @InjectModel(FavoriteTeacher.name)
    private favoriteTeacherModel: Model<FavoriteTeacherDocument>,
    @InjectModel(TeacherConference.name)
    private teacherConferenceModel: Model<TeacherConferenceDocument>,
  ) {}

  async addFavorite(studentId: string, createFavoriteTeacherDto: CreateFavoriteTeacherDto): Promise<FavoriteTeacher> {
    try {
      // MongoDB ObjectId kontrolü
      if (!Types.ObjectId.isValid(createFavoriteTeacherDto.teacherId)) {
        throw new BadRequestException(`Invalid teacher ID format: ${createFavoriteTeacherDto.teacherId}`);
      }

      // Check if teacher exists
      const teacher = await this.teacherConferenceModel.findById(createFavoriteTeacherDto.teacherId).exec();
      if (!teacher || !teacher.isActive) {
        throw new NotFoundException(`Teacher with ID ${createFavoriteTeacherDto.teacherId} not found`);
      }

      // Check if already favorited
      const existingFavorite = await this.favoriteTeacherModel.findOne({
        studentId,
        teacherId: createFavoriteTeacherDto.teacherId,
        isActive: true,
      }).exec();

      if (existingFavorite) {
        throw new ConflictException(`Teacher is already in favorites`);
      }

      // Create new favorite
      const newFavorite = new this.favoriteTeacherModel({
        studentId,
        teacherId: createFavoriteTeacherDto.teacherId,
      });

      return await newFavorite.save();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to add favorite: ${error.message}`);
    }
  }

  async removeFavorite(studentId: string, teacherId: string): Promise<void> {
    try {
      // MongoDB ObjectId kontrolü
      if (!Types.ObjectId.isValid(teacherId)) {
        throw new BadRequestException(`Invalid teacher ID format: ${teacherId}`);
      }

      const result = await this.favoriteTeacherModel.findOneAndUpdate(
        { studentId, teacherId, isActive: true },
        { isActive: false },
      ).exec();

      if (!result) {
        throw new NotFoundException(`Favorite teacher with ID ${teacherId} not found for student ${studentId}`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to remove favorite: ${error.message}`);
    }
  }

  async getFavorites(studentId: string): Promise<FavoriteTeacher[]> {
    try {
      return await this.favoriteTeacherModel
        .find({ studentId, isActive: true })
        .populate('teacherId')
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to get favorites: ${error.message}`);
    }
  }

  async isFavorite(studentId: string, teacherId: string): Promise<boolean> {
    try {
      // MongoDB ObjectId kontrolü
      if (!Types.ObjectId.isValid(teacherId)) {
        throw new BadRequestException(`Invalid teacher ID format: ${teacherId}`);
      }

      const favorite = await this.favoriteTeacherModel.findOne({
        studentId,
        teacherId,
        isActive: true,
      }).exec();

      return !!favorite;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to check favorite status: ${error.message}`);
    }
  }
}
