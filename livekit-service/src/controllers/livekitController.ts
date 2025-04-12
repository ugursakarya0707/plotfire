import { Request, Response } from 'express';
import livekitService from '../services/livekitService';

/**
 * Token oluşturma
 */
export const createToken = (req: Request, res: Response) => {
  try {
    const { roomName, participantName, isTeacher } = req.body;

    // Gerekli parametreleri kontrol et
    if (!roomName || !participantName) {
      return res.status(400).json({
        success: false,
        message: 'roomName ve participantName parametreleri gereklidir'
      });
    }

    // Token oluştur
    const token = livekitService.createToken(
      roomName,
      participantName,
      isTeacher === true
    );

    // Başarılı yanıt döndür
    return res.status(200).json({
      success: true,
      token,
      roomName,
      userName: participantName,
      role: isTeacher ? 'teacher' : 'student'
    });
  } catch (error: any) {
    console.error('Token oluşturma hatası:', error);
    return res.status(500).json({
      success: false,
      message: `Token oluşturma hatası: ${error.message}`
    });
  }
};

/**
 * Oda oluşturma veya mevcut odayı kontrol etme
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomName } = req.body;

    // Oda adı kontrolü
    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'roomName parametresi gereklidir'
      });
    }

    // Oda oluştur veya mevcut odayı getir
    const room = await livekitService.createRoomIfNotExists(roomName);

    // Başarılı yanıt döndür
    return res.status(200).json({
      success: true,
      room
    });
  } catch (error: any) {
    console.error('Oda oluşturma hatası:', error);
    return res.status(500).json({
      success: false,
      message: `Oda oluşturma hatası: ${error.message}`
    });
  }
};

/**
 * Oda varlığını kontrol etme
 */
export const checkRoom = async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;

    // Oda adı kontrolü
    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'roomName parametresi gereklidir'
      });
    }

    // Oda varlığını kontrol et
    const exists = await livekitService.checkRoomExists(roomName);

    // Yanıt döndür
    return res.status(200).json({
      success: true,
      exists
    });
  } catch (error: any) {
    console.error('Oda kontrolü hatası:', error);
    return res.status(500).json({
      success: false,
      message: `Oda kontrolü hatası: ${error.message}`
    });
  }
};

/**
 * Odadaki katılımcıları listeleme
 */
export const getParticipants = async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;
    const refresh = req.query.refresh === 'true';

    // Oda adı kontrolü
    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'roomName parametresi gereklidir'
      });
    }

    console.log(`Katılımcılar isteniyor: Oda=${roomName}, Refresh=${refresh}`);

    // Önce odanın var olduğunu kontrol et
    const roomExists = await livekitService.checkRoomExists(roomName);
    if (!roomExists) {
      console.warn(`Oda bulunamadı: ${roomName}`);
      return res.status(404).json({
        success: false,
        message: `Oda bulunamadı: ${roomName}`
      });
    }

    // Katılımcıları getir
    const participants = await livekitService.getParticipants(roomName);
    console.log(`Katılımcı sayısı: ${participants.length} (Oda: ${roomName})`);

    // Yanıt döndür
    return res.status(200).json({
      success: true,
      participants
    });
  } catch (error: any) {
    console.error('Katılımcı listesi alma hatası:', error);
    return res.status(500).json({
      success: false,
      message: `Katılımcı listesi alma hatası: ${error.message}`
    });
  }
};

/**
 * Odayı sonlandırma
 */
export const endRoom = async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;

    // Oda adı kontrolü
    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'roomName parametresi gereklidir'
      });
    }

    // Odayı sonlandır
    const success = await livekitService.endRoom(roomName);

    // Yanıt döndür
    return res.status(200).json({
      success
    });
  } catch (error: any) {
    console.error('Oda sonlandırma hatası:', error);
    return res.status(500).json({
      success: false,
      message: `Oda sonlandırma hatası: ${error.message}`
    });
  }
};

export default {
  createToken,
  createRoom,
  checkRoom,
  getParticipants,
  endRoom
};
