# LiveKit Mikroservis

Bu mikroservis, Postply uygulaması için gerçek zamanlı video konferans özelliklerini sağlar. LiveKit Cloud altyapısını kullanarak WebRTC bağlantılarını yönetir.

## Özellikler

- Token oluşturma
- Oda yönetimi
- Katılımcı listesi alma
- WebRTC bağlantı yönetimi

## Kurulum

### Gereksinimler

- Node.js 18+
- Docker ve Docker Compose
- LiveKit Cloud hesabı ve API anahtarları

### Çevre Değişkenleri

`.env` dosyasını oluşturun:

```bash
cp .env.example .env
```

Aşağıdaki değişkenleri güncelleyin:

- `LIVEKIT_API_KEY`: LiveKit Cloud API anahtarı
- `LIVEKIT_API_SECRET`: LiveKit Cloud API gizli anahtarı
- `LIVEKIT_WS_URL`: LiveKit Cloud WebSocket URL'si (wss://...)

### Docker ile Çalıştırma

```bash
docker-compose up -d
```

### Geliştirme Ortamında Çalıştırma

```bash
npm install
npm run dev
```

## API Endpointleri

### Token Oluşturma

```
POST /api/livekit/token
```

İstek gövdesi:
```json
{
  "roomName": "oda-adi",
  "participantName": "katilimci-adi",
  "isTeacher": true
}
```

### Oda Oluşturma

```
POST /api/livekit/room
```

İstek gövdesi:
```json
{
  "roomName": "oda-adi"
}
```

### Oda Varlığını Kontrol Etme

```
GET /api/livekit/room/:roomName/exists
```

### Katılımcıları Listeleme

```
GET /api/livekit/participants/:roomName
```

### Odayı Sonlandırma

```
DELETE /api/livekit/room/:roomName
```

## Frontend Entegrasyonu

Frontend uygulamanızda LiveKit Client kütüphanesini kullanarak bu mikroservise bağlanabilirsiniz. Örnek bir istemci kodu `src/utils/clientExample.ts` dosyasında bulunmaktadır.

### Kurulum

```bash
npm install livekit-client
```

### Kullanım

```typescript
import { connectToRoom, disconnectFromRoom } from './livekitClient';

// Odaya bağlan
const room = await connectToRoom('oda-adi', 'kullanici-adi', true);

// Odadan ayrıl
disconnectFromRoom(room);
```

## Ana Uygulama ile Entegrasyon

Bu mikroservis, ana Postply uygulamasından bağımsız olarak çalışır. Ana uygulama, bu mikroservisin API'lerini kullanarak LiveKit özelliklerine erişebilir.

Mevcut `webrtcService.ts` dosyasını, bu mikroservise istek yapacak şekilde güncelleyin. Örnek bir istemci kodu `src/utils/clientExample.ts` dosyasında bulunmaktadır.
