import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Avatar,
  Box,
  Tabs,
  Tab,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideocamIcon from '@mui/icons-material/Videocam';
import SchoolIcon from '@mui/icons-material/School';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InterestsIcon from '@mui/icons-material/Interests';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import TimeIcon from '@mui/icons-material/AccessTime';
import InfoIcon from '@mui/icons-material/Info';
import Wifi from '@mui/icons-material/Wifi';
import WifiOff from '@mui/icons-material/WifiOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VideoCallIcon from '@mui/icons-material/VideoCall';

import { 
  getTeacherConferenceById, 
  addTeacherToFavorites,
  removeTeacherFromFavorites,
  isTeacherFavorite
} from '../../services/teacherConferenceService';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createVideoSession, checkPendingSessionsForTeacher, VideoSession, notifyTeacherAboutSession } from '../../services/videoConferenceService';
import { VIDEO_CONFERENCE_API_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';
import { createVideoConferencePayment, createReservationPayment } from '../../services/paymentService';
import { getTeacherTimeSlots, bookTimeSlot } from '../../services/teacherCalendarService';
import PaymentModal from '../../components/payment/PaymentModal';
import { format } from 'date-fns';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TeacherCalendar, { TimeSlot as BaseTimeSlot } from '../../components/calendar/TeacherCalendar';

// TimeSlot tipini genişlet
interface TimeSlot extends BaseTimeSlot {
  teacherId?: string;  // Opsiyonel yapıyoruz çünkü orijinal tipte yok
  hourlyRate?: number; // Opsiyonel yapıyoruz çünkü orijinal tipte yok
}

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
      id={`teacher-tabpanel-${index}`}
      aria-labelledby={`teacher-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// TeacherCalendar'dan gelen TimeSlot tipini bizim TimeSlot tipimize dönüştüren yardımcı fonksiyon
const convertToTimeSlot = (slot: any): TimeSlot => {
  return {
    id: slot.id,
    teacherId: slot.teacherId || '', // Opsiyonel olduğu için, yoksa boş string olarak ayarla
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
    studentId: slot.studentId,
    studentName: slot.studentName,
    hourlyRate: slot.hourlyRate || 0 // Opsiyonel olduğu için, yoksa 0 olarak ayarla
  };
};

const AvailabilityList = ({ 
  timeSlots, 
  onBookTimeSlot, 
  isStudent
}: { 
  timeSlots: TimeSlot[], 
  onBookTimeSlot?: (timeSlotId: string, hourlyRate: number) => void,
  isStudent: boolean
}) => {
  // Zaman dilimlerini tarihe göre grupla
  const groupedByDate = timeSlots.reduce((acc, slot) => {
    const dateStr = format(new Date(slot.date), 'yyyy-MM-dd');
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Eğer zaman dilimi yoksa
  if (Object.keys(groupedByDate).length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          Bu öğretmen için henüz müsait zaman dilimi bulunmamaktadır.
        </Alert>
      </Box>
    );
  }

  // Tarihleri sırala (en yakın tarih en üstte)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <Box>
      {sortedDates.map((dateStr) => {
        const slots = groupedByDate[dateStr];
        // Zaman dilimlerini başlangıç saatine göre sırala
        const sortedSlots = [...slots].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        return (
          <Box key={dateStr} sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {format(new Date(dateStr), 'dd MMMM yyyy, EEEE')}
            </Typography>
            
            <Paper variant="outlined">
              <List>
                {sortedSlots.map((slot) => (
                  <ListItem
                    key={slot.id}
                    secondaryAction={
                      isStudent && !slot.isBooked && onBookTimeSlot && (
                        <IconButton 
                          edge="end" 
                          color="primary" 
                          onClick={() => onBookTimeSlot(slot.id, slot.hourlyRate || 0)}
                          title="Bu zaman dilimini rezerve et"
                        >
                          <BookmarkAddIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimeIcon fontSize="small" sx={{ mr: 1 }} />
                          <Typography>
                            {format(new Date(slot.startTime), 'HH:mm')} - {format(new Date(slot.endTime), 'HH:mm')}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Chip
                          label={slot.isBooked ? 'Rezerve Edildi' : 'Müsait'}
                          color={slot.isBooked ? 'error' : 'success'}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        );
      })}
    </Box>
  );
};

const TeacherDetailPage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<any | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [tabValue, setTabValue] = useState<number>(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentCurrency, setPaymentCurrency] = useState<string>('try');
  const [paymentType, setPaymentType] = useState<'video_conference' | 'reservation'>('video_conference');
  const [reservationIdForPayment, setReservationIdForPayment] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [pendingVideoSessions, setPendingVideoSessions] = useState<VideoSession[]>([]);

  useEffect(() => {
    // Öğretmen bilgilerini getir
    const fetchTeacherDetails = async () => {
      if (!teacherId) return;
      
      try {
        setLoading(true);
        const teacherData = await getTeacherConferenceById(teacherId);
        setTeacher(teacherData);
        
        // Öğretmen favorilerde mi kontrol et
        if (user && user.userType === UserType.STUDENT) {
          const isFavorite = await isTeacherFavorite(teacherId);
          setIsFavorite(isFavorite);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching teacher details:', err);
        setError(err.message || 'Failed to fetch teacher details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeacherDetails();
  }, [teacherId, user]);
  
  // Öğretmen için bekleyen video konferans isteklerini kontrol et
  useEffect(() => {
    let isSubscribed = true; // Component unmount edildiğinde state güncellemeyi önler
    let pollingInterval: NodeJS.Timeout;

    const checkPendingVideoSessions = async () => {
      if (!user || !teacher || !isSubscribed) return;
      
      try {
        // Öğretmen ID'sini doğru şekilde belirle
        const teacherId = teacher.id || teacher._id || teacher.teacherId;
        
        if (!teacherId) {
          console.error('TeacherDetailPage: Öğretmen ID bulunamadı:', teacher);
          return;
        }
        
        console.log(`TeacherDetailPage: Checking pending sessions for teacher ID: ${teacherId}`);
        
        let allSessions: VideoSession[] = [];
        
        // İki farklı API endpoint'inden oturum bilgilerini al
        try {
          // 1. Normal video oturumları
          const sessions = await checkPendingSessionsForTeacher(teacherId);
          console.log(`TeacherDetailPage: Received ${sessions.length} pending sessions from checkPendingSessionsForTeacher:`, sessions);
          allSessions = [...allSessions, ...sessions];
          
          // 2. LiveKit Proxy API'sinden doğrudan
          try {
            const directResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending`);
            if (directResponse.ok) {
              const directSessions = await directResponse.json();
              console.log(`TeacherDetailPage: Received ${directSessions.length} pending sessions from direct API call:`, directSessions);
              
              // İki array'i birleştirirken tekrarlanan oturumları filtrele
              directSessions.forEach((session: VideoSession) => {
                if (!allSessions.some(s => (s._id || s.id) === (session._id || session.id))) {
                  allSessions.push(session);
                }
              });
            }
          } catch (directApiError) {
            console.warn('TeacherDetailPage: Error getting sessions from direct API:', directApiError);
          }
          
          // Hiç oturum bulunamazsa, API cache olmayan doğrudan bir sorgu yap
          if (allSessions.length === 0) {
            try {
              const forceResponse = await fetch(`${VIDEO_CONFERENCE_API_URL}/video-sessions/teacher/${teacherId}/pending?force=true&t=${Date.now()}`);
              if (forceResponse.ok) {
                const forceSessions = await forceResponse.json();
                console.log(`TeacherDetailPage: Received ${forceSessions.length} pending sessions from force refresh:`, forceSessions);
                allSessions = [...allSessions, ...forceSessions];
              }
            } catch (forceError) {
              console.warn('TeacherDetailPage: Error getting sessions from force refresh:', forceError);
            }
          }
          
          if (!isSubscribed) return; // Component unmount edildiyse state'i güncelleme
          
          console.log(`TeacherDetailPage: Final total pending sessions: ${allSessions.length}`);
          
          // Bekleyen oturumları state'e kaydet
          setPendingVideoSessions(allSessions);
          
          // Bekleyen oturumlar varsa ve önceki state'te yoktuysa bildirim göster
          if (allSessions.length > 0) {
            // Yeni gelen oturumların sayısını belirle
            const previousSessionIds = pendingVideoSessions.map(s => (s._id || s.id));
            const newSessions = allSessions.filter(s => !previousSessionIds.includes(s._id || s.id));
            
            if (newSessions.length > 0) {
              // Yeni oturumlar varsa bildirim göster
              setSnackbarMessage(`${newSessions.length} adet yeni video konferans isteği var! Lütfen kontrol ediniz.`);
              setSnackbarSeverity('warning');
              setSnackbarOpen(true);
              
              // Bildirim sesi çal
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.warn('Notification sound could not be played:', e));
              } catch (soundError) {
                console.warn('Error playing notification sound:', soundError);
              }
            }
          }
        } catch (error: any) {
          console.error(`TeacherDetailPage: Error checking pending sessions:`, error);
        }
        
      } catch (error) {
        console.error('Error checking pending video sessions:', error);
      }
    };
    
    // İlk çağrı - sayfa yüklendiğinde
    checkPendingVideoSessions();
    
    // Polling interval - her 2 saniyede bir kontrol et (daha hızlı yaptık)
    pollingInterval = setInterval(checkPendingVideoSessions, 2000);
    
    // Cleanup function
    return () => {
      isSubscribed = false;
      clearInterval(pollingInterval);
    };
  }, [teacher, user, pendingVideoSessions]);
  
  useEffect(() => {
    if (!teacher) return;
    
    // Öğretmenin zaman dilimlerini getir
    const fetchTeacherTimeSlots = async () => {
      if (!teacher.teacherId) {
        console.error('Teacher ID is missing:', teacher);
        return;
      }
      
      try {
        const slots = await getTeacherTimeSlots(teacher.teacherId);
        
        // Sadece API'den gelen gerçek zaman dilimlerini kullan
        if (slots && Array.isArray(slots)) {
          // API'den gelen verileri kontrol et ve geçerli olanları dönüştür
          const validSlots = slots.filter(slot => 
            slot && 
            slot.date && 
            slot.startTime && 
            slot.endTime && 
            typeof slot.isBooked === 'boolean'
          );
          
          // Öğretmenin hourlyRate değerini zaman dilimlerine ekle
          const slotsWithRate = validSlots.map(slot => ({
            ...slot,
            hourlyRate: teacher.hourlyRate || 100 // Eğer zaman diliminde hourlyRate yoksa, öğretmenin hourlyRate değerini kullan
          }));
          setTimeSlots(slotsWithRate.map(convertToTimeSlot));
          
          if (validSlots.length === 0) {
            console.log('No valid time slots found for this teacher');
          }
        } else {
          console.error('Invalid time slots data received:', slots);
          setTimeSlots([]);
        }
      } catch (err: any) {
        console.error('Error fetching time slots:', err);
        setError(err.message || 'Failed to fetch time slots');
        setTimeSlots([]);
      }
    };
    
    fetchTeacherTimeSlots();
  }, [teacher]);
  
  // Bekleyen video konferans isteklerini göster
  useEffect(() => {
    if (pendingVideoSessions.length > 0 && user?.userType === UserType.TEACHER) {
      // Bekleyen oturumlar varsa daha belirgin bir bildirim göster
      setSnackbarMessage(`${pendingVideoSessions.length} adet bekleyen video konferans isteği var! Lütfen kontrol ediniz.`);
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      
      // Her bekleyen oturum için konsola detaylı bilgi yazdır
      pendingVideoSessions.forEach((session, index) => {
        console.log(`Pending session ${index + 1}:`, session);
      });
    }
  }, [pendingVideoSessions, user]);
  
  const handleToggleFavorite = async () => {
    if (!teacherId || !user || user.userType !== UserType.STUDENT) return;
    
    try {
      if (isFavorite) {
        await removeTeacherFromFavorites(teacherId);
      } else {
        await addTeacherToFavorites(teacherId);
      }
      
      setIsFavorite(!isFavorite);
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      setError(err.message || 'Failed to update favorite status');
    }
  };

  const handleGoBack = () => {
    navigate('/teachers');
  };

  const handleStartVideoSession = async () => {
    if (!teacherId || !user) return;
    
    try {
      // Öğretmen müsait değilse uyarı göster
      if (teacher && !teacher.isOnline) {
        alert('Bu öğretmen şu anda müsait değil. Lütfen daha sonra tekrar deneyin veya müsait bir zaman dilimi rezerve edin.');
        return;
      }
      
      // Ödeme işlemini başlat
      setPaymentType('video_conference');
      
      // Öğretmenin saatlik ücretini al
      const hourlyRate = teacher.hourlyRate || 100; // Varsayılan değer
      setPaymentAmount(hourlyRate);
      setPaymentCurrency('try');
      
      // Ödeme başlat
      const paymentResponse = await createVideoConferencePayment(teacherId, hourlyRate);
      
      if (paymentResponse && paymentResponse.clientSecret) {
        setPaymentModalOpen(true);
      } else {
        throw new Error('Ödeme başlatılamadı');
      }
    } catch (err: any) {
      console.error('Error starting payment:', err);
      setError(err.message || 'Ödeme başlatılırken bir hata oluştu');
    }
  };

  // Ödeme başarılı olduğunda video konferansı başlat
  const handlePaymentSuccess = async (paymentResult: any) => {
    try {
      setPaymentModalOpen(false);
      
      // Video konferans ödemesi başarılı olduğunda
      if (paymentType === 'video_conference' && paymentResult.success && user) {
        setPaymentSuccess(true);
        // Başarı mesajını göster
        setSnackbarMessage('Ödeme başarılı! Video konferans başlatılıyor...');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Önce oturumu oluştur
        // Öğretmen ID'sini doğru şekilde belirle
        const teacherId = teacher.id || teacher._id || teacher.teacherId;
        console.log(`Creating video session for teacher: ${teacherId}, student: ${user.id || ''}`);
        const session = await createVideoSession(teacherId, user.id || '');
        console.log('Created video session:', session);
        
        // Öğretmen için bekleyen oturumları kontrol et
        if (user.userType === UserType.TEACHER) {
          const pendingSessions = await checkPendingSessionsForTeacher(teacherId);
          console.log('Pending sessions after creation:', pendingSessions);
        }
        
        // Video konferans sayfasına yönlendir
        navigate(`/video-conference/${session._id}`);
      } else if (paymentType === 'reservation' && reservationIdForPayment && paymentResult.success) {
        // Rezervasyon işlemini tamamla
        await bookTimeSlot(reservationIdForPayment);
        
        // Başarı mesajı göster
        setSnackbarMessage('Rezervasyon başarıyla tamamlandı!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Zaman dilimlerini yeniden yükle
        if (teacher && teacher.teacherId) {
          const updatedSlots = await getTeacherTimeSlots(teacher.teacherId);
          if (updatedSlots && Array.isArray(updatedSlots)) {
            const validSlots = updatedSlots.filter(slot => 
              slot && 
              slot.date && 
              slot.startTime && 
              slot.endTime && 
              typeof slot.isBooked === 'boolean'
            );
            
            // Öğretmenin hourlyRate değerini zaman dilimlerine ekle
            const slotsWithRate = validSlots.map(slot => ({
              ...slot,
              hourlyRate: teacher.hourlyRate || 100 // Eğer zaman diliminde hourlyRate yoksa, öğretmenin hourlyRate değerini kullan
            }));
            setTimeSlots(slotsWithRate.map(convertToTimeSlot));
          }
        }
      }
    } catch (err: any) {
      console.error('Error after payment:', err);
      setSnackbarMessage(`İşlem sırasında bir hata oluştu: ${err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleBookTimeSlot = async (timeSlotId: string, hourlyRate: number) => {
    if (!user) {
      alert('Rezervasyon yapmak için giriş yapmalısınız');
      navigate('/login');
      return;
    }
    
    if (!teacherId) {
      throw new Error('Öğretmen bilgisi eksik');
    }
    
    try {
      // Saatlik ücret kontrolü
      if (!hourlyRate || hourlyRate <= 0) {
        // Eğer hourlyRate geçersizse, öğretmenin hourlyRate değerini kullan
        hourlyRate = teacher?.hourlyRate || 100;
      }
      
      // Ödeme işlemini başlat
      setPaymentType('reservation');
      setPaymentAmount(hourlyRate);
      setPaymentCurrency('try');
      setReservationIdForPayment(timeSlotId);
      
      console.log('Ödeme başlatılıyor:', {
        teacherId,
        hourlyRate,
        timeSlotId
      });
      
      // Ödeme başlat
      const paymentResponse = await createReservationPayment(teacherId, hourlyRate, timeSlotId);
      
      if (paymentResponse && paymentResponse.clientSecret) {
        setPaymentModalOpen(true);
      } else {
        throw new Error('Ödeme başlatılamadı');
      }
    } catch (err: any) {
      console.error('Error booking time slot:', err);
      alert(err.message || 'Ders rezervasyonu yapılırken bir hata oluştu');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          sx={{ mt: 2 }}
        >
          Öğretmen Listesine Dön
        </Button>
      </Container>
    );
  }

  if (!teacher) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Öğretmen bulunamadı.</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          sx={{ mt: 2 }}
        >
          Öğretmen Listesine Dön
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Bekleyen Video Konferans İstekleri */}
      {user?.userType === UserType.TEACHER && pendingVideoSessions.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mb: 3, 
            border: '2px solid #f57c00',
            backgroundColor: '#fff3e0' 
          }}
        >
          <Typography variant="h6" color="primary" gutterBottom>
            <NotificationsActiveIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Bekleyen Video Konferans İstekleri ({pendingVideoSessions.length})
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            {pendingVideoSessions.map((session) => (
              <Box 
                key={(session._id || session.id)} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                <Box>
                  <Typography variant="body1">
                    <strong>Öğrenci ID:</strong> {session.studentId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Oluşturulma:</strong> {new Date(session.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<VideoCallIcon />}
                  onClick={() => navigate(`/video-conference/${session._id || session.id}`)}
                >
                  Katıl
                </Button>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
      
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleGoBack}
        sx={{ mb: 2 }}
      >
        Öğretmen Listesine Dön
      </Button>
      
      {teacher && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                  alt={`${teacher.firstName} ${teacher.lastName}`}
                  src={teacher.profilePicture}
                >
                  <PersonIcon fontSize="large" />
                </Avatar>
                
                {teacher.isOnline !== undefined && (
                  <Chip
                    icon={teacher.isOnline ? <Wifi /> : <WifiOff />}
                    label={teacher.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                    color={teacher.isOnline ? 'success' : 'error'}
                    sx={{ mb: 2 }}
                  />
                )}
                
                {user && user.userType === UserType.STUDENT && (
                  <Button
                    variant="outlined"
                    color={isFavorite ? 'secondary' : 'primary'}
                    startIcon={isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    onClick={handleToggleFavorite}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    {isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                  </Button>
                )}
                
                {user && user.userType === UserType.STUDENT && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<VideocamIcon />}
                    onClick={handleStartVideoSession}
                    disabled={!teacher.isOnline}
                    fullWidth
                  >
                    Video Konferans Başlat
                  </Button>
                )}
              </Grid>
              
              <Grid item xs={12} md={9}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h5" component="h1">
                    {teacher.firstName} {teacher.lastName}
                  </Typography>
                  
                  {teacher.subject && (
                    <Typography variant="subtitle1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <SchoolIcon fontSize="small" sx={{ mr: 1 }} />
                      {teacher.subject}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  {teacher.hourlyRate && (
                    <Typography variant="subtitle1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoneyIcon fontSize="small" sx={{ mr: 1 }} />
                      Saatlik Ücret: {teacher.hourlyRate} TL
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="teacher tabs">
                    <Tab icon={<InfoIcon />} label="Hakkında" />
                    <Tab icon={<CalendarMonthIcon />} label="Müsait Zamanlar" />
                    <Tab icon={<SchoolIcon />} label="Eğitim" />
                    <Tab icon={<InterestsIcon />} label="Hobiler" />
                  </Tabs>
                </Box>
                
                <TabPanel value={tabValue} index={0}>
                  <Typography variant="body1" color="text.secondary">
                    {teacher.biography}
                  </Typography>
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EventAvailableIcon color="primary" sx={{ mr: 1 }} />
                          <Typography variant="h6">Öğretmenin Müsait Zamanları</Typography>
                        </Box>
                        
                        {user?.userType === UserType.STUDENT && (
                          <Typography variant="body2" color="text.secondary">
                            <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            Rezervasyon yapmak için saat diliminin yanındaki butona tıklayın
                          </Typography>
                        )}
                      </Box>
                      
                      <AvailabilityList 
                        timeSlots={timeSlots} 
                        onBookTimeSlot={user?.userType === UserType.STUDENT ? handleBookTimeSlot : undefined}
                        isStudent={user?.userType === UserType.STUDENT}
                      />
                    </Grid>
                  </Grid>
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <Typography variant="body1" color="text.secondary">
                    {teacher.education}
                  </Typography>
                </TabPanel>
                
                <TabPanel value={tabValue} index={3}>
                  {teacher.hobbies && teacher.hobbies.length > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      {teacher.hobbies.map((hobby: string, index: number) => (
                        <Chip 
                          key={index} 
                          label={hobby} 
                          sx={{ mr: 1, mb: 1 }} 
                          color="primary" 
                          variant="outlined" 
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      Hobi bilgisi bulunmamaktadır.
                    </Typography>
                  )}
                </TabPanel>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Ödeme Modal */}
          <PaymentModal
            open={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            amount={paymentAmount}
            currency={paymentCurrency}
            onSuccess={handlePaymentSuccess}
            paymentType={paymentType}
          />

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </>
      )}
    </Container>
  );
};

export default TeacherDetailPage;
