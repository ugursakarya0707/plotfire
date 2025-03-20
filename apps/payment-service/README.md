# Payment Service

Bu mikroservis, Postply uygulamasında öğrencilerin video konferansları ve rezervasyonlar için ödeme yapabilmelerini sağlar.

## Özellikler

- Video konferansları için ödeme işlemi
- Rezervasyonlar için ödeme işlemi
- Stripe entegrasyonu
- JWT tabanlı kimlik doğrulama
- Kubernetes ve Docker desteği
- Stripe Webhook işlevselliği ile ödeme durumu güncellemeleri

## Kurulum

### Gereksinimler

- Node.js (v14+)
- MongoDB
- Stripe hesabı ve API anahtarları

### Ortam Değişkenleri

Servisin çalışması için aşağıdaki ortam değişkenlerini ayarlamanız gerekmektedir:

```
PORT=3007
MONGODB_URI=mongodb://localhost:27017/payment-service
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## Geliştirme

### Yerel Ortamda Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run start:dev
```

### Docker ile Çalıştırma

```bash
# Docker imajını oluştur
docker build -t payment-service .

# Docker Compose ile çalıştır
docker-compose up
```

## Webhook İşlevselliği

Payment Service, Stripe'dan gelen webhook olaylarını işleyerek ödeme durumlarını otomatik olarak günceller. Desteklenen webhook olayları:

- `payment_intent.succeeded`: Ödeme başarıyla tamamlandığında
- `payment_intent.payment_failed`: Ödeme başarısız olduğunda
- `charge.refunded`: Ödeme iade edildiğinde

### Webhook Test Etme

Yerel geliştirme ortamında webhook'ları test etmek için Stripe CLI kullanabilirsiniz:

1. [Stripe CLI](https://stripe.com/docs/stripe-cli) indirin ve kurun
2. Stripe hesabınıza giriş yapın:
   ```bash
   stripe login
   ```
3. Webhook'ları yerel ortamınıza yönlendirin:
   ```bash
   stripe listen --forward-to http://localhost:3007/api/webhooks/stripe
   ```
4. Stripe CLI size bir webhook signing secret verecektir, bunu `.env` dosyanızdaki `STRIPE_WEBHOOK_SECRET` değişkenine atayın
5. Test olayları tetiklemek için:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## API Endpoints

### Ödeme İşlemleri

- `POST /api/payments/video-conference`: Video konferansı için ödeme oluştur
- `POST /api/payments/reservation`: Rezervasyon için ödeme oluştur
- `GET /api/payments`: Kullanıcının ödemelerini listele
- `GET /api/payments/:id`: Belirli bir ödemenin detaylarını görüntüle

### Sağlık Kontrolü

- `GET /api/health`: Servisin sağlık durumunu kontrol et

### Webhook

- `POST /api/webhooks/stripe`: Stripe webhook olaylarını işler (JWT doğrulaması gerektirmez)

## Entegrasyon

Bu servis, aşağıdaki servislerle entegre çalışır:

- Auth Service: Kullanıcı kimlik doğrulaması için
- Teacher Conference Service: Video konferansları ve rezervasyonlar için
- Frontend: Ödeme işlemlerini başlatmak ve sonuçları göstermek için

## Güvenlik

- Tüm API endpoint'leri JWT ile korunmaktadır (sağlık kontrolü hariç)
- Stripe ödemeleri güvenli bir şekilde işlenir
- Hassas bilgiler (API anahtarları, JWT secret) ortam değişkenleri veya Kubernetes secret'leri ile saklanır
