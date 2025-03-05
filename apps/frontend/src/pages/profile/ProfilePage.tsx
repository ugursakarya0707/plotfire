import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Avatar,
  Button,
  TextField,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserType } from '../../types/user';
import { getProfile, updateProfile } from '../../services/profileService';
import { Profile as ProfileType, ProfileUpdateDto } from '../../types/profile';

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [formValues, setFormValues] = useState<ProfileUpdateDto>({
    firstName: '',
    lastName: '',
    bio: '',
    phoneNumber: '',
    location: '',
    website: '',
    interests: [],
    skills: [],
    education: [],
  });
  
  // For adding new items to arrays
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newEducation, setNewEducation] = useState('');
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profileData = await getProfile();
        setProfile(profileData);
        setFormValues({
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          bio: profileData.bio || '',
          phoneNumber: profileData.phoneNumber || '',
          location: profileData.location || '',
          website: profileData.website || '',
          interests: profileData.interests || [],
          skills: profileData.skills || [],
          education: profileData.education || [],
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form values if canceling edit
      if (profile) {
        setFormValues({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          bio: profile.bio || '',
          phoneNumber: profile.phoneNumber || '',
          location: profile.location || '',
          website: profile.website || '',
          interests: profile.interests || [],
          skills: profile.skills || [],
          education: profile.education || [],
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      const updatedProfile = await updateProfile({
        ...formValues,
        id: profile.id
      });
      setProfile(updatedProfile);
      setError(null);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (field: 'interests' | 'skills' | 'education', value: string) => {
    if (!value.trim()) return;
    
    setFormValues((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value],
    }));
    
    // Reset the input field
    if (field === 'interests') setNewInterest('');
    else if (field === 'skills') setNewSkill('');
    else if (field === 'education') setNewEducation('');
  };

  const handleDeleteItem = (field: 'interests' | 'skills' | 'education', index: number) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  // Mock data for activity
  const recentActivity = [
    { id: '1', action: 'Enrolled in Physics 101', date: '2025-03-01' },
    { id: '2', action: 'Completed assignment: Algebra Practice', date: '2025-02-28' },
    { id: '3', action: 'Asked a question in Computer Science class', date: '2025-02-25' },
    { id: '4', action: 'Received a grade: A in Mathematics Quiz', date: '2025-02-22' },
  ];

  if (loading && !profile) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
              }}
            >
              <PersonIcon sx={{ fontSize: 60 }} />
            </Avatar>
            <Typography variant="h5" gutterBottom>
              {profile?.firstName || ''} {profile?.lastName || ''}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {user?.userType === UserType.STUDENT ? 'Student' : 'Teacher'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
            <Button
              variant="outlined"
              startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
              sx={{ mt: 2 }}
              onClick={handleEditToggle}
              disabled={loading}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Paper>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Account Type"
                    secondary={user?.userType === UserType.STUDENT ? 'Student' : 'Teacher'}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Member Since"
                    secondary={profile ? new Date(profile.createdAt).toLocaleDateString() : 'Loading...'}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary={user?.userType === UserType.STUDENT ? 'Classes Enrolled' : 'Classes Teaching'}
                    secondary="3" // This would be fetched from the API in a real application
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="profile tabs"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Profile Information" />
              <Tab label="Activity" />
              <Tab label="Settings" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {isEditing ? (
                <Box component="form" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={formValues.firstName}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={formValues.lastName}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        value={user?.email || ''}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="phoneNumber"
                        value={formValues.phoneNumber}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Location"
                        name="location"
                        value={formValues.location}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Website"
                        name="website"
                        value={formValues.website}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Bio"
                        name="bio"
                        value={formValues.bio}
                        onChange={handleInputChange}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Interests
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        {formValues.interests?.map((interest, index) => (
                          <Chip
                            key={index}
                            label={interest}
                            onDelete={() => handleDeleteItem('interests', index)}
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                      <TextField
                        fullWidth
                        label="Add Interest"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton 
                                onClick={() => handleAddItem('interests', newInterest)}
                                edge="end"
                              >
                                <AddIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem('interests', newInterest);
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Skills
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        {formValues.skills?.map((skill, index) => (
                          <Chip
                            key={index}
                            label={skill}
                            onDelete={() => handleDeleteItem('skills', index)}
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                      <TextField
                        fullWidth
                        label="Add Skill"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton 
                                onClick={() => handleAddItem('skills', newSkill)}
                                edge="end"
                              >
                                <AddIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem('skills', newSkill);
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Education
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        {formValues.education?.map((edu, index) => (
                          <Chip
                            key={index}
                            label={edu}
                            onDelete={() => handleDeleteItem('education', index)}
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                      <TextField
                        fullWidth
                        label="Add Education"
                        value={newEducation}
                        onChange={(e) => setNewEducation(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton 
                                onClick={() => handleAddItem('education', newEducation)}
                                edge="end"
                              >
                                <AddIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem('education', newEducation);
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveProfile}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Profile'}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">First Name</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {profile?.firstName || 'Not set'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Last Name</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {profile?.lastName || 'Not set'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Email</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {user?.email || 'Not set'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Phone Number</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {profile?.phoneNumber || 'Not set'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Location</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {profile?.location || 'Not set'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Website</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {profile?.website ? (
                          <a href={profile.website} target="_blank" rel="noopener noreferrer">
                            {profile.website}
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Bio</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {profile?.bio || 'Not set'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Interests</Typography>
                      <Box sx={{ mt: 1 }}>
                        {profile?.interests && profile.interests.length > 0 ? (
                          profile.interests.map((interest, index) => (
                            <Chip
                              key={index}
                              label={interest}
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No interests added yet
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Skills</Typography>
                      <Box sx={{ mt: 1 }}>
                        {profile?.skills && profile.skills.length > 0 ? (
                          profile.skills.map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No skills added yet
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Education</Typography>
                      <Box sx={{ mt: 1 }}>
                        {profile?.education && profile.education.length > 0 ? (
                          profile.education.map((edu, index) => (
                            <Chip
                              key={index}
                              label={edu}
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No education added yet
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <List>
                {recentActivity.map((activity) => (
                  <ListItem key={activity.id} divider>
                    <ListItemText
                      primary={activity.action}
                      secondary={`Date: ${activity.date}`}
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Account Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Email Notifications
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your email notification preferences
                  </Typography>
                  <Button variant="outlined">Manage Notifications</Button>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Password
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Change your account password
                  </Typography>
                  <Button variant="outlined">Change Password</Button>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Privacy Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Control what information is visible to others
                  </Typography>
                  <Button variant="outlined">Privacy Settings</Button>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
