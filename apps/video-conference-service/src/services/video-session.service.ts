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
    
    console.log(`Checking session ${sessionId} status: ${session.status}`);
    
    // VideoSessionStatus.WAITING enum değeri 'waiting' (küçük harfle) olduğundan
    // doğrudan string karşılaştırması yapalım
    if (session.status !== 'waiting') {
      throw new BadRequestException(`Session is already ${session.status}`);
    }
    
    try {
      console.log(`Starting session ${sessionId} with teacher ${teacherName}`);
      
      // Öğretmen için token oluştur
      const teacherToken = this.liveKitService.generateToken(
        session.roomName,
        teacherName,
        session.teacherId,
        true
      );
      
      // LiveKit odasının varlığını kontrol et, yoksa oluştur
      try {
        await this.liveKitService.createRoom(session.roomName);
        console.log(`LiveKit room ${session.roomName} created or verified`);
      } catch (error) {
        console.log(`Room ${session.roomName} may already exist: ${error.message}`);
        // Oda zaten varsa hata fırlatma, devam et
      }
      
      // Oturumu güncelle - status değerini doğrudan string olarak belirt
      const updatedSession = await this.videoSessionModel.findByIdAndUpdate(
        sessionId,
        {
          status: 'active', // VideoSessionStatus.ACTIVE yerine doğrudan string kullan
          startTime: new Date(),
          roomToken: teacherToken
        },
        { new: true }
      ).exec();
      
      console.log(`Session ${sessionId} successfully started and set to active`);
      return updatedSession;
    } catch (error) {
      console.error(`Error starting session ${sessionId}: ${error.message}`);
      throw new BadRequestException(`Failed to start session: ${error.message}`);
    }
  }

  /**
   * Öğrenci için token oluşturur
   */
  async getStudentToken(sessionId: string, studentName: string): Promise<string> {
    try {
      const session = await this.findById(sessionId);
      
      console.log(`Getting student token for session: ${sessionId}, status: ${session.status}`);
      
      // Oturum durumunu kontrol et - "active" veya "waiting" durumunda olmalı
      // Büyük/küçük harf duyarsız karşılaştırma yapalım
      const status = session.status.toLowerCase();
      if (status !== 'active' && status !== 'waiting') {
        throw new BadRequestException(`Session is not ready for student to join, current status: ${session.status}`);
      }
      
      // Öğrenci için token oluştur
      return this.liveKitService.generateToken(
        session.roomName,
        studentName,
        session.studentId,
        false
      );
    } catch (error) {
      console.error(`Error generating student token: ${error.message}`);
      throw new BadRequestException(`Failed to generate student token: ${error.message}`);
    }
  }

  /**
   * Oturum durumunu günceller
   */
  async updateStatus(sessionId: string, status: VideoSessionStatus | string): Promise<VideoSession> {
    const session = await this.findById(sessionId);
    
    console.log(`Updating session ${sessionId} status from ${session.status} to ${status}`);
    
    const updateData: any = { status };
    
    // Tamamlanma durumunda bitiş zamanını ayarla
    if (status === VideoSessionStatus.COMPLETED || status === 'completed') {
      updateData.endTime = new Date();
      console.log(`Session ${sessionId} completed, setting end time`);
    }
    
    const updatedSession = await this.videoSessionModel.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true }
    ).exec();
    
    console.log(`Session ${sessionId} status updated to ${updatedSession.status}`);
    return updatedSession;
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

  /**
   * Oturumu sonlandırır ve LiveKit odasını kapatır
   */
  async endSession(sessionId: string): Promise<VideoSession> {
    try {
      console.log(`Ending session with ID: ${sessionId}`);
      const session = await this.findById(sessionId);
      
      if (session.status !== VideoSessionStatus.ACTIVE) {
        throw new BadRequestException(`Session is not active, current status: ${session.status}`);
      }
      
      // LiveKit odasını kapat
      await this.liveKitService.deleteRoom(session.roomName);
      console.log(`LiveKit room ${session.roomName} deleted successfully`);
      
      // Oturum durumunu güncelle
      const updatedSession = await this.videoSessionModel.findByIdAndUpdate(
        sessionId,
        {
          status: VideoSessionStatus.COMPLETED,
          endTime: new Date()
        },
        { new: true }
      ).exec();
      
      console.log(`Session ${sessionId} ended successfully`);
      return updatedSession;
    } catch (error) {
      console.error(`Error ending session: ${error.message}`);
      throw new BadRequestException(`Failed to end session: ${error.message}`);
    }
  }
}
