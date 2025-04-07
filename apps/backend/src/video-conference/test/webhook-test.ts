/**
 * LiveKit Webhook ve SSE test betiği
 * 
 * Bu betik, webhook olaylarını simüle eder ve SSE bağlantılarını test eder.
 * Gerçek bir webhook çağrısı yapmadan webhook controller'ı test etmek için kullanılabilir.
 */

import { createHmac } from 'crypto';

// Webhook imzası oluşturma fonksiyonu
function createWebhookSignature(payload: any, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

// Öğretmen katılım olayı simülasyonu
async function simulateTeacherJoinEvent(apiUrl: string, secret: string) {
  const roomName = 'test-room-' + Date.now();
  const teacherId = 'teacher-' + Date.now();
  
  // Örnek payload
  const payload = {
    event: 'participant_joined',
    room: {
      name: roomName,
      sid: 'RM_' + roomName,
      emptyTimeout: 300,
      creationTime: new Date().toISOString(),
      metadata: JSON.stringify({
        teacherId,
        sessionId: roomName
      })
    },
    participant: {
      identity: 'teacher-' + teacherId,
      name: 'Test Teacher',
      sid: 'PA_' + teacherId,
      metadata: JSON.stringify({
        isTeacher: true,
        teacherId
      }),
      state: 'ACTIVE',
      joinedAt: new Date().toISOString()
    }
  };
  
  // İmza oluştur
  const signature = createWebhookSignature(payload, secret);
  
  try {
    console.log(`Simulating teacher join event for room ${roomName}...`);
    
    // Webhook endpoint'ine POST isteği gönder
    const response = await fetch(`${apiUrl}/livekit-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signature}`
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Webhook simulation successful:', data);
      return { roomName, success: true };
    } else {
      console.error('Webhook simulation failed:', await response.text());
      return { roomName, success: false };
    }
  } catch (error) {
    console.error('Error simulating webhook:', error);
    return { roomName, success: false, error };
  }
}

// SSE bağlantısını test et
async function testSseConnection(apiUrl: string, sessionId: string) {
  try {
    console.log(`Testing SSE connection for session ${sessionId}...`);
    
    // EventSource'u simüle et
    const response = await fetch(`${apiUrl}/notifications/sse/${sessionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream'
      }
    });
    
    if (response.ok) {
      console.log('SSE connection successful');
      return { success: true };
    } else {
      console.error('SSE connection failed:', await response.text());
      return { success: false };
    }
  } catch (error) {
    console.error('Error testing SSE connection:', error);
    return { success: false, error };
  }
}

// Test fonksiyonu
async function runTests() {
  const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
  const secret = process.env.WEBHOOK_SECRET || 'test-secret';
  
  console.log('Starting webhook and SSE tests...');
  
  // 1. Webhook testi
  const webhookResult = await simulateTeacherJoinEvent(apiUrl, secret);
  
  if (webhookResult.success) {
    // 2. SSE testi
    const sseResult = await testSseConnection(apiUrl, webhookResult.roomName);
    
    if (sseResult.success) {
      console.log('All tests passed successfully!');
    } else {
      console.error('SSE test failed');
    }
  } else {
    console.error('Webhook test failed');
  }
}

// Ana fonksiyon
if (require.main === module) {
  runTests().catch(console.error);
}

export { simulateTeacherJoinEvent, testSseConnection, runTests };
