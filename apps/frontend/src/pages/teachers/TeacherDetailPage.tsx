import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Person as PersonIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material';
import { 
  TeacherConference, 
  getTeacherConferenceById, 
  addTeacherToFavorites, 
  removeTeacherFromFavorites,
  isTeacherFavorite
} from '../../services/teacherConferenceService';
import { createVideoSession } from '../../services/videoConferenceService';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';

const TeacherDetailPage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<TeacherConference | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!teacherId) return;
      
      try {
        setLoading(true);
        const data = await getTeacherConferenceById(teacherId);
        setTeacher(data);
        
        // Check if teacher is in favorites (only for students)
        if (user && user.userType === UserType.STUDENT) {
          const favoriteStatus = await isTeacherFavorite(teacherId);
          setIsFavorite(favoriteStatus);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch teacher data');
        console.error('Error fetching teacher data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [teacherId, user]);

  const handleToggleFavorite = async () => {
    if (!teacherId || !user || user.userType !== UserType.STUDENT) return;
    
    try {
      setFavoriteLoading(true);
      
      if (isFavorite) {
        await removeTeacherFromFavorites(teacherId);
        setIsFavorite(false);
      } else {
        await addTeacherToFavorites(teacherId);
        setIsFavorite(true);
      }
    } catch (err: any) {
      console.error('Error toggling favorite status:', err);
      setError(err.message || 'Failed to update favorite status');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleStartVideoSession = async () => {
    if (!teacherId || !user || user.userType !== UserType.STUDENT) return;
    
    try {
      setVideoLoading(true);
      console.log('Creating video session with:', { teacherId, userId: user.id });
      const session = await createVideoSession(teacherId, user.id);
      navigate(`/video-conference/${session._id}`);
    } catch (err: any) {
      console.error('Error starting video session:', err);
      setError(err.message || 'Failed to start video session');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/teachers');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          sx={{ mt: 2 }}
        >
          Öğretmen Listesine Dön
        </Button>
      </Container>
    );
  }

  if (!teacher) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Öğretmen bulunamadı.</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          sx={{ mt: 2 }}
        >
          Öğretmen Listesine Dön
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          sx={{ mb: 2 }}
        >
          Öğretmen Listesine Dön
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h4" component="h1">
                {teacher.firstName} {teacher.lastName}
              </Typography>
            </Box>
          </Grid>
          
          {user && user.userType === UserType.STUDENT && (
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap', gap: 2 }}>
              <Button
                variant={isFavorite ? "outlined" : "contained"}
                color="primary"
                startIcon={isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
              >
                {isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                startIcon={<VideocamIcon />}
                onClick={handleStartVideoSession}
                disabled={videoLoading}
              >
                {videoLoading ? 'İşleniyor...' : 'Video Görüşmesi Başlat'}
              </Button>
            </Grid>
          )}
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Hobiler
        </Typography>
        
        {teacher.hobbies && teacher.hobbies.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            {teacher.hobbies.map((hobby, index) => (
              <Chip 
                key={index} 
                label={hobby} 
                sx={{ mr: 1, mb: 1 }} 
                color="primary" 
                variant="outlined" 
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            Hobi bilgisi bulunmamaktadır.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default TeacherDetailPage;
