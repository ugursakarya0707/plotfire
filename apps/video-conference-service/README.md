# Video Conference Service

Bu mikroservis, öğrencilerin öğretmenlerle canlı video görüşmeleri yapabilmesini sağlayan LiveKit tabanlı bir video konferans sistemidir.

## Kurulum

1. Gerekli bağımlılıkları yükleyin:
   ```
   npm install
   ```

2. `.env` dosyasını oluşturun ve aşağıdaki değişkenleri ayarlayın:
   ```
   # MongoDB Bağlantı Bilgileri
   MONGODB_URI=mongodb://localhost:27017/video-conference-service

   # JWT Ayarları
   JWT_SECRET=your-jwt-secret-key

   # LiveKit Ayarları
   LIVEKIT_API_KEY=your-livekit-api-key
   LIVEKIT_API_SECRET=your-livekit-api-secret
   LIVEKIT_URL=wss://your-livekit-server.com

   # CORS Ayarları
   CORS_ORIGIN=http://localhost:3000

   # Servis Port Ayarı
   PORT=3008
   ```

3. Servisi geliştirme modunda başlatın:
   ```
   npm run start:dev
   ```

## API Endpoints

### Video Oturumları

- `POST /api/video-sessions`: Yeni bir video oturumu oluşturur
- `GET /api/video-sessions`: Tüm video oturumlarını listeler
- `GET /api/video-sessions/:id`: Belirli bir video oturumunu getirir
- `PUT /api/video-sessions/:id/start`: Bir video oturumunu başlatır
- `PUT /api/video-sessions/:id/complete`: Bir video oturumunu tamamlar
- `PUT /api/video-sessions/:id/cancel`: Bir video oturumunu iptal eder
- `GET /api/video-sessions/:id/student-token`: Öğrenci için token oluşturur
- `GET /api/video-sessions/teacher/:teacherId/pending`: Öğretmen için bekleyen oturumları listeler

## Frontend Entegrasyonu

Frontend tarafında `.env` dosyasına aşağıdaki değişkenleri ekleyin:

```
REACT_APP_VIDEO_CONFERENCE_API_URL=http://localhost:3008/api
REACT_APP_LIVEKIT_URL=wss://your-livekit-server.com
```

## LiveKit Kurulumu

LiveKit'i kullanabilmek için:

1. [LiveKit Cloud](https://livekit.io/cloud) üzerinden bir hesap oluşturun veya kendi sunucunuza [LiveKit Server](https://github.com/livekit/livekit) kurun.
2. API anahtarı ve API gizli anahtarını alın.
3. Bu anahtarları `.env` dosyasında yapılandırın.

## Güvenlik

Bu servis, JWT tabanlı kimlik doğrulama kullanır ve rol tabanlı erişim kontrolü uygular. Öğrenciler ve öğretmenler için farklı erişim hakları vardır.
