# LiveKit Webhook Yapılandırması

Bu dokümantasyon, LiveKit Cloud'da webhook yapılandırmasını nasıl yapacağınızı açıklar.

## Genel Bakış

Postply uygulaması, öğretmenin bir video konferans oturumuna katıldığını öğrencilere gerçek zamanlı olarak bildirmek için LiveKit'in webhook özelliğini kullanır. Bu, eski polling mekanizmasının yerini alarak daha verimli ve anında bildirim sağlar.

## Webhook Yapılandırma Adımları

1. [LiveKit Cloud Dashboard](https://cloud.livekit.io)'a giriş yapın.
2. Projelerinizden birini seçin.
3. Sol menüden "Webhooks" seçeneğine tıklayın.
4. "Add Webhook" butonuna tıklayın.
5. Aşağıdaki bilgileri girin:
   - **URL**: `https://[YOUR_DOMAIN]/api/livekit-webhook` (Geliştirme ortamında: `http://localhost:3000/api/livekit-webhook`)
   - **Secret**: Güvenli bir secret oluşturun veya mevcut API secret'ınızı kullanın
   - **Events**: Aşağıdaki olayları seçin:
     - `room.created`
     - `room.finished`
     - `participant.joined`
     - `participant.left`

## Webhook Güvenliği

Webhook isteklerinin güvenliğini sağlamak için LiveKit, her isteği bir HMAC imzası ile imzalar. Backend'imiz bu imzayı doğrular ve yalnızca geçerli istekleri kabul eder.

## Webhook Olayları

Backend'imiz şu anda aşağıdaki olayları işler:

- `participant.joined`: Bir katılımcı odaya katıldığında tetiklenir. Eğer katılan kişi bir öğretmense, tüm öğrencilere bildirim gönderilir.
- `room.started`: Oda başladığında tetiklenir (henüz kullanılmıyor).
- `room.finished`: Oda bittiğinde tetiklenir (henüz kullanılmıyor).

## Yerel Geliştirme için Webhook Testi

Yerel geliştirme ortamında webhook'ları test etmek için:

1. [ngrok](https://ngrok.com/) veya benzer bir tünel hizmeti kullanın:
   ```
   ngrok http 3000
   ```

2. LiveKit Cloud'da webhook URL'sini ngrok tarafından sağlanan URL ile güncelleyin:
   ```
   https://[YOUR_NGROK_SUBDOMAIN].ngrok.io/api/livekit-webhook
   ```

3. Webhook olaylarını manuel olarak test etmek için LiveKit CLI kullanabilirsiniz:
   ```
   livekit-cli webhook:simulate --url https://[YOUR_NGROK_SUBDOMAIN].ngrok.io/api/livekit-webhook --secret [YOUR_SECRET] --event participant.joined
   ```

## SSE (Server-Sent Events) Entegrasyonu

Webhook'lar aracılığıyla alınan olaylar, SSE kullanılarak frontend'e iletilir. Frontend, `/api/notifications/sse/:sessionId` endpoint'ine bağlanarak öğretmenin katılımını dinler.

## Sorun Giderme

1. **Webhook Çağrıları Alınmıyor**: LiveKit Cloud'daki webhook yapılandırmasını kontrol edin ve URL'nin doğru olduğundan emin olun.

2. **İmza Doğrulama Hatası**: Webhook secret'ının LiveKit Cloud'da yapılandırılan ile aynı olduğundan emin olun.

3. **SSE Bağlantısı Kurulamıyor**: CORS yapılandırmasını kontrol edin ve tarayıcı konsolunda hata olup olmadığını inceleyin.

## Yedek Mekanizma

Webhook veya SSE bağlantısı başarısız olursa, frontend otomatik olarak bir yedek mekanizmaya geçer ve LiveKit Room State API'sini kullanarak öğretmenin odada olup olmadığını düzenli aralıklarla kontrol eder.
