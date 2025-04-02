import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Chip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Person as PersonIcon,
  NotificationsActive as NotificationsActiveIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { VideoSession, checkPendingSessionsForTeacher } from '../../services/videoConferenceService';

// Basitleştirilmiş öğrenci bilgisi
interface StudentInfo {
  id: string;
  name?: string;
}

const PendingVideoSessions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingSessions, setPendingSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [studentInfoMap, setStudentInfoMap] = useState<Record<string, StudentInfo>>({});

  useEffect(() => {
    const fetchPendingSessions = async () => {
      if (!user || !user.id) return;
      
      try {
        setLoading(true);
        
        // Öğretmen ID'lerini kontrol et
        const teacherIds: string[] = [];
        
        // Mevcut ID'leri ekle
        if (user.id) teacherIds.push(user.id);
        if (user._id) teacherIds.push(user._id);
        if (user.teacherId) teacherIds.push(user.teacherId);
        
        console.log('Checking pending sessions with teacher IDs:', teacherIds);
        
        if (teacherIds.length === 0) {
          console.error('Öğretmen ID bulunamadı:', user);
          setError('Öğretmen kimliği bulunamadı');
          setLoading(false);
          return;
        }
        
        // Her bir ID için bekleyen oturumları kontrol et
        let allSessions: VideoSession[] = [];
        
        for (const id of teacherIds) {
          console.log(`Dashboard: Checking pending sessions for teacher ID: ${id}`);
          try {
            const sessions = await checkPendingSessionsForTeacher(id);
            console.log(`Dashboard: Received ${sessions.length} pending sessions for ID ${id}:`, sessions);
            allSessions = [...allSessions, ...sessions];
          } catch (error: any) {
            console.error(`Dashboard: Error checking pending sessions for ID ${id}:`, error);
          }
        }
        
        // Tekrarlanan oturumları filtrele
        const uniqueSessions = allSessions.filter((session, index, self) => 
          index === self.findIndex(s => s._id === session._id)
        );
        
        console.log(`Dashboard: Total unique pending sessions: ${uniqueSessions.length}`);
        setPendingSessions(uniqueSessions);
        
        // Basit bir öğrenci bilgi haritası oluştur
        // Not: Gerçek uygulamada burada öğrenci bilgilerini API'den çekebilirsiniz
        const studentMap: Record<string, StudentInfo> = {};
        uniqueSessions.forEach(session => {
          studentMap[session.studentId] = {
            id: session.studentId,
            name: `Öğrenci ${session.studentId.substring(0, 5)}...` // Basitleştirilmiş isim
          };
        });
        setStudentInfoMap(studentMap);
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching pending sessions:', err);
        setError(err.message || 'Bekleyen görüşmeler alınamadı');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingSessions();
    
    // Her 10 saniyede bir yenile
    const interval = setInterval(fetchPendingSessions, 10000);
    
    return () => clearInterval(interval);
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
            key={session._id} 
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
                      <strong>Öğrenci ID:</strong> {session.studentId}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Oluşturulma:</strong> {new Date(session.createdAt).toLocaleString()}
                  </Typography>
                  <Chip 
                    label="Bekliyor" 
                    color="warning" 
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
                Konferansa Katıl
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Paper>
  );
};

export default PendingVideoSessions;
