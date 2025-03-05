import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  Divider,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  QuestionAnswer as QAIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserType } from '../../types/user';
import { getClassById, enrollInClass, deleteClass, getEnrollmentsByClassId } from '../../services/classService';
import { Class, Enrollment } from '../../types/class';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`class-tabpanel-${index}`}
      aria-labelledby={`class-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ClassDetailPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [classData, setClassData] = useState<Class | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!classId) return;
      
      try {
        setLoading(true);
        const data = await getClassById(classId);
        setClassData(data);
        
        // If user is a student, check if they're enrolled
        if (user?.userType === UserType.STUDENT) {
          const enrollmentData = await getEnrollmentsByClassId(classId);
          setEnrollments(enrollmentData);
          setIsEnrolled(enrollmentData.some(e => e.studentId === user.id && e.active));
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch class data');
        console.error('Error fetching class data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [classId, user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEnroll = async () => {
    if (!classId) return;
    
    try {
      setEnrolling(true);
      await enrollInClass(classId);
      setIsEnrolled(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to enroll in class');
      console.error('Error enrolling in class:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDelete = async () => {
    if (!classId || !window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      await deleteClass(classId);
      navigate('/classes');
    } catch (err: any) {
      setError(err.message || 'Failed to delete class');
      console.error('Error deleting class:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ my: 4 }}>
          {error}
        </Alert>
        <Button component={RouterLink} to="/classes" variant="contained">
          Back to Classes
        </Button>
      </Container>
    );
  }

  if (!classData) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ my: 4 }}>
          Class not found
        </Alert>
        <Button component={RouterLink} to="/classes" variant="contained">
          Back to Classes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            position: 'relative',
            height: 200,
            backgroundImage: `url(${classData.image || `https://source.unsplash.com/random/800x400/?${classData.tags[0] || 'education'}`})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: 2,
            mb: 3,
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {classData.title}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              {classData.teacherId === user?.id ? 'Your class' : 'Taught by ' + (classData.teacher || 'Unknown')}
            </Typography>
            <Box sx={{ mt: 1, mb: 2 }}>
              {classData.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
              ))}
            </Box>
          </Box>
          <Box>
            {user?.userType === UserType.STUDENT && (
              <Button
                variant={isEnrolled ? 'outlined' : 'contained'}
                color={isEnrolled ? 'secondary' : 'primary'}
                onClick={handleEnroll}
                disabled={isEnrolled || enrolling}
                sx={{ mr: 1 }}
              >
                {enrolling ? 'Enrolling...' : isEnrolled ? 'Enrolled' : 'Enroll Now'}
              </Button>
            )}
            {user?.id === classData.teacherId && (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  component={RouterLink}
                  to={`/classes/${classId}/edit`}
                  sx={{ mr: 1 }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="class tabs">
          <Tab icon={<DescriptionIcon />} label="Overview" />
          <Tab icon={<AssignmentIcon />} label="Content" />
          <Tab icon={<QAIcon />} label="Discussions" />
          {(user?.userType === UserType.TEACHER || isEnrolled) && (
            <Tab icon={<PeopleIcon />} label="Students" />
          )}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                About This Class
              </Typography>
              <Typography paragraph>{classData.description}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Class Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Students Enrolled:</Typography>
                  <Typography variant="body2">{classData.studentCount}</Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Created:</Typography>
                  <Typography variant="body2">
                    {new Date(classData.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Last Updated:</Typography>
                  <Typography variant="body2">
                    {new Date(classData.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Class Content
          </Typography>
          <Typography paragraph>
            Content for this class is not available yet. Check back later.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Class Discussions
          </Typography>
          <Typography paragraph>
            Discussions for this class are not available yet. Check back later.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Students Enrolled
          </Typography>
          {enrollments.length === 0 ? (
            <Typography>No students enrolled yet.</Typography>
          ) : (
            <List>
              {enrollments.map((enrollment) => (
                <ListItem key={enrollment.id}>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={enrollment.studentId}
                    secondary={`Enrolled on ${new Date(enrollment.createdAt).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </TabPanel>
    </Container>
  );
};

export default ClassDetailPage;
