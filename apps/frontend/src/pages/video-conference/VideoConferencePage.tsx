import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  CallEnd as CallEndIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import {
  getVideoSession,
  endVideoSession,
  joinVideoSessionAsTeacher,
  joinVideoSessionAsStudent,
  getActiveSessionDetails,
} from '../../services/videoConferenceService';
import { UserType } from '../../types/user';
import {
  getLiveKitParticipants,
  endLiveKitSession,
  toggleCamera as toggleCameraService,
  toggleMicrophone as toggleMicrophoneService,
  initializeLiveKitSession
} from '../../services/webrtcService';

// Video konferans sayfası
const VideoConferencePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State değişkenleri
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [participants, setParticipants] = useState<any[]>([]);
  const [token, setToken] = useState<string>('');

  // Video referansları
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // Kaynakları temizle - İlk olarak tanımlayalım
  const cleanupResources = useCallback(() => {
    // Polling mekanizmasını durdur
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Video elementlerini temizle
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.src = '';
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.src = '';
    }
  }, []);

  // Görüşmeyi sonlandır - İkinci olarak tanımlayalım
  const endCall = useCallback(async () => {
    try {
      // Kaynakları temizle
      cleanupResources();
      
      // Öğretmen ise oturumu sonlandır
      if (user?.userType === UserType.TEACHER && sessionId) {
        try {
          // Video oturumunu sonlandır
          await endVideoSession(sessionId);
          
          // LiveKit oturumunu sonlandır
          await endLiveKitSession(sessionId);
          
          console.log('Session ended successfully');
        } catch (error) {
          console.error('Error ending video session:', error);
        }
      }
      
      // Dashboard'a yönlendir
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending call:', error);
      // Hata olsa bile dashboard'a yönlendir
      navigate('/dashboard');
    }
  }, [sessionId, user, navigate, cleanupResources]);

  // Medya akışlarını kur
  const setupMediaStreams = useCallback(async () => {
    try {
      // Yerel video akışı için getUserMedia kullan
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Yerel video elementine bağla
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Kamera ve mikrofon durumunu ayarla
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        videoTrack.enabled = cameraEnabled;
      }
      
      if (audioTrack) {
        audioTrack.enabled = micEnabled;
      }
      
      setConnectionStatus('connected');
      localStream.current = stream;
    } catch (error) {
      console.error('Error setting up media streams:', error);
      setError('Kamera ve mikrofon erişimi sağlanamadı');
      setCameraEnabled(false);
      setMicEnabled(false);
    }
  }, [cameraEnabled, micEnabled]);

  // Polling mekanizması
  const startPolling = useCallback(() => {
    if (!sessionId || !user) return;
    
    console.log('Starting polling for session status and participants');
    
    // Her 5 saniyede bir oturum durumunu ve katılımcıları kontrol et
    const intervalId = setInterval(async () => {
      try {
        // Önce oturum durumunu kontrol et
        const sessionData = await getVideoSession(sessionId);
        console.log('Polling - Session status:', sessionData.status, 'isActive:', sessionData.isActive);
        
        // Oturum durumunu güncelle
        setSessionActive(sessionData.status === 'ACTIVE' || sessionData.isActive === true);
        
        // Oturum aktif hale geldiyse ve öğrenci ise, token almayı dene
        if ((sessionData.status === 'ACTIVE' || sessionData.isActive === true) && 
            user.userType !== UserType.TEACHER && 
            !token) {
          console.log('Session is now ACTIVE, student attempting to join');
          try {
            const userName = user.firstName 
              ? `${user.firstName} ${user.lastName || ''}`
              : user.email?.split('@')[0] || `Kullanıcı-${user.id || 'unknown'}`;
            
            // Önce oturumu aktif olarak işaretle (backend'e bildir)
            await getActiveSessionDetails(sessionId);
            
            const studentToken = await joinVideoSessionAsStudent(sessionId, userName);
            console.log('Student token received:', studentToken ? 'Yes' : 'No');
            if (studentToken) {
              localStorage.setItem(`videoSession_${sessionId}_token`, studentToken);
              setToken(studentToken);
              setSessionActive(true);
            }
          } catch (error) {
            console.error('Error joining as student during polling:', error);
            // 10 saniye sonra tekrar dene
            setTimeout(() => {
              console.log('Retrying student join after error...');
            }, 10000);
          }
        }
        
        // Katılımcı bilgilerini al - Her polling'de değil, sadece belirli aralıklarla
        if (Date.now() % 2 === 0) { // Yaklaşık olarak her iki polling'de bir
          try {
            const participantsData = await getLiveKitParticipants(sessionId);
            console.log('Participants data:', participantsData);
            setParticipants(participantsData || []);
            
            // Uzak video akışını güncelle
            if (remoteVideoRef.current && participantsData && participantsData.length > 0) {
              // Backend'den gelen stream URL'ini kullan
              const remoteParticipant = participantsData.find(p => 
                (user?.userType === UserType.TEACHER && p.type === 'student') ||
                (user?.userType !== UserType.TEACHER && p.type === 'teacher')
              );
              
              if (remoteParticipant && remoteParticipant.streamUrl) {
                // HTML video elementinde srcObject veya src kullanımı
                if ('srcObject' in HTMLVideoElement.prototype) {
                  // Modern tarayıcılar için
                  // Not: Gerçek uygulamada, MediaStream nesnesi gerekir
                  // Bu örnek için, sadece URL'i gösteriyoruz
                  console.log('Remote participant stream URL:', remoteParticipant.streamUrl);
                } else {
                  // Eski tarayıcılar için
                  remoteVideoRef.current.src = remoteParticipant.streamUrl;
                }
              }
            }
          } catch (error) {
            console.error('Error getting participants:', error);
            // Hata durumunda boş dizi kullan
            setParticipants([]);
          }
        }
        
        // Oturum sonlandıysa
        if (participants.some(p => p.status === 'ended')) {
          console.log('Session ended by remote participant');
          endCall();
        }
      } catch (error) {
        console.error('Error polling session status and participants:', error);
      }
    }, 5000);
    
    // Interval'i ref'e kaydet
    pollingIntervalRef.current = intervalId;
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sessionId, user, endCall, remoteVideoRef, token, participants]);

  // Kamera durumunu değiştir
  const toggleCamera = async () => {
    try {
      setCameraEnabled(!cameraEnabled);
      
      if (sessionId) {
        // LiveKit servisi üzerinden kamera durumunu değiştir
        await toggleCameraService(!cameraEnabled);
        console.log(`Camera ${!cameraEnabled ? 'enabled' : 'disabled'}`);
        
        // Yerel video akışını güncelle
        if (localVideoRef.current && localStream.current) {
          const videoTracks = localStream.current.getVideoTracks();
          videoTracks.forEach(track => {
            track.enabled = !cameraEnabled;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      // Hata durumunda eski duruma geri dön
      setCameraEnabled(cameraEnabled);
    }
  };

  // Mikrofon durumunu değiştir
  const toggleMicrophone = async () => {
    try {
      setMicEnabled(!micEnabled);
      
      if (sessionId) {
        // LiveKit servisi üzerinden mikrofon durumunu değiştir
        await toggleMicrophoneService(!micEnabled);
        console.log(`Microphone ${!micEnabled ? 'enabled' : 'disabled'}`);
        
        // Yerel ses akışını güncelle
        if (localStream.current) {
          const audioTracks = localStream.current.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = !micEnabled;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      // Hata durumunda eski duruma geri dön
      setMicEnabled(micEnabled);
    }
  };

  // Video oturumunu başlat - Son olarak tanımlayalım
  const startSession = useCallback(async () => {
    try {
      if (!sessionId || !user) return;
      
      setLoading(true);
      setError('');
      
      // Kullanıcı adını belirle
      const userName = user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`
        : user.email?.split('@')[0] || `Kullanıcı-${user.id || 'unknown'}`;
      
      console.log(`Session data:`, sessionId);
      
      // Kullanıcı tipine göre farklı katılma akışları
      if (user.userType === UserType.TEACHER) {
        console.log('Teacher attempting to join with name:', userName);
        
        try {
          // Öğretmen olarak katıl
          const updatedSession = await joinVideoSessionAsTeacher(sessionId, userName);
          console.log('Teacher joined successfully:', updatedSession);
          
          // Token'ı localStorage'a kaydet ve state'e ata
          if (updatedSession.roomToken) {
            localStorage.setItem(`videoSession_${sessionId}_token`, updatedSession.roomToken);
            setToken(updatedSession.roomToken);
            setSessionActive(true);
            
            // LiveKit bağlantısını başlat
            await initializeLiveKitSession(sessionId, userName, true);
          } else {
            throw new Error('No token received from server');
          }
        } catch (error: any) {
          console.error('Error joining as teacher:', error);
          
          // Eğer oturum zaten aktifse, token'ı almaya çalış
          if (error.message && error.message.includes('already')) {
            console.log('Session is already active, trying to get session details');
            
            try {
              const activeSession = await getActiveSessionDetails(sessionId);
              console.log('Active session details:', activeSession);
              
              if (activeSession.roomToken) {
                localStorage.setItem(`videoSession_${sessionId}_token`, activeSession.roomToken);
                setToken(activeSession.roomToken);
                setSessionActive(true);
                
                // LiveKit bağlantısını başlat
                await initializeLiveKitSession(sessionId, userName, true);
              } else {
                throw new Error('No token in active session');
              }
            } catch (detailsError) {
              console.error('Error getting active session details:', detailsError);
              setError('Oturum başlatılamadı. Lütfen tekrar deneyin.');
            }
          } else {
            setError(`Oturum başlatılamadı: ${error.message}`);
          }
        }
      } else {
        // Öğrenci olarak katıl
        console.log('Session is active, student attempting to join with name:', userName);
        
        try {
          // Öğrenci olarak katıl
          const studentToken = await joinVideoSessionAsStudent(sessionId, userName);
          
          if (studentToken) {
            localStorage.setItem(`videoSession_${sessionId}_token`, studentToken);
            setToken(studentToken);
            setSessionActive(true);
            
            // LiveKit bağlantısını başlat
            await initializeLiveKitSession(sessionId, userName, false);
          } else {
            throw new Error('No token received from server');
          }
        } catch (error: any) {
          console.error('Error getting student token:', error);
          
          if (error.message && error.message.includes('not active')) {
            setError('Öğretmen henüz oturuma katılmadı. Lütfen bekleyin...');
            // Polling ile öğretmenin katılmasını bekle
          } else {
            setError(`Oturuma katılınamadı: ${error.message}`);
          }
        }
      }
      
      // Medya akışlarını ayarla
      await setupMediaStreams();
      
      // Polling başlat
      startPolling();
      
    } catch (error: any) {
      console.error('Error starting session:', error);
      setError(`Oturum başlatılamadı: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user, setupMediaStreams, startPolling]);

  // Sayfa yüklendiğinde oturumu başlat
  useEffect(() => {
    if (sessionId && user) {
      startSession();
    }

    return () => {
      // Temizlik işlemleri
      cleanupResources();
    };
  }, [sessionId, user, cleanupResources, startSession]);

  // Oturum aktif olduğunda medya akışlarını başlat
  useEffect(() => {
    if (sessionActive && sessionId) {
      // Medya akışlarını başlat
      setupMediaStreams();
      // Polling mekanizmasını başlat
      startPolling();
    }
  }, [sessionActive, sessionId, setupMediaStreams, startPolling]);

  // Yükleniyor durumu
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Ana Sayfaya Dön
        </Button>
      </Box>
    );
  }

  // Öğretmen bekleniyor durumu (öğrenci için)
  if (user?.userType !== UserType.TEACHER && !participants.some(p => p.type === 'teacher')) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
          <Typography variant="h5" gutterBottom>
            Öğretmen Bekleniyor
          </Typography>
          <CircularProgress sx={{ my: 2 }} />
          <Typography variant="body1">
            Öğretmen görüşmeye katıldığında otomatik olarak bağlanacaksınız.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Ana görüşme arayüzü
  return (
    <Box sx={{ p: 3 }}>
      {/* Başlık */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" component="h1">
          Video Konferans
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Durum: {connectionStatus === 'connected' ? 'Bağlı' : 'Bağlanıyor...'}
        </Typography>
      </Paper>

      {/* Video alanı */}
      <Grid container spacing={2}>
        {/* Uzak video (karşı taraf) */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: 400,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f0f0f0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#000'
                }}
              />
              {!participants.some(p => 
                (user?.userType === UserType.TEACHER && p.type === 'student') ||
                (user?.userType !== UserType.TEACHER && p.type === 'teacher')
              ) && (
                <Typography
                  variant="body1"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '8px 16px',
                    borderRadius: '4px'
                  }}
                >
                  {user?.userType === UserType.TEACHER ? 'Öğrenci bekleniyor...' : 'Öğretmen bekleniyor...'}
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Yerel video (kendi görüntüsü) */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: 400,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f0f0f0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted={true}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#000'
                }}
              />
              {!cameraEnabled && (
                <Typography
                  variant="body1"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '8px 16px',
                    borderRadius: '4px'
                  }}
                >
                  Kamera kapalı
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Kontrol butonları */}
      <Paper elevation={3} sx={{ p: 2, mt: 2, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          color={cameraEnabled ? 'primary' : 'default'}
          onClick={toggleCamera}
          sx={{ mx: 1 }}
        >
          {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
        <IconButton
          color={micEnabled ? 'primary' : 'default'}
          onClick={toggleMicrophone}
          sx={{ mx: 1 }}
        >
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
        <IconButton color="error" onClick={endCall} sx={{ mx: 1 }}>
          <CallEndIcon />
        </IconButton>
      </Paper>
    </Box>
  );
};

export default VideoConferencePage;
