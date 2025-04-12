import { Router } from 'express';
import livekitController from '../controllers/livekitController';

const router = Router();

// Token oluşturma
router.post('/token', livekitController.createToken);

// Oda oluşturma
router.post('/room', livekitController.createRoom);

// Oda varlığını kontrol etme
router.get('/room/:roomName/exists', livekitController.checkRoom);

// Katılımcıları listeleme
router.get('/participants/:roomName', livekitController.getParticipants);

// Odayı sonlandırma
router.delete('/room/:roomName', livekitController.endRoom);

export default router;
