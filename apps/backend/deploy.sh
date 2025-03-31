#!/bin/bash

# Hata durumunda betiği durdur
set -e

echo "Video Konferans Servisi Deploy İşlemi Başlatılıyor..."

# Docker imajını oluştur
echo "Docker imajı oluşturuluyor..."
docker build -t video-conference-service:latest .

# Kubernetes'e deploy et
echo "Kubernetes'e deploy ediliyor..."
kubectl apply -k ./k8s

echo "LiveKit bağlantısı kontrol ediliyor..."
# LiveKit sunucusunun çalışıp çalışmadığını kontrol et
if kubectl get pods | grep -q "livekit"; then
  echo "LiveKit sunucusu bulundu."
else
  echo "UYARI: LiveKit sunucusu bulunamadı. Lütfen LiveKit'in kurulu olduğundan emin olun."
  echo "LiveKit kurulumu için: https://docs.livekit.io/deploy/kubernetes/"
fi

echo "Video Konferans Servisi başarıyla deploy edildi!"
echo "Servis URL: http://video-conference.postply.local"
