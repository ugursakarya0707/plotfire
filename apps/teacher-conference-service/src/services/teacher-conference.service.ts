import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TeacherConference, TeacherConferenceDocument } from '../schemas/teacher-conference.schema';
import { CreateTeacherConferenceDto } from '../dto/create-teacher-conference.dto';

@Injectable()
export class TeacherConferenceService {
  constructor(
    @InjectModel(TeacherConference.name)
    private teacherConferenceModel: Model<TeacherConferenceDocument>,
  ) {}

  async create(createTeacherConferenceDto: CreateTeacherConferenceDto): Promise<TeacherConference> {
    const newTeacherConference = new this.teacherConferenceModel(createTeacherConferenceDto);
    return newTeacherConference.save();
  }

  async findAll(): Promise<TeacherConference[]> {
    return this.teacherConferenceModel.find({ isActive: true }).exec();
  }

  async findById(id: string): Promise<TeacherConference> {
    const teacherConference = await this.teacherConferenceModel.findById(id).exec();
    if (!teacherConference || !teacherConference.isActive) {
      throw new NotFoundException(`Teacher conference with ID ${id} not found`);
    }
    return teacherConference;
  }

  async findByTeacherId(teacherId: string): Promise<TeacherConference> {
    console.log('findByTeacherId called with teacherId:', teacherId);
    
    const teacherConference = await this.teacherConferenceModel.findOne({ teacherId, isActive: true }).exec();
    
    console.log('Teacher conference found:', teacherConference ? 'Yes' : 'No');
    if (!teacherConference) {
      console.log('Teacher conference not found for teacherId:', teacherId);
      throw new NotFoundException(`Teacher conference not found for teacher ID ${teacherId}`);
    }
    
    return teacherConference;
  }

  async update(id: string, updateTeacherConferenceDto: Partial<CreateTeacherConferenceDto>): Promise<TeacherConference> {
    const updatedTeacherConference = await this.teacherConferenceModel
      .findByIdAndUpdate(id, updateTeacherConferenceDto, { new: true })
      .exec();
    
    if (!updatedTeacherConference) {
      throw new NotFoundException(`Teacher conference with ID ${id} not found`);
    }
    
    return updatedTeacherConference;
  }

  async remove(id: string): Promise<void> {
    const result = await this.teacherConferenceModel.findByIdAndUpdate(id, { isActive: false }).exec();
    
    if (!result) {
      throw new NotFoundException(`Teacher conference with ID ${id} not found`);
    }
  }

  async updateOnlineStatus(teacherId: string, isOnline: boolean): Promise<TeacherConference> {
    console.log('updateOnlineStatus called with teacherId:', teacherId, 'isOnline:', isOnline);
    
    try {
      const teacherConference = await this.teacherConferenceModel.findOneAndUpdate(
        { teacherId, isActive: true },
        { isOnline },
        { new: true }
      ).exec();
      
      console.log('Teacher conference updated:', teacherConference ? 'Yes' : 'No');
      if (!teacherConference) {
        console.log('Teacher conference not found for teacherId:', teacherId);
        throw new NotFoundException(`Teacher conference not found for teacher ID ${teacherId}`);
      }
      
      return teacherConference;
    } catch (error) {
      console.error('Error in updateOnlineStatus:', error);
      throw error;
    }
  }
}
