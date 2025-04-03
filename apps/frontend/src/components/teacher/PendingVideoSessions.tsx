import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Chip,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Button,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Person as PersonIcon,
  NotificationsActive as NotificationsActiveIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { VideoSession } from '../../services/videoConferenceService';
import { VIDEO_CONFERENCE_API_URL } from '../../config';

const PendingVideoSessions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingSessions, setPendingSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchPendingSessions = async () => {
      if (!user || !user.id) return;
      
      try {
        setLoading(true);
        
        // Öğretmen ID'yi belirle
        const teacherId = user.id || user._id || user.teacherId;
        
        if (!teacherId) {
          console.error('Öğretmen ID bulunamadı:', user);
          setError('Öğretmen kimliği bulunamadı');
          setLoading(false);
          return;
        }
        
        console.log(`PendingVideoSessions: Fetching pending sessions for teacher ID: ${teacherId}`);
        
        // Doğrudan API'den gerçek bekleyen oturumları al
        // Önbelleği önlemek için timestamp ekle
        const timestamp = new Date().getTime();
        const response = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?t=${timestamp}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const sessions = await response.json();
        console.log(`PendingVideoSessions: Received ${sessions.length} pending sessions:`, sessions);
        
        // Gerçek öğrenci isteklerini filtrele
        const realStudentSessions = sessions.filter((session: VideoSession) => 
          session && 
          session.studentId && 
          session.status === 'WAITING' && 
          session.isActive === true
        );
        
        console.log(`PendingVideoSessions: Filtered to ${realStudentSessions.length} real student sessions`);
        
        setPendingSessions(realStudentSessions);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching pending sessions:', err);
        setError(err.message || 'Bekleyen görüşmeler alınamadı');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingSessions();
    
    // Polling mekanizması kaldırıldı - sadece sayfa yüklendiğinde bir kez kontrol ediliyor
  }, [user]);

  const handleJoinSession = (sessionId: string) => {
    navigate(`/video-conference/${sessionId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (pendingSessions.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Bekleyen Görüşme İstekleri
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Şu anda bekleyen görüşme isteği bulunmamaktadır.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        mb: 3, 
        border: pendingSessions.length > 0 ? '2px solid #f57c00' : 'none',
        backgroundColor: pendingSessions.length > 0 ? '#fff3e0' : 'white' 
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Badge badgeContent={pendingSessions.length} color="error" sx={{ mr: 1 }}>
          <NotificationsActiveIcon color="primary" />
        </Badge>
        <Typography variant="h6" color="primary">
          Bekleyen Video Konferans İstekleri
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pendingSessions.map((session) => (
          <Card 
            key={session._id || session.id} 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="body1">
                      <strong>Öğrenci:</strong> {session.studentName || `Öğrenci ${session.studentId?.substring(0, 5) || ''}...`}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Oluşturulma:</strong> {new Date(session.createdAt).toLocaleString()}
                  </Typography>
                  <Chip 
                    icon={<VideocamIcon />} 
                    label={`Durum: ${session.status}`} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                startIcon={<VideoCallIcon />}
                onClick={() => handleJoinSession(session._id || session.id || '')}
                fullWidth
              >
                Görüşmeye Katıl
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Paper>
  );
};

export default PendingVideoSessions;
