import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';
import { getClasses, enrollInClass } from '../../services/classService';
import { Class } from '../../types/class';

const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const data = await getClasses();
        setClasses(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch classes');
        console.error('Error fetching classes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleEnroll = async (classId: string) => {
    try {
      setEnrollingClassId(classId);
      await enrollInClass(classId);
      // Update the local state to reflect enrollment
      setClasses(prevClasses => 
        prevClasses.map(cls => 
          cls.id === classId 
            ? { ...cls, studentCount: cls.studentCount + 1 } 
            : cls
        )
      );
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to enroll in class');
      console.error('Error enrolling in class:', err);
    } finally {
      setEnrollingClassId(null);
    }
  };
  
  const filteredClasses = classes.filter(
    (cls) =>
      cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Classes
        </Typography>
        {user?.userType === UserType.TEACHER && (
          <Button
            component={RouterLink}
            to="/classes/create"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Create Class
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search classes by title, description, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredClasses.length === 0 ? (
        <Alert severity="info">No classes found matching your search criteria.</Alert>
      ) : (
        <Grid container spacing={4}>
          {filteredClasses.map((cls) => (
            <Grid item key={cls.id} xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={cls.image || `https://source.unsplash.com/random/300x200/?${cls.tags[0] || 'education'}`}
                  alt={cls.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {cls.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {cls.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teacher: {cls.teacher || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Students: {cls.studentCount}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {cls.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions>
                  <Button
                    component={RouterLink}
                    to={`/classes/${cls.id}`}
                    size="small"
                    color="primary"
                  >
                    View Details
                  </Button>
                  {user?.userType === UserType.STUDENT && (
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => handleEnroll(cls.id)}
                      disabled={enrollingClassId === cls.id}
                    >
                      {enrollingClassId === cls.id ? 'Enrolling...' : 'Enroll'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ClassesPage;
