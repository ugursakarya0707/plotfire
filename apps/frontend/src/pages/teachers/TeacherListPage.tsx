import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { TeacherConference, getAllTeacherConferences } from '../../services/teacherConferenceService';

const TeacherListPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherConference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const data = await getAllTeacherConferences();
        setTeachers(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch teachers');
        console.error('Error fetching teachers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

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
          <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Öğretmenler
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Tüm öğretmenlerin listesi
        </Typography>
        <Divider sx={{ mt: 2, mb: 4 }} />
      </Box>

      {teachers.length === 0 ? (
        <Alert severity="info">Henüz kayıtlı öğretmen bulunmamaktadır.</Alert>
      ) : (
        <Grid container spacing={3}>
          {teachers.map((teacher) => (
            <Grid item xs={12} sm={6} md={4} key={teacher._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="h6" component="div">
                      {teacher.firstName} {teacher.lastName}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {teacher.hobbies && teacher.hobbies.length > 0 ? (
                      <>
                        <strong>Hobiler:</strong> {teacher.hobbies.join(', ')}
                      </>
                    ) : (
                      'Hobi bilgisi bulunmamaktadır.'
                    )}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={RouterLink}
                    to={`/teachers/${teacher._id}`}
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

export default TeacherListPage;
