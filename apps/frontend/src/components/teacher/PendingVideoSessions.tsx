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
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { VideoSession, getTeacherPendingSessions } from '../../services/videoConferenceService';

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
  const [error, setError] = useState<string | null>(null);
  const [studentInfoMap, setStudentInfoMap] = useState<Record<string, StudentInfo>>({});

  useEffect(() => {
    const fetchPendingSessions = async () => {
      if (!user || !user.id) return;
      
      try {
        setLoading(true);
        const sessions = await getTeacherPendingSessions(user.id);
        setPendingSessions(sessions);
        
        // Basit bir öğrenci bilgi haritası oluştur
        // Not: Gerçek uygulamada burada öğrenci bilgilerini API'den çekebilirsiniz
        const studentMap: Record<string, StudentInfo> = {};
        sessions.forEach(session => {
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
    
    // Her 30 saniyede bir yenile
    const interval = setInterval(fetchPendingSessions, 30000);
    
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
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Şu anda bekleyen görüşme isteği bulunmamaktadır.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Bekleyen Görüşme İstekleri
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List>
        {pendingSessions.map((session, index) => (
          <React.Fragment key={session._id}>
            <ListItem
              alignItems="flex-start"
              secondaryAction={
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<VideocamIcon />}
                  onClick={() => handleJoinSession(session._id)}
                >
                  Katıl
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={studentInfoMap[session.studentId]?.name || `Öğrenci ID: ${session.studentId}`}
                secondary={
                  <React.Fragment>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      Talep Zamanı: 
                    </Typography>
                    {` ${new Date(session.createdAt).toLocaleString()}`}
                  </React.Fragment>
                }
              />
            </ListItem>
            {index < pendingSessions.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default PendingVideoSessions;
