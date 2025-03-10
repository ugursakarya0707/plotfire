import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { createClass } from '../../services/classService';
import { UserType } from '../../types/user';

const CreateClassPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not a teacher
  React.useEffect(() => {
    if (user && user.userType !== UserType.TEACHER) {
      navigate('/classes');
    }
  }, [user, navigate]);

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
    
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await createClass({
        title,
        description,
        image: image || undefined,
        tags,
      });
      
      navigate('/classes');
    } catch (err: any) {
      setError(err.message || 'Failed to create class');
      console.error('Error creating class:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Class
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        onClick={handleAddTag}
                        disabled={!tag.trim() || loading}
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
                    disabled={loading}
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/classes')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !title.trim() || !description.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Creating...' : 'Create Class'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateClassPage;
