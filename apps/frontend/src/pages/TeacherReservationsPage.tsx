import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  Grid, 
  Chip, 
  Button, 
  CircularProgress, 
  Alert, 
  Tabs, 
  Tab,
  Divider,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelIcon,
  Event as ScheduledIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getTeacherReservations, updateReservationStatus, Reservation } from '../services/teacherReservationService';
import { useAuth } from '../contexts/AuthContext';

// Rezervasyon durumuna göre renk ve ikon döndüren yardımcı fonksiyon
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'scheduled':
      return { color: 'primary', label: 'Planlandı', icon: <ScheduledIcon /> };
    case 'completed':
      return { color: 'success', label: 'Tamamlandı', icon: <CompletedIcon /> };
    case 'cancelled':
      return { color: 'error', label: 'İptal Edildi', icon: <CancelIcon /> };
    default:
      return { color: 'default', label: 'Bilinmiyor', icon: null };
  }
};

// Tarihi formatla
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Saati formatla
const formatTime = (time: Date): string => {
  return new Date(time).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TeacherReservationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    reservationId: string | null;
    action: 'complete' | 'cancel' | null;
  }>({
    open: false,
    reservationId: null,
    action: null
  });

  // Rezervasyonları getir
  useEffect(() => {
    const fetchReservations = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const data = await getTeacherReservations(user.id);
        setReservations(data);
      } catch (err: any) {
        console.error('Error fetching reservations:', err);
        setError(err.message || 'Rezervasyonlar yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [user]);

  // Tab değişikliğini işle
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Rezervasyon durumunu güncelle
  const handleUpdateStatus = async (reservationId: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedReservation = await updateReservationStatus(reservationId, status);
      
      // Rezervasyon listesini güncelle
      setReservations(prevReservations => 
        prevReservations.map(reservation => 
          reservation.id === reservationId ? updatedReservation : reservation
        )
      );
      
      // Başarı mesajı göster
      const statusText = status === 'completed' ? 'tamamlandı' : 'iptal edildi';
      setSuccess(`Rezervasyon başarıyla ${statusText}`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Dialog'u kapat
      setConfirmDialog({ open: false, reservationId: null, action: null });
    } catch (err: any) {
      console.error('Error updating reservation status:', err);
      setError(err.message || 'Rezervasyon durumu güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Onay dialog'unu aç
  const openConfirmDialog = (reservationId: string, action: 'complete' | 'cancel') => {
    setConfirmDialog({ open: true, reservationId, action });
  };

  // Onay dialog'unu kapat
  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, reservationId: null, action: null });
  };

  // Onay dialog'unda işlemi onayla
  const confirmAction = () => {
    if (!confirmDialog.reservationId || !confirmDialog.action) return;
    
    const status = confirmDialog.action === 'complete' ? 'completed' : 'cancelled';
    handleUpdateStatus(confirmDialog.reservationId, status);
  };

  // Filtrelenmiş rezervasyonları al
  const getFilteredReservations = () => {
    switch (tabValue) {
      case 0: // Tümü
        return reservations;
      case 1: // Planlanmış
        return reservations.filter(reservation => reservation.status === 'scheduled');
      case 2: // Tamamlanmış
        return reservations.filter(reservation => reservation.status === 'completed');
      case 3: // İptal Edilmiş
        return reservations.filter(reservation => reservation.status === 'cancelled');
      default:
        return reservations;
    }
  };

  // Bugünün tarihini al
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <IconButton 
          onClick={() => navigate(-1)} 
          sx={{ mr: 2 }}
          aria-label="Geri dön"
        >
          <BackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Rezervasyonlarım
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Tüm Rezervasyonlar" />
          <Tab label="Planlanmış" />
          <Tab label="Tamamlanmış" />
          <Tab label="İptal Edilmiş" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : getFilteredReservations().length === 0 ? (
        <Alert severity="info">
          Bu kategoride rezervasyon bulunamadı.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {getFilteredReservations().map(reservation => {
            const statusInfo = getStatusInfo(reservation.status);
            const isUpcoming = new Date(reservation.date) >= today && reservation.status === 'scheduled';
            
            return (
              <Grid item xs={12} md={6} lg={4} key={reservation.id}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    bgcolor: isUpcoming ? 'rgba(25, 118, 210, 0.05)' : 'inherit',
                    borderColor: isUpcoming ? 'primary.main' : 'inherit'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip 
                        icon={statusInfo.icon ? statusInfo.icon : undefined} 
                        label={statusInfo.label} 
                        color={statusInfo.color as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                        size="small"
                      />
                      {isUpcoming && (
                        <Chip 
                          label="Yaklaşan" 
                          color="warning" 
                          size="small"
                        />
                      )}
                    </Box>
                    
                    <Typography variant="h6" component="h2" gutterBottom>
                      {formatDate(reservation.date)}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        Öğrenci: {reservation.studentName}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="caption" color="text.secondary">
                      Rezervasyon tarihi: {formatDate(reservation.createdAt)}
                    </Typography>
                  </CardContent>
                  
                  {reservation.status === 'scheduled' && (
                    <CardActions>
                      <Button 
                        size="small" 
                        color="success"
                        onClick={() => openConfirmDialog(reservation.id, 'complete')}
                      >
                        Tamamlandı
                      </Button>
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => openConfirmDialog(reservation.id, 'cancel')}
                      >
                        İptal Et
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Onay Dialog'u */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
      >
        <DialogTitle>
          {confirmDialog.action === 'complete' ? 'Rezervasyonu Tamamla' : 'Rezervasyonu İptal Et'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'complete' 
              ? 'Bu rezervasyonu tamamlandı olarak işaretlemek istediğinize emin misiniz?' 
              : 'Bu rezervasyonu iptal etmek istediğinize emin misiniz?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Vazgeç</Button>
          <Button 
            onClick={confirmAction} 
            color={confirmDialog.action === 'complete' ? 'success' : 'error'} 
            autoFocus
          >
            {confirmDialog.action === 'complete' ? 'Tamamla' : 'İptal Et'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherReservationsPage;
