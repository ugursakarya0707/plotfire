import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Paper,
  CircularProgress
} from '@mui/material';
import { 
  Wifi as OnlineIcon, 
  WifiOff as OfflineIcon 
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';
import { 
  getTeacherConferenceByTeacherId, 
  updateTeacherOnlineStatus 
} from '../../services/teacherConferenceService';

const TeacherOnlineStatus: React.FC = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherStatus = async () => {
      if (!user || user.userType !== UserType.TEACHER) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const teacherConference = await getTeacherConferenceByTeacherId(user.id);
        setIsOnline(teacherConference.isOnline);
      } catch (err: any) {
        console.error('Error fetching teacher online status:', err);
        setError('Çevrimiçi durumunuz yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStatus();
  }, [user]);

  const handleToggleOnlineStatus = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || user.userType !== UserType.TEACHER) return;

    const newStatus = event.target.checked;
    
    try {
      setUpdating(true);
      await updateTeacherOnlineStatus(newStatus);
      setIsOnline(newStatus);
      setError(null);
    } catch (err: any) {
      console.error('Error updating teacher online status:', err);
      setError('Çevrimiçi durumunuz güncellenirken bir hata oluştu.');
      // Revert the switch to its previous state
      setIsOnline(!newStatus);
    } finally {
      setUpdating(false);
    }
  };

  // Sadece öğretmenler için göster
  if (!user || user.userType !== UserType.TEACHER) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isOnline ? (
            <OnlineIcon color="success" sx={{ mr: 1 }} />
          ) : (
            <OfflineIcon color="disabled" sx={{ mr: 1 }} />
          )}
          <Typography variant="h6">
            Öğrenci Görüşme Durumu
          </Typography>
        </Box>
        
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <FormControlLabel
            control={
              <Switch
                checked={isOnline}
                onChange={handleToggleOnlineStatus}
                disabled={updating}
                color="primary"
              />
            }
            label={isOnline ? "Müsait" : "Meşgul"}
            labelPlacement="start"
          />
        )}
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {isOnline 
          ? "Şu anda çevrimiçisiniz. Öğrenciler sizinle video konferans başlatabilir."
          : "Şu anda çevrimdışısınız. Öğrenciler sizinle video konferans başlatamaz."}
      </Typography>
      
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default TeacherOnlineStatus;
