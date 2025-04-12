import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import livekitRoutes from './routes/livekitRoutes';

// Çevre değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const port = process.env.PORT || 3030;

// Middleware'leri ekle
app.use(helmet()); // Güvenlik başlıkları
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // JSON body parser
app.use(morgan('dev')); // Loglama

// Ana route
app.get('/', (req, res) => {
  res.json({
    message: 'LiveKit Mikroservis API',
    version: '1.0.0',
    status: 'running'
  });
});

// LiveKit route'larını ekle
app.use('/api/livekit', livekitRoutes);

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`LiveKit mikroservisi http://localhost:${port} adresinde çalışıyor`);
  console.log(`LiveKit API: ${process.env.LIVEKIT_WS_URL}`);
});

// Hata yakalama
process.on('unhandledRejection', (error) => {
  console.error('Yakalanmamış Promise hatası:', error);
});

export default app;
