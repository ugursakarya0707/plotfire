import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Grid,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { getClassById, updateClass } from '../../services/classService';
import { Class } from '../../types/class';
import { UserType } from '../../types/user';

const EditClassPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);

  // Redirect if not a teacher
  useEffect(() => {
    if (user && user.userType !== UserType.TEACHER) {
      navigate('/classes');
    }
  }, [user, navigate]);

  // Fetch class data
  useEffect(() => {
    const fetchClassData = async () => {
      if (!classId) return;
      
      try {
        setLoading(true);
        const data = await getClassById(classId);
        
        // Check if the current user is the teacher of this class
        if (user?.id !== data.teacherId) {
          setError('You do not have permission to edit this class');
          return;
        }
        
        setClassData(data);
        setTitle(data.title);
        setDescription(data.description);
        setImage(data.image || '');
        setTags(data.tags || []);
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

  const handleAddTag = () => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
      setTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classId || !title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await updateClass(classId, {
        title,
        description,
        image: image || undefined,
        tags,
      });
      
      navigate(`/classes/${classId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update class');
      console.error('Error updating class:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !classData) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ my: 4 }}>
          {error}
        </Alert>
        <Button onClick={() => navigate('/classes')} variant="contained">
          Back to Classes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Class
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Class Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                variant="outlined"
                disabled={saving}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                multiline
                rows={4}
                variant="outlined"
                disabled={saving}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cover Image URL (optional)"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                variant="outlined"
                placeholder="https://example.com/image.jpg"
                disabled={saving}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Add Tags"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={handleKeyDown}
                variant="outlined"
                disabled={saving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        onClick={handleAddTag}
                        disabled={!tag.trim() || saving}
                      >
                        <AddIcon />
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap' }}>
                {tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    onDelete={() => handleRemoveTag(t)}
                    deleteIcon={<CloseIcon />}
                    sx={{ mr: 1, mb: 1 }}
                    disabled={saving}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/classes/${classId}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving || !title.trim() || !description.trim()}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditClassPage;
