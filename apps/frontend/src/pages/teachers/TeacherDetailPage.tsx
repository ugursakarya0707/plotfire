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

import { 
  getTeacherConferenceById, 
  isTeacherFavorite, 
  addTeacherToFavorites, 
  removeTeacherFromFavorites 
} from '../../services/teacherConferenceService';
import { UserType } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getTeacherTimeSlots, 
  bookTimeSlot
} from '../../services/teacherCalendarService';
import { createVideoSession } from '../../services/videoConferenceService';
import { format } from 'date-fns';
import { createVideoConferencePayment, createReservationPayment } from '../../services/paymentService';
import PaymentModal from '../../components/payment/PaymentModal';

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

// TimeSlot arayüzü
interface TimeSlot {
  id: string;
  teacherId: string;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  isBooked: boolean;
  studentId?: string;
  studentName?: string;
  hourlyRate: number;
}

// TeacherCalendar'dan gelen TimeSlot tipini bizim TimeSlot tipimize dönüştüren yardımcı fonksiyon
const convertToTimeSlot = (slot: any): TimeSlot => {
  return {
    id: slot.id,
    teacherId: slot.teacherId,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
    studentId: slot.studentId,
    studentName: slot.studentName,
    hourlyRate: slot.hourlyRate || 0
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
                          onClick={() => onBookTimeSlot(slot.id, slot.hourlyRate)}
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
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);
  
  // Ödeme ile ilgili state'ler
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentCurrency, setPaymentCurrency] = useState<string>('try');
  const [paymentType, setPaymentType] = useState<'video_conference' | 'reservation'>('video_conference');
  const [reservationIdForPayment, setReservationIdForPayment] = useState<string | null>(null);

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
  
  // Öğretmen bilgileri yüklendiğinde zaman dilimlerini getir
  useEffect(() => {
    if (!teacher) return;
    
    // Öğretmenin zaman dilimlerini getir
    const fetchTeacherTimeSlots = async () => {
      if (!teacher.teacherId) {
        console.error('Teacher ID is missing:', teacher);
        return;
      }
      
      try {
        setCalendarLoading(true);
        console.log('Fetching time slots for teacher ID:', teacher.teacherId);
        const slots = await getTeacherTimeSlots(teacher.teacherId);
        console.log('Time slots fetched successfully:', slots);
        
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
          
          console.log('Valid time slots:', validSlots);
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
      } finally {
        setCalendarLoading(false);
      }
    };
    
    fetchTeacherTimeSlots();
  }, [teacher]);
  
  const handleToggleFavorite = async () => {
    if (!teacherId || !user || user.userType !== UserType.STUDENT) return;
    
    try {
      setFavoriteLoading(true);
      
      if (isFavorite) {
        await removeTeacherFromFavorites(teacherId);
      } else {
        await addTeacherToFavorites(teacherId);
      }
      
      setIsFavorite(!isFavorite);
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      setError(err.message || 'Failed to update favorite status');
    } finally {
      setFavoriteLoading(false);
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
      setPaymentLoading(true);
      setPaymentType('video_conference');
      
      // Öğretmenin saatlik ücretini al
      const hourlyRate = teacher.hourlyRate || 100; // Varsayılan değer
      setPaymentAmount(hourlyRate);
      setPaymentCurrency('try');
      
      // Ödeme başlat
      const paymentResponse = await createVideoConferencePayment(teacherId, hourlyRate);
      
      if (paymentResponse && paymentResponse.clientSecret) {
        setPaymentClientSecret(paymentResponse.clientSecret);
        setPaymentModalOpen(true);
      } else {
        throw new Error('Ödeme başlatılamadı');
      }
    } catch (err: any) {
      console.error('Error starting payment:', err);
      setError(err.message || 'Ödeme başlatılırken bir hata oluştu');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Ödeme başarılı olduğunda video konferansı başlat
  const handlePaymentSuccess = async () => {
    try {
      setPaymentModalOpen(false);
      
      if (paymentType === 'video_conference') {
        // Video konferansı başlat
        if (!teacherId || !user) {
          throw new Error('Öğretmen veya kullanıcı bilgisi eksik');
        }
        const sessionUrl = await createVideoSession(teacherId, user.id);
        window.open(sessionUrl.roomToken || '#', '_blank');
      } else if (paymentType === 'reservation' && reservationIdForPayment) {
        // Rezervasyon işlemini tamamla
        await bookTimeSlot(reservationIdForPayment);
        
        // Başarı mesajı göster
        alert('Rezervasyon başarıyla tamamlandı!');
        
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
      setError(err.message || 'İşlem sırasında bir hata oluştu');
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
      setCalendarLoading(true);
      
      // Saatlik ücret kontrolü
      if (!hourlyRate || hourlyRate <= 0) {
        // Eğer hourlyRate geçersizse, öğretmenin hourlyRate değerini kullan
        hourlyRate = teacher?.hourlyRate || 100;
      }
      
      // Ödeme işlemini başlat
      setPaymentLoading(true);
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
        setPaymentClientSecret(paymentResponse.clientSecret);
        setPaymentModalOpen(true);
      } else {
        throw new Error('Ödeme başlatılamadı');
      }
    } catch (err: any) {
      console.error('Error booking time slot:', err);
      alert(err.message || 'Ders rezervasyonu yapılırken bir hata oluştu');
    } finally {
      setCalendarLoading(false);
      setPaymentLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
                    disabled={favoriteLoading}
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
                    disabled={!teacher.isOnline || paymentLoading}
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
                      
                      {calendarLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <AvailabilityList 
                          timeSlots={timeSlots} 
                          onBookTimeSlot={user?.userType === UserType.STUDENT ? handleBookTimeSlot : undefined}
                          isStudent={user?.userType === UserType.STUDENT}
                        />
                      )}
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
            clientSecret={paymentClientSecret}
            amount={paymentAmount}
            currency={paymentCurrency}
            loading={paymentLoading}
            onSuccess={handlePaymentSuccess}
            title={paymentType === 'video_conference' ? 'Video Konferans Ödemesi' : 'Rezervasyon Ödemesi'}
          />
        </>
      )}
    </Container>
  );
};

export default TeacherDetailPage;
