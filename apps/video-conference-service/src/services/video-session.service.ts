import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VideoSession, VideoSessionDocument } from '../schemas/video-session.schema';
import { CreateVideoSessionDto } from '../dto/create-video-session.dto';
import { UpdateVideoSessionDto, VideoSessionStatus } from '../dto/update-video-session.dto';
import { LiveKitService } from './livekit.service';

@Injectable()
export class VideoSessionService {
  constructor(
    @InjectModel(VideoSession.name)
    private videoSessionModel: Model<VideoSessionDocument>,
    private liveKitService: LiveKitService,
  ) {}

  /**
   * Yeni bir video oturumu oluşturur
   */
  async create(createVideoSessionDto: CreateVideoSessionDto): Promise<VideoSession> {
    try {
      // LiveKit'te oda oluştur
      const roomName = createVideoSessionDto.roomName || `room_${createVideoSessionDto.teacherId}_${createVideoSessionDto.studentId}_${Date.now()}`;
      await this.liveKitService.createRoom(roomName);
      
      // Video oturumu oluştur
      const newVideoSession = new this.videoSessionModel({
        ...createVideoSessionDto,
        roomName,
        status: VideoSessionStatus.WAITING,
      });
      
      return newVideoSession.save();
    } catch (error) {
      throw new BadRequestException(`Failed to create video session: ${error.message}`);
    }
  }

  /**
   * Tüm aktif video oturumlarını getirir
   */
  async findAll(): Promise<VideoSession[]> {
    return this.videoSessionModel.find({ isActive: true }).exec();
  }

  /**
   * Öğretmen ID'sine göre tüm oturumları getirir
   */
  async findAllByTeacherId(teacherId: string): Promise<VideoSession[]> {
    return this.videoSessionModel.find({ 
      teacherId, 
      isActive: true 
    }).exec();
  }

  /**
   * Öğrenci ID'sine göre tüm oturumları getirir
   */
  async findAllByStudentId(studentId: string): Promise<VideoSession[]> {
    return this.videoSessionModel.find({ 
      studentId, 
      isActive: true 
    }).exec();
  }

  /**
   * ID'ye göre video oturumu getirir
   */
  async findById(id: string): Promise<VideoSession> {
    const videoSession = await this.videoSessionModel.findById(id).exec();
    if (!videoSession || !videoSession.isActive) {
      throw new NotFoundException(`Video session with ID ${id} not found`);
    }
    return videoSession;
  }

  /**
   * Öğretmen ID'sine göre oturumları getirir
   */
  async findByTeacherId(teacherId: string): Promise<VideoSession[]> {
    return this.videoSessionModel.find({ 
      teacherId, 
      isActive: true 
    }).exec();
  }

  /**
   * Öğrenci ID'sine göre oturumları getirir
   */
  async findByStudentId(studentId: string): Promise<VideoSession[]> {
    return this.videoSessionModel.find({ 
      studentId, 
      isActive: true 
    }).exec();
  }

  /**
   * Öğretmen ID'sine göre bekleyen oturumları getirir
   */
  async findPendingByTeacherId(teacherId: string): Promise<VideoSession[]> {
    return this.videoSessionModel.find({ 
      teacherId, 
      status: VideoSessionStatus.WAITING,
      isActive: true 
    }).exec();
  }

  /**
   * Oturumu başlatır ve token oluşturur
   */
  async startSession(sessionId: string, teacherName: string, studentName: string): Promise<VideoSession> {
    const session = await this.findById(sessionId);
    
    if (session.status !== VideoSessionStatus.WAITING) {
      throw new BadRequestException(`Session is already ${session.status}`);
    }
    
    // Öğretmen için token oluştur
    const teacherToken = this.liveKitService.generateToken(
      session.roomName,
      teacherName,
      session.teacherId,
      true
    );
    
    // Oturumu güncelle
    return this.videoSessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: VideoSessionStatus.ACTIVE,
        startTime: new Date(),
        roomToken: teacherToken
      },
      { new: true }
    ).exec();
  }

  /**
   * Öğrenci için token oluşturur
   */
  async getStudentToken(sessionId: string, studentName: string): Promise<string> {
    const session = await this.findById(sessionId);
    
    if (session.status !== VideoSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is not active, current status: ${session.status}`);
    }
    
    // Öğrenci için token oluştur
    return this.liveKitService.generateToken(
      session.roomName,
      studentName,
      session.studentId,
      false
    );
  }

  /**
   * Oturum durumunu günceller
   */
  async updateStatus(sessionId: string, status: VideoSessionStatus): Promise<VideoSession> {
    const session = await this.findById(sessionId);
    
    const updateData: any = { status };
    
    if (status === VideoSessionStatus.COMPLETED) {
      updateData.endTime = new Date();
    }
    
    return this.videoSessionModel.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true }
    ).exec();
  }

  /**
   * Oturumu günceller
   */
  async update(id: string, updateVideoSessionDto: UpdateVideoSessionDto): Promise<VideoSession> {
    const updatedSession = await this.videoSessionModel
      .findByIdAndUpdate(id, updateVideoSessionDto, { new: true })
      .exec();
    
    if (!updatedSession) {
      throw new NotFoundException(`Video session with ID ${id} not found`);
    }
    
    return updatedSession;
  }

  /**
   * Oturumu siler (soft delete)
   */
  async remove(id: string): Promise<void> {
    const result = await this.videoSessionModel
      .findByIdAndUpdate(id, { isActive: false })
      .exec();
    
    if (!result) {
      throw new NotFoundException(`Video session with ID ${id} not found`);
    }
  }
}
