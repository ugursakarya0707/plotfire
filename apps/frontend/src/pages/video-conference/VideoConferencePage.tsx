import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
} from '@mui/icons-material';
import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';
import { 
  getVideoSession, 
  startVideoSession, 
  getStudentToken, 
  completeVideoSession, 
  cancelVideoSession 
} from '../../services/videoConferenceService';
import { getTeacherConferenceById } from '../../services/teacherConferenceService';

interface TeacherInfo {
  name: string; 
}

const VideoConferencePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId || !user) {
        setError('Geçersiz oturum veya kullanıcı bilgisi');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Oturum bilgilerini getir
        const session = await getVideoSession(sessionId);
        setSessionStatus(session.status);
        setRoomName(session.roomName);
        
        // Öğretmen bilgilerini getir
        const teacherData = await getTeacherConferenceById(session.teacherId);
        setTeacherInfo({
          name: teacherData.name || `Öğretmen-${teacherData.id}` 
        });
        
        // Kullanıcı adını güvenli bir şekilde al
        const userName = user.email?.split('@')[0] || `Kullanıcı-${user.id || 'unknown'}`;
        
        // Kullanıcı tipine göre işlem yap
        if (user.userType === UserType.TEACHER) {
          if (session.status === 'waiting') {
            // Öğretmen için oturumu başlat
            const updatedSession = await startVideoSession(
              sessionId,
              teacherData.name || userName,
              'Öğrenci' // Varsayılan öğrenci adı
            );
            setToken(updatedSession.roomToken || '');
          } else if (session.status === 'active') {
            // Aktif oturum için token al
            const updatedSession = await startVideoSession(
              sessionId,
              teacherData.name || userName,
              'Öğrenci' // Varsayılan öğrenci adı
            );
            setToken(updatedSession.roomToken || '');
          }
        } else {
          // Öğrenci için token al
          if (session.status === 'active') {
            const studentToken = await getStudentToken(
              sessionId,
              userName // Güvenli kullanıcı adı
            );
            setToken(studentToken);
          }
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching session data:', error);
        setError(error.message || 'Oturum bilgileri alınamadı');
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, user]);

  const handleStartSession = async () => {
    if (!sessionId || !user || !teacherInfo) return;
    
    try {
      setIsConnecting(true);
      // Kullanıcı adını güvenli bir şekilde al
      const userName = user.email?.split('@')[0] || `Kullanıcı-${user.id || 'unknown'}`;
      
      const updatedSession = await startVideoSession(
        sessionId,
        teacherInfo.name || userName,
        'Öğrenci' // Varsayılan öğrenci adı
      );
      setToken(updatedSession.roomToken || '');
      setSessionStatus('active');
      setIsConnecting(false);
    } catch (error: any) {
      console.error('Error starting session:', error);
      setError(error.message || 'Oturum başlatılamadı');
      setIsConnecting(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    
    try {
      await completeVideoSession(sessionId);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error ending session:', error);
      setError(error.message || 'Oturum sonlandırılamadı');
    }
  };

  const handleCancelSession = async () => {
    if (!sessionId) return;
    
    try {
      await cancelVideoSession(sessionId);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error canceling session:', error);
      setError(error.message || 'Oturum iptal edilemedi');
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Oturum bilgileri yükleniyor...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Geri Dön
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Dashboard'a Dön
          </Button>
          
          <Typography variant="h5" component="h1">
            Video Konferans
          </Typography>
          
          {sessionStatus === 'active' && (
            <Button
              variant="contained"
              color="error"
              startIcon={<CallEndIcon />}
              onClick={handleEndSession}
            >
              Görüşmeyi Sonlandır
            </Button>
          )}
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {sessionStatus === 'waiting' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              {user?.userType === UserType.STUDENT
                ? 'Öğretmenin katılması bekleniyor...'
                : 'Görüşmeyi başlatmak için hazır mısınız?'}
            </Typography>
            
            {user?.userType === UserType.TEACHER && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<CallIcon />}
                onClick={handleStartSession}
                disabled={isConnecting}
                sx={{ mt: 2 }}
              >
                {isConnecting ? 'Bağlanıyor...' : 'Görüşmeyi Başlat'}
              </Button>
            )}
            
            <Button
              variant="outlined"
              color="error"
              size="large"
              onClick={handleCancelSession}
              sx={{ mt: 2, ml: user?.userType === UserType.TEACHER ? 2 : 0 }}
            >
              İptal Et
            </Button>
          </Box>
        )}
        
        {sessionStatus === 'active' && token && roomName && (
          <Box sx={{ height: '70vh', width: '100%' }}>
            <div style={{ height: '100%', width: '100%' }}>
              <LiveKitRoom
                serverUrl={process.env.REACT_APP_LIVEKIT_URL || 'wss://your-livekit-server.com'}
                token={token}
                connectOptions={{ autoSubscribe: true }}
                data-lk-theme="default"
              >
                <VideoConference />
              </LiveKitRoom>
            </div>
          </Box>
        )}
        
        {sessionStatus === 'completed' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Görüşme tamamlandı.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBack}
              sx={{ mt: 2 }}
            >
              Dashboard'a Dön
            </Button>
          </Box>
        )}
        
        {sessionStatus === 'cancelled' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Görüşme iptal edildi.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBack}
              sx={{ mt: 2 }}
            >
              Dashboard'a Dön
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default VideoConferencePage;
