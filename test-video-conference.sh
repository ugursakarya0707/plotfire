#!/bin/bash

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URL ve endpoint'ler
API_URL="http://localhost:3010/api"
VIDEO_SESSIONS_URL="${API_URL}/video-sessions"
LIVEKIT_PROXY_URL="${API_URL}/livekit-proxy"

# Test verileri
TEACHER_ID="67d615eb3a5e2794a74e9aaf"
STUDENT_ID="67d615eb3a5e2794a74e9ab0"
TEACHER_NAME="Test Öğretmen"
STUDENT_NAME="Test Öğrenci"

# Test başlığını yazdırma fonksiyonu
print_test_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}TEST: $1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

# Başarılı test sonucu
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Başarısız test sonucu
print_error() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

# Bilgi mesajı
print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# 1. Öğrenci olarak video konferans başlatma
test_student_initiate_session() {
  print_test_header "Öğrenci Video Konferans Başlatıyor"
  
  print_info "Öğrenci ${STUDENT_NAME} video konferans başlatıyor..."
  
  RESPONSE=$(curl -s -X POST "${VIDEO_SESSIONS_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"teacherId\": \"${TEACHER_ID}\", \"studentId\": \"${STUDENT_ID}\", \"studentName\": \"${STUDENT_NAME}\"}")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"\"id\""* || $RESPONSE == *"\"_id\""* ]]; then
    print_success "Video konferans başlatıldı!"
    
    # Session ID ve Room Name'i yanıttan çıkar
    SESSION_ID=$(echo $RESPONSE | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    ROOM_NAME=$(echo $RESPONSE | grep -o '"roomName":"[^"]*"' | cut -d'"' -f4)
    STUDENT_TOKEN=$(echo $RESPONSE | grep -o '"studentToken":"[^"]*"' | cut -d'"' -f4)
    
    print_info "Session ID: ${SESSION_ID}"
    print_info "Room Name: ${ROOM_NAME}"
    print_info "Student Token: ${STUDENT_TOKEN}"
    
    # Değerleri global değişkenlere ata
    export SESSION_ID=$SESSION_ID
    export STUDENT_TOKEN=$STUDENT_TOKEN
    export ROOM_NAME=$ROOM_NAME
    
    return 0
  else
    print_error "Video konferans başlatılamadı: ${RESPONSE}"
    return 1
  fi
}

# 2. Öğretmenin bekleyen oturumları kontrol etmesi
test_teacher_pending_sessions() {
  print_test_header "Öğretmen Bekleyen Oturumları Kontrol Ediyor"
  
  print_info "Öğretmen ${TEACHER_ID} bekleyen oturumları kontrol ediyor..."
  
  RESPONSE=$(curl -s -X GET "${LIVEKIT_PROXY_URL}/teacher-sessions/${TEACHER_ID}")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"$SESSION_ID"* || $RESPONSE == *"sessions"* ]]; then
    print_success "Bekleyen oturumlar başarıyla alındı"
    print_info "Yanıt: ${RESPONSE}"
    return 0
  else
    print_error "Bekleyen oturumlar alınamadı: ${RESPONSE}"
    return 1
  fi
}

# 3. Öğretmenin oturuma katılması
test_teacher_join_session() {
  print_test_header "Öğretmen Oturuma Katılıyor"
  
  print_info "Öğretmen ${TEACHER_NAME} oturuma katılıyor..."
  print_info "Session ID: ${SESSION_ID}, Room Name: ${ROOM_NAME}"
  
  # URL encode edilmiş parametreler
  ENCODED_TEACHER_NAME=$(echo -n "${TEACHER_NAME}" | sed 's/ /%20/g')
  
  # Gerçek uygulamada roomName olarak sessionId kullanılıyor
  RESPONSE=$(curl -s -X PUT "${VIDEO_SESSIONS_URL}/${SESSION_ID}/start?teacherName=${ENCODED_TEACHER_NAME}&roomName=${SESSION_ID}")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"success"* || $RESPONSE == *"token"* || $RESPONSE == *"roomToken"* ]]; then
    print_success "Öğretmen oturuma başarıyla katıldı"
    print_info "Yanıt: ${RESPONSE}"
    
    # Öğretmen token'ını al - önce token alanını dene
    TEACHER_TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [[ -n "$TEACHER_TOKEN" ]]; then
      print_success "Öğretmen token'ı başarıyla alındı"
      print_info "Öğretmen Token: ${TEACHER_TOKEN}"
      
      # Token'ı global değişkene ata
      export TEACHER_TOKEN=$TEACHER_TOKEN
      
      return 0
    else
      # Alternatif token alanını kontrol et (roomToken)
      TEACHER_TOKEN=$(echo $RESPONSE | grep -o '"roomToken":"[^"]*"' | head -1 | cut -d'"' -f4)
      
      if [[ -n "$TEACHER_TOKEN" ]]; then
        print_success "Öğretmen token'ı başarıyla alındı (roomToken alanından)"
        print_info "Öğretmen Token: ${TEACHER_TOKEN}"
        export TEACHER_TOKEN=$TEACHER_TOKEN
        return 0
      fi
      
      print_error "Öğretmen token'ı alınamadı"
      return 1
    fi
  else
    print_info "Yanıt: ${RESPONSE}"
    print_error "Öğretmen oturuma katılamadı: ${RESPONSE}"
    return 1
  fi
}

# 4. Oturum detaylarını kontrol etme
test_session_details() {
  print_test_header "Oturum Detayları Kontrol Ediliyor"
  
  print_info "Session ID: ${SESSION_ID}"
  
  RESPONSE=$(curl -s -X GET "${VIDEO_SESSIONS_URL}/${SESSION_ID}")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"$SESSION_ID"* ]]; then
    print_success "Oturum detayları başarıyla alındı"
    
    # Oda adını al
    ROOM_NAME=$(echo $RESPONSE | grep -o '"roomName":"[^"]*"' | sed 's/"roomName":"//g' | sed 's/"//g')
    print_info "Oturum Oda Adı: ${ROOM_NAME}"
    
    # Oturum durumunu kontrol et
    SESSION_STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*"' | sed 's/"status":"//g' | sed 's/"//g')
    
    if [[ "$SESSION_STATUS" == "ACTIVE" ]]; then
      print_success "Oturum durumu ACTIVE olarak ayarlanmış"
    else
      print_info "Oturum durumu: $SESSION_STATUS"
    fi
    
    return 0
  else
    print_error "Oturum detayları alınamadı: $RESPONSE"
    return 1
  fi
}

# 5. LiveKit odasını kontrol etme
test_livekit_room_exists() {
  print_test_header "LiveKit Odası Kontrol Ediliyor"
  
  print_info "Room Name: ${ROOM_NAME}"
  
  RESPONSE=$(curl -s -X GET "${LIVEKIT_PROXY_URL}/room/${ROOM_NAME}/exists")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"true"* ]]; then
    print_success "LiveKit odası başarıyla oluşturuldu"
    return 0
  else
    print_error "LiveKit odası bulunamadı: $RESPONSE"
    return 1
  fi
}

# 6. Öğretmenin doğrudan token alması
test_teacher_direct_token() {
  print_test_header "Öğretmen Doğrudan Token Alıyor"
  
  print_info "Öğretmen ${TEACHER_NAME} için doğrudan token alınıyor..."
  
  RESPONSE=$(curl -s -X POST "${LIVEKIT_PROXY_URL}/token" \
    -H "Content-Type: application/json" \
    -d "{\"roomName\": \"${ROOM_NAME}\", \"participantName\": \"${TEACHER_NAME}\", \"isTeacher\": true}")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"token"* ]]; then
    print_success "Öğretmen için doğrudan token başarıyla alındı"
    
    # Doğrudan alınan token'ı kaydet
    DIRECT_TEACHER_TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | sed 's/"token":"//g' | sed 's/"//g')
    
    if [[ -n "$DIRECT_TEACHER_TOKEN" ]]; then
      print_success "Doğrudan token başarıyla alındı"
      export DIRECT_TEACHER_TOKEN=$DIRECT_TEACHER_TOKEN
      
      # İki token'ın aynı olup olmadığını kontrol et
      if [[ "$DIRECT_TEACHER_TOKEN" == "$TEACHER_TOKEN" ]]; then
        print_info "Doğrudan alınan token ile oturum token'ı aynı"
      else
        print_info "Doğrudan alınan token ile oturum token'ı farklı (bu normal olabilir)"
      fi
    else
      print_error "Doğrudan token alınamadı"
    fi
    
    return 0
  else
    print_error "Öğretmen için doğrudan token alınamadı: $RESPONSE"
    return 1
  fi
}

# 7. Katılımcıları kontrol etme
test_room_participants() {
  print_test_header "Oda Katılımcıları Kontrol Ediliyor"
  
  print_info "Oda ${ROOM_NAME} katılımcıları kontrol ediliyor..."
  
  RESPONSE=$(curl -s -X GET "${LIVEKIT_PROXY_URL}/participants/${ROOM_NAME}")
  
  # Yanıt kontrolü
  if [[ $RESPONSE == *"participants"* ]]; then
    print_success "Oda katılımcıları başarıyla alındı"
    
    # Katılımcı sayısını al
    PARTICIPANT_COUNT=$(echo $RESPONSE | grep -o '"identity"' | wc -l)
    print_info "Odadaki katılımcı sayısı: ${PARTICIPANT_COUNT}"
    
    # Öğretmen ve öğrenci katılımcılarını kontrol et
    if [[ $RESPONSE == *"$TEACHER_NAME"* ]]; then
      print_success "Öğretmen odada bulunuyor"
    else
      print_info "Öğretmen henüz odada değil"
    fi
    
    if [[ $RESPONSE == *"$STUDENT_NAME"* ]]; then
      print_success "Öğrenci odada bulunuyor"
    else
      print_info "Öğrenci henüz odada değil"
    fi
    
    return 0
  else
    print_info "Oda katılımcıları alınamadı veya oda boş: $RESPONSE"
    return 0
  fi
}

# 8. Token'ları doğrulama
test_validate_tokens() {
  print_test_header "Token'lar Doğrulanıyor"
  
  # Öğrenci token kontrolü
  print_info "Öğrenci Token Kontrolü"
  
  # Token'ı parçalara ayır
  IFS='.' read -r STUDENT_TOKEN_HEADER STUDENT_TOKEN_PART STUDENT_TOKEN_SIG <<< "$STUDENT_TOKEN"
  
  # Token içeriğini decode et
  print_info "Öğrenci token içeriği kontrol ediliyor..."
  STUDENT_TOKEN_PAYLOAD=$(echo $STUDENT_TOKEN_PART | base64 -d 2>/dev/null)
  
  # Öğrenci token'ında roomAdmin false olmalı
  if echo $STUDENT_TOKEN_PAYLOAD | grep -q '"roomAdmin":false'; then
    print_success "Öğrenci token'ında roomAdmin değeri doğru"
  else
    print_error "Öğrenci token'ında roomAdmin değeri false olmalı"
  fi
  
  # Öğrenci token'ında isTeacher false olmalı
  if echo $STUDENT_TOKEN_PAYLOAD | grep -q 'isTeacher.*false'; then
    print_success "Öğrenci token'ında isTeacher değeri doğru"
  else
    print_error "Öğrenci token'ında isTeacher değeri false olmalı"
  fi
  
  # Öğretmen token kontrolü
  print_info "Öğretmen Token Kontrolü"
  
  # Token'ı parçalara ayır
  IFS='.' read -r TEACHER_TOKEN_HEADER TEACHER_TOKEN_PART TEACHER_TOKEN_SIG <<< "$TEACHER_TOKEN"
  
  # Token içeriğini decode et
  TEACHER_TOKEN_PAYLOAD=$(echo $TEACHER_TOKEN_PART | base64 -d 2>/dev/null)
  
  print_info "Öğretmen token içeriği:"
  echo "$TEACHER_TOKEN_PAYLOAD" | grep "metadata"
  
  # Öğretmen token'ında roomAdmin true olmalı
  if echo $TEACHER_TOKEN_PAYLOAD | grep -q '"roomAdmin":true'; then
    print_success "Öğretmen token'ında roomAdmin değeri doğru"
  else
    print_error "Öğretmen token'ında roomAdmin değeri true olmalı"
  fi
  
  # Öğretmen token'ında isTeacher true olmalı - metadata içinde string olarak arama yap
  if echo $TEACHER_TOKEN_PAYLOAD | grep -q 'isTeacher.*true'; then
    print_success "Öğretmen token'ında isTeacher değeri doğru"
  else
    print_error "Öğretmen token'ında isTeacher değeri true olmalı"
  fi
  
  # Öğretmen token'ında roomCreate true olmalı
  if echo $TEACHER_TOKEN_PAYLOAD | grep -q '"roomCreate":true'; then
    print_success "Öğretmen token'ında roomCreate değeri doğru"
  else
    print_error "Öğretmen token'ında roomCreate değeri true olmalı"
  fi
  
  # Öğretmen token'ında canPublish true olmalı
  if echo $TEACHER_TOKEN_PAYLOAD | grep -q '"canPublish":true'; then
    print_success "Öğretmen token'ında canPublish değeri doğru"
  else
    print_error "Öğretmen token'ında canPublish değeri true olmalı"
  fi
  
  print_success "Token doğrulama tamamlandı"
}

# Tüm testleri çalıştır
run_all_tests() {
  echo -e "${BLUE}Video Konferans Sistemi Test Senaryosu${NC}"
  
  test_student_initiate_session
  test_teacher_pending_sessions
  test_teacher_join_session
  test_session_details
  test_livekit_room_exists
  test_teacher_direct_token
  test_room_participants
  test_validate_tokens
  
  echo -e "\n${GREEN}========================================${NC}"
  echo -e "${GREEN}TÜM TESTLER BAŞARIYLA TAMAMLANDI${NC}"
  echo -e "${GREEN}========================================${NC}"
}

# Ana fonksiyonu çağır
run_all_tests
