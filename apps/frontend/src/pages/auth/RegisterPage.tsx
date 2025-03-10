import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';

const validationSchema = Yup.object({
  username: Yup.string().required('Username is required'),
  email: Yup.string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password should be of minimum 8 characters length')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), ''], 'Passwords must match')
    .required('Confirm Password is required'),
  userType: Yup.string().required('Please select a role'),
});

const RegisterPage: React.FC = () => {
  const { register, error: authError, clearError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync authError with local error state
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      userType: UserType.STUDENT,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await register(values.username, values.email, values.password, values.userType as UserType);
      } catch (err: any) {
        setError(err.message || 'Failed to register');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Create Account
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={formik.handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoComplete="username"
          autoFocus
          value={formik.values.username}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="new-password"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          autoComplete="new-password"
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
          helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
        />
        
        <FormControl component="fieldset" margin="normal" fullWidth>
          <FormLabel component="legend">I am a:</FormLabel>
          <RadioGroup
            aria-label="user-type"
            name="userType"
            value={formik.values.userType}
            onChange={formik.handleChange}
            row
          >
            <FormControlLabel 
              value={UserType.STUDENT} 
              control={<Radio />} 
              label="Student" 
            />
            <FormControlLabel 
              value={UserType.TEACHER} 
              control={<Radio />} 
              label="Teacher" 
            />
          </RadioGroup>
        </FormControl>
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Register'}
        </Button>
        <Box sx={{ textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" variant="body2">
            {"Already have an account? Log In"}
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default RegisterPage;
