import React from 'react';
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
} from '@mui/material';
import {
  School as SchoolIcon,
  QuestionAnswer as QAIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: <SchoolIcon fontSize="large" color="primary" />,
      title: 'Classes & Materials',
      description:
        'Access educational materials, join classes, and learn at your own pace.',
      button: 'Browse Classes',
      link: '/classes',
    },
    {
      icon: <QAIcon fontSize="large" color="primary" />,
      title: 'Questions & Answers',
      description:
        'Ask questions about class materials and get answers from teachers.',
      button: 'View Q&A',
      link: '/qa',
    },
    {
      icon: <PersonIcon fontSize="large" color="primary" />,
      title: 'Personalized Learning',
      description:
        'Track your progress, manage your enrolled classes, and customize your learning experience.',
      button: 'Go to Dashboard',
      link: '/dashboard',
    },
  ];

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography
            component="h1"
            variant="h2"
            color="primary"
            gutterBottom
          >
            Welcome to Postply
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            An educational platform connecting students and teachers
          </Typography>
          {!isAuthenticated && (
            <Box sx={{ mt: 4 }}>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                size="large"
                sx={{ mx: 1 }}
              >
                Get Started
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                size="large"
                sx={{ mx: 1 }}
              >
                Log In
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item key={index} xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography gutterBottom variant="h5" component="h2">
                    {feature.title}
                  </Typography>
                  <Typography>{feature.description}</Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    component={RouterLink}
                    to={isAuthenticated ? feature.link : '/login'}
                    variant="outlined"
                  >
                    {feature.button}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;
