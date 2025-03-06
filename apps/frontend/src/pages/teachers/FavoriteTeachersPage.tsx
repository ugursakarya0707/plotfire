import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { FavoriteTeacher, getFavoriteTeachers, removeTeacherFromFavorites } from '../../services/teacherConferenceService';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';

const FavoriteTeachersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteTeacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not a student
    if (user && user.userType !== UserType.STUDENT) {
      navigate('/');
      return;
    }

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const data = await getFavoriteTeachers();
        setFavorites(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch favorite teachers');
        console.error('Error fetching favorite teachers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchFavorites();
    }
  }, [user, navigate]);

  const handleRemoveFavorite = async (teacherId: string) => {
    try {
      await removeTeacherFromFavorites(teacherId);
      // Update the favorites list
      setFavorites(favorites.filter(fav => fav.teacherId._id !== teacherId));
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      setError(err.message || 'Failed to remove teacher from favorites');
    }
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
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <FavoriteIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
          Favori Öğretmenlerim
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Favorilerinize eklediğiniz öğretmenlerin listesi
        </Typography>
        <Divider sx={{ mt: 2, mb: 4 }} />
      </Box>

      {favorites.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="info">Henüz favori öğretmeniniz bulunmamaktadır.</Alert>
          <Button
            component={RouterLink}
            to="/teachers"
            variant="contained"
            sx={{ mt: 3 }}
          >
            Öğretmen Listesine Git
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {favorites.map((favorite) => (
            <Grid item xs={12} sm={6} md={4} key={favorite._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="h6" component="div">
                        {favorite.teacherId.firstName} {favorite.teacherId.lastName}
                      </Typography>
                    </Box>
                    <IconButton 
                      color="error" 
                      onClick={() => handleRemoveFavorite(favorite.teacherId._id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {favorite.teacherId.hobbies && favorite.teacherId.hobbies.length > 0 ? (
                      <>
                        <strong>Hobiler:</strong> {favorite.teacherId.hobbies.join(', ')}
                      </>
                    ) : (
                      'Hobi bilgisi bulunmamaktadır.'
                    )}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={RouterLink}
                    to={`/teachers/${favorite.teacherId._id}`}
                    size="small"
                    color="primary"
                    fullWidth
                  >
                    Konferans Sayfasına Git
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default FavoriteTeachersPage;
