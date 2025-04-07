# Video Konferans API Dokümantasyonu

Bu dokümantasyon, video konferans sistemi için mevcut API endpoint'lerini ve kullanım şekillerini içermektedir.

## Video Oturumları API

### Oturum Oluşturma

**Endpoint:** `POST /api/video-sessions`

**Açıklama:** Yeni bir video konferans oturumu oluşturur.

**İstek Gövdesi:**
```json
{
  "teacherId": "string",
  "studentId": "string",
  "studentName": "string"
}
```

**Başarılı Yanıt:**
```json
{
  "id": "string",
  "roomName": "string",
  "status": "WAITING",
  "isActive": true,
  "teacherId": "string",
  "studentId": "string",
  "roomToken": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Oturum Durumunu Güncelleme

**Endpoint:** `PUT /api/video-sessions/:sessionId/status`

**Açıklama:** Belirli bir oturumun durumunu günceller.

**İstek Gövdesi:**
```json
{
  "status": "string" // WAITING, ACTIVE, COMPLETED, CANCELLED
}
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "string",
  "roomExists": boolean
}
```

### Oturum Bilgisini Getirme

**Endpoint:** `GET /api/video-sessions/:sessionId`

**Açıklama:** Belirli bir oturumun bilgilerini getirir.

**Başarılı Yanıt:**
```json
{
  "id": "string",
  "roomName": "string",
  "participants": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "status": "string",
      "streamUrl": "string"
    }
  ],
  "status": "string",
  "isActive": boolean,
  "roomToken": "string",
  "teacherId": "string",
  "studentId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Öğretmen İçin Bekleyen Oturumları Getirme

**Endpoint:** `GET /api/video-sessions/teacher/:teacherId/pending`

**Açıklama:** Belirli bir öğretmen için bekleyen oturumları getirir.

**Sorgu Parametreleri:**
- `force` (isteğe bağlı): Eğer true ise, MCP'den bekleyen oturumları zorla yeniler.

**Başarılı Yanıt:**
```json
[
  {
    "id": "string",
    "teacherId": "string",
    "status": "WAITING",
    "timestamp": "string",
    "action": "string",
    "isActive": boolean
  }
]
```

### Öğretmene Oturum Hakkında Bildirim Gönderme

**Endpoint:** `POST /api/video-sessions/notify-teacher`

**Açıklama:** Öğretmene yeni bir oturum hakkında bildirim gönderir.

**İstek Gövdesi:**
```json
{
  "teacherId": "string",
  "sessionId": "string",
  "action": "string" // student_joined, student_left, vb.
}
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "string",
  "timestamp": "string"
}
```

## LiveKit Proxy API

### Token Oluşturma

**Endpoint:** `POST /api/livekit-proxy/token`

**Açıklama:** Belirli bir oda ve katılımcı için LiveKit token'ı oluşturur.

**İstek Gövdesi:**
```json
{
  "roomName": "string",
  "participantName": "string",
  "isTeacher": boolean
}
```

**Başarılı Yanıt:**
```json
{
  "token": "string"
}
```

### Öğretmene Bildirim Gönderme

**Endpoint:** `POST /api/livekit-proxy/notify-teacher`

**Açıklama:** Öğretmene yeni bir oturum hakkında bildirim gönderir.

**İstek Gövdesi:**
```json
{
  "teacherId": "string",
  "sessionId": "string",
  "action": "string" // student_joined, student_left, vb.
}
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "string",
  "timestamp": "string"
}
```

### Öğrenci Oturumunu Kaydetme

**Endpoint:** `POST /api/livekit-proxy/register-student-session`

**Açıklama:** Öğrenci oturumunu kaydeder ve öğretmene bildirim gönderir.

**İstek Gövdesi:**
```json
{
  "sessionId": "string",
  "teacherId": "string",
  "studentId": "string",
  "studentName": "string",
  "action": "string" // student_joined, student_left, vb.
}
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "string",
  "sessionId": "string",
  "status": "string"
}
```

### Oda Varlığını Kontrol Etme

**Endpoint:** `GET /api/livekit-proxy/room/:roomId/exists`

**Açıklama:** Belirli bir odanın varlığını kontrol eder.

**Başarılı Yanıt:**
```json
{
  "exists": boolean,
  "roomId": "string"
}
```

### Oda Katılımcılarını Getirme

**Endpoint:** `GET /api/livekit-proxy/participants/:roomId`

**Açıklama:** Belirli bir odadaki katılımcıları getirir.

**Başarılı Yanıt:**
```json
{
  "participants": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "status": "string",
      "streamUrl": "string"
    }
  ],
  "roomId": "string"
}
```

### Aktif Odaları Listeleme

**Endpoint:** `GET /api/livekit-proxy/active-rooms`

**Açıklama:** Tüm aktif odaları ve katılımcılarını listeler.

**Başarılı Yanıt:**
```json
[
  {
    "name": "string",
    "participants": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "status": "string",
        "streamUrl": "string"
      }
    ]
  }
]
```

## MCP API

### Öğretmen İçin Bekleyen Oturumları Güncelleme

**Endpoint:** `PUT /api/mcp/teachers/:teacherId/pending-sessions`

**Açıklama:** Belirli bir öğretmen için bekleyen oturumları günceller.

**İstek Gövdesi:**
```json
{
  "pendingSessions": [
    {
      "_id": "string",
      "id": "string",
      "teacherId": "string",
      "status": "string",
      "timestamp": "string",
      "action": "string",
      "isActive": boolean
    }
  ]
}
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "string"
}
```

### Öğretmen İçin Bekleyen Oturumları Getirme

**Endpoint:** `GET /api/mcp/teachers/:teacherId/pending-sessions`

**Açıklama:** Belirli bir öğretmen için bekleyen oturumları getirir.

**Başarılı Yanıt:**
```json
[
  {
    "_id": "string",
    "id": "string",
    "teacherId": "string",
    "status": "string",
    "timestamp": "string",
    "action": "string",
    "isActive": boolean
  }
]
```

## Hata Yönetimi

Tüm API endpoint'leri, hata durumunda aşağıdaki formatta bir yanıt döndürür:

```json
{
  "statusCode": number,
  "message": "string",
  "error": "string"
}
```

## Notlar

1. Webhook ve SSE mekanizmasından polling mekanizmasına geçiş yapıldığı için, bazı API endpoint'leri kaldırılmış veya değiştirilmiş olabilir.
2. Frontend'deki bildirim fonksiyonları, birden fazla endpoint'i sırayla deneyerek, birisi başarısız olsa bile diğerlerini denemeye devam eder.
3. Eksik endpoint'lere yapılan çağrılar için 404 hatası döndürülür.
