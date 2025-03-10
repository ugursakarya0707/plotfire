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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Class as ClassIcon,
  QuestionAnswer as QAIcon,
  School as SchoolIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';
import { getClasses, getClassesByTeacherId, getEnrollmentsByStudentId } from '../../services/classService';
import { Class, Enrollment } from '../../types/class';
import { getAllTeacherConferences, TeacherConference } from '../../services/teacherConferenceService';
import PendingVideoSessions from '../../components/teacher/PendingVideoSessions';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [teachers, setTeachers] = useState<TeacherConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (user?.userType === UserType.TEACHER && user?.id) {
          // Fetch classes created by the teacher
          const teacherClasses = await getClassesByTeacherId(user.id);
          setClasses(teacherClasses);
        } else if (user?.userType === UserType.STUDENT && user?.id) {
          // Fetch student enrollments
          const studentEnrollments = await getEnrollmentsByStudentId(user.id);
          setEnrollments(studentEnrollments);
          
          // Extract classes from enrollments
          const enrolledClasses = studentEnrollments
            .filter(enrollment => enrollment.class)
            .map(enrollment => enrollment.class as Class);
          
          setClasses(enrolledClasses);
        } else {
          // Fallback to fetch all classes
          const allClasses = await getClasses();
          setClasses(allClasses.slice(0, 3)); // Just take the first 3 for the dashboard
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch teachers for all users
    const fetchTeachers = async () => {
      try {
        setTeachersLoading(true);
        const teachersList = await getAllTeacherConferences();
        setTeachers(teachersList);
        setTeachersError(null);
      } catch (err: any) {
        setTeachersError(err.message || 'Failed to fetch teachers');
        console.error('Error fetching teachers:', err);
      } finally {
        setTeachersLoading(false);
      }
    };

    if (user) {
      fetchData();
      fetchTeachers();
    }
  }, [user]);

  // This would be fetched from API in a real application
  const recentQuestions = [
    { id: '1', title: 'How do I solve this equation?', class: 'Mathematics' },
    { id: '2', title: 'Explain Newton\'s laws', class: 'Physics' },
    { id: '3', title: 'What is object-oriented programming?', class: 'Computer Science' },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {user?.email}!
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Bekleyen Video Görüşmeleri (Sadece öğretmenler için) */}
      {user?.userType === UserType.TEACHER && (
        <Box sx={{ mb: 4 }}>
          <PendingVideoSessions />
        </Box>
      )}

      <Grid container spacing={4}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {user?.userType === UserType.STUDENT ? (
                  <>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <ClassIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Browse Classes"
                        secondary="Find new classes to enroll in"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <QAIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Ask a Question"
                        secondary="Get help from your teachers"
                      />
                    </ListItem>
                  </>
                ) : (
                  <>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <ClassIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Create a Class"
                        secondary="Start teaching a new subject"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <QAIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Answer Questions"
                        secondary="Help your students with their queries"
                      />
                    </ListItem>
                  </>
                )}
              </List>
            </CardContent>
            <CardActions>
              <Button
                component={RouterLink}
                to={user?.userType === UserType.STUDENT ? '/classes' : '/classes/create'}
                size="small"
                color="primary"
              >
                {user?.userType === UserType.STUDENT ? 'Browse All Classes' : 'Create New Class'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Recent Classes */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {user?.userType === UserType.STUDENT ? 'My Enrolled Classes' : 'My Classes'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : classes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  {user?.userType === UserType.STUDENT 
                    ? "You're not enrolled in any classes yet." 
                    : "You haven't created any classes yet."}
                </Typography>
              ) : (
                <List>
                  {classes.slice(0, 3).map((cls) => (
                    <ListItem key={cls.id} component={RouterLink} to={`/classes/${cls.id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                      <ListItemAvatar>
                        <Avatar>
                          <SchoolIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={cls.title}
                        secondary={user?.userType === UserType.STUDENT ? `Students: ${cls.studentCount}` : ''}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
            <CardActions>
              <Button
                component={RouterLink}
                to="/classes"
                size="small"
                color="primary"
              >
                View All Classes
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Teachers List for Students */}
        {user?.userType === UserType.STUDENT ? (
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Available Teachers
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {teachersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : teachersError ? (
                  <Typography variant="body2" color="error" sx={{ py: 2 }}>
                    {teachersError}
                  </Typography>
                ) : teachers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No teachers available at the moment.
                  </Typography>
                ) : (
                  <List>
                    {teachers.slice(0, 3).map((teacher) => (
                      <ListItem 
                        key={teacher._id} 
                        component={RouterLink} 
                        to={`/teachers/${teacher._id}`}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${teacher.firstName} ${teacher.lastName}`}
                          secondary={teacher.hobbies.length > 0 ? `Hobbies: ${teacher.hobbies.slice(0, 2).join(', ')}${teacher.hobbies.length > 2 ? '...' : ''}` : 'No hobbies listed'}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
              <CardActions>
                <Button
                  component={RouterLink}
                  to="/teachers"
                  size="small"
                  color="primary"
                >
                  View All Teachers
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ) : (
          // Recent Q&A for Teachers
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Questions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {recentQuestions.map((question) => (
                    <ListItem key={question.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <QAIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={question.title}
                        secondary={`Class: ${question.class}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <CardActions>
                <Button
                  component={RouterLink}
                  to="/qa"
                  size="small"
                  color="primary"
                >
                  View All Questions
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default DashboardPage;
