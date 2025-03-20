import React, { useState, Dispatch, SetStateAction, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  FormGroup,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Event as EventIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { getTeacherTimeSlots, addTeacherTimeSlot, deleteTeacherTimeSlot } from '../../services/teacherCalendarService';

// Yardımcı fonksiyonlar
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Pazartesi günü haftanın başlangıcı
  return new Date(d.setDate(diff));
};

// Takvim için kullanılacak arayüzler
export interface TimeSlot {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  studentId?: string;
  studentName?: string;
}

interface TeacherCalendarProps {
  teacherId: string;
  timeSlots: TimeSlot[];
  setTimeSlots?: Dispatch<SetStateAction<TimeSlot[]>>;
  isTeacher?: boolean;
  setIsLoading?: Dispatch<SetStateAction<boolean>>;
}

const TeacherCalendar: React.FC<TeacherCalendarProps> = ({
  teacherId,
  timeSlots,
  setTimeSlots,
  isTeacher = true,
  setIsLoading,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [openAddDialog, setOpenAddDialog] = useState<boolean>(false);
  const [addTabValue, setAddTabValue] = useState<number>(0);
  const [newTimeSlot, setNewTimeSlot] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
  });
  const [repeatOptions, setRepeatOptions] = useState({
    isRepeating: false,
    repeatDays: [false, true, false, true, false, true, false], // Pazar, Pazartesi, Salı, ...
    repeatUntil: new Date().toISOString().split('T')[0],
  });
  const [bulkTimeSlots, setBulkTimeSlots] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    selectedDays: [false, true, true, true, true, true, false], // Pazar, Pazartesi, Salı, ...
  });

  // Zaman dilimlerini yükle
  const loadTimeSlots = async () => {
    if (!teacherId || !setTimeSlots || !setIsLoading) return;
    
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await getTeacherTimeSlots(teacherId);
      console.log('TeacherCalendar - Time slots loaded:', response);
      
      if (response && Array.isArray(response)) {
        // API'den gelen verileri kontrol et ve geçerli olanları kullan
        const validTimeSlots = response.filter(slot => 
          slot && 
          slot.date && 
          slot.startTime && 
          slot.endTime && 
          typeof slot.isBooked === 'boolean'
        );
        
        console.log('TeacherCalendar - Valid time slots:', validTimeSlots);
        setTimeSlots(validTimeSlots);
      } else {
        console.error('Invalid time slots data received');
        setTimeSlots([]);
      }
      
      setSuccess('Zaman dilimleri başarıyla yüklendi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error loading time slots:', err);
      setError(err.message || 'Zaman dilimleri yüklenirken bir hata oluştu');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Zaman dilimlerini tarihe göre grupla
  const groupedTimeSlots = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    
    timeSlots.forEach(slot => {
      const dateStr = new Date(slot.date).toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(slot);
    });
    
    // Tarihleri sırala
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Her tarih için zaman dilimlerini sırala
    sortedDates.forEach(dateStr => {
      grouped[dateStr].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });
    
    return { grouped, sortedDates };
  }, [timeSlots]);

  // Zaman dilimi ekle
  const handleAddTimeSlot = async () => {
    if (!teacherId || !setTimeSlots || !setIsLoading) return;
    
    try {
      setSaving(true);
      setError(null);
      
      if (addTabValue === 0) {
        // Tekil zaman dilimi ekleme
        const dateObj = new Date(newTimeSlot.date);
        const [startHour, startMinute] = newTimeSlot.startTime.split(':').map(Number);
        const [endHour, endMinute] = newTimeSlot.endTime.split(':').map(Number);
        
        const startDateTime = new Date(dateObj);
        startDateTime.setHours(startHour, startMinute, 0);
        
        const endDateTime = new Date(dateObj);
        endDateTime.setHours(endHour, endMinute, 0);
        
        // Başlangıç zamanı bitiş zamanından önce olmalı
        if (startDateTime >= endDateTime) {
          setError('Başlangıç zamanı bitiş zamanından önce olmalıdır');
          return;
        }
        
        const newSlot = {
          teacherId,
          date: dateObj,
          startTime: startDateTime,
          endTime: endDateTime,
          isBooked: false,
        };
        
        console.log('Adding new time slot:', newSlot);
        const response = await addTeacherTimeSlot(teacherId, newSlot);
        console.log('Time slot added successfully:', response);
        
        // Yeni zaman dilimini listeye ekle
        if (response) {
          setTimeSlots([...timeSlots, response]);
          setSuccess('Zaman dilimi başarıyla eklendi');
          setTimeout(() => setSuccess(null), 3000);
          
          if (!repeatOptions.isRepeating) {
            setOpenAddDialog(false);
          } else {
            // Tekrarlayan zaman dilimleri için
            const daysToAdd = [];
            const currentDate = new Date(dateObj);
            const untilDate = new Date(repeatOptions.repeatUntil);
            
            // İlk günü atla çünkü zaten ekledik
            currentDate.setDate(currentDate.getDate() + 1);
            
            while (currentDate <= untilDate) {
              const dayOfWeek = currentDate.getDay(); // 0: Pazar, 1: Pazartesi, ...
              
              if (repeatOptions.repeatDays[dayOfWeek]) {
                daysToAdd.push(new Date(currentDate));
              }
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Tüm tekrarlayan günler için zaman dilimi ekle
            let addedCount = 0;
            for (const day of daysToAdd) {
              const startTimeForDay = new Date(day);
              startTimeForDay.setHours(startHour, startMinute, 0);
              
              const endTimeForDay = new Date(day);
              endTimeForDay.setHours(endHour, endMinute, 0);
              
              const repeatSlot = {
                teacherId,
                date: day,
                startTime: startTimeForDay,
                endTime: endTimeForDay,
                isBooked: false,
              };
              
              try {
                const repeatResponse = await addTeacherTimeSlot(teacherId, repeatSlot);
                if (repeatResponse) {
                  setTimeSlots(prev => [...prev, repeatResponse]);
                  addedCount++;
                }
              } catch (err) {
                console.error('Error adding repeating time slot:', err);
              }
            }
            
            if (addedCount > 0) {
              setSuccess(`${addedCount + 1} zaman dilimi başarıyla eklendi`);
              setTimeout(() => setSuccess(null), 3000);
              setOpenAddDialog(false);
            }
          }
          
          // Formu sıfırla
          setNewTimeSlot({
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '10:00',
          });
          setRepeatOptions({
            isRepeating: false,
            repeatDays: [false, true, false, true, false, true, false],
            repeatUntil: new Date().toISOString().split('T')[0],
          });
        }
      } else if (addTabValue === 1) {
        // Toplu zaman dilimi ekleme
        const { startDate, endDate, startTime, endTime, selectedDays } = bulkTimeSlots;
        
        if (new Date(startDate) > new Date(endDate)) {
          setError('Başlangıç tarihi bitiş tarihinden önce olmalıdır');
          return;
        }
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
          setError('Başlangıç saati bitiş saatinden önce olmalıdır');
          return;
        }
        
        const daysToAdd = [];
        const currentDate = new Date(startDate);
        const lastDate = new Date(endDate);
        
        while (currentDate <= lastDate) {
          const dayOfWeek = currentDate.getDay(); // 0: Pazar, 1: Pazartesi, ...
          
          if (selectedDays[dayOfWeek]) {
            daysToAdd.push(new Date(currentDate));
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (daysToAdd.length === 0) {
          setError('Lütfen en az bir gün seçin');
          return;
        }
        
        // Tüm seçilen günler için zaman dilimi ekle
        let addedCount = 0;
        for (const day of daysToAdd) {
          const startTimeForDay = new Date(day);
          startTimeForDay.setHours(startHour, startMinute, 0);
          
          const endTimeForDay = new Date(day);
          endTimeForDay.setHours(endHour, endMinute, 0);
          
          const newSlot = {
            teacherId,
            date: day,
            startTime: startTimeForDay,
            endTime: endTimeForDay,
            isBooked: false,
          };
          
          try {
            const response = await addTeacherTimeSlot(teacherId, newSlot);
            if (response) {
              setTimeSlots(prev => [...prev, response]);
              addedCount++;
            }
          } catch (err) {
            console.error('Error adding bulk time slot:', err);
          }
        }
        
        if (addedCount > 0) {
          setSuccess(`${addedCount} zaman dilimi başarıyla eklendi`);
          setTimeout(() => setSuccess(null), 3000);
          setOpenAddDialog(false);
          
          // Formu sıfırla
          setBulkTimeSlots({
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '10:00',
            selectedDays: [false, true, true, true, true, true, false],
          });
        } else {
          setError('Zaman dilimi eklenirken bir hata oluştu');
        }
      }
    } catch (err: any) {
      console.error('Error adding time slot:', err);
      setError(err.message || 'Zaman dilimi eklenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };
  
  // Zaman dilimi sil
  const handleDeleteTimeSlot = async (timeSlotId: string) => {
    if (!teacherId || !setTimeSlots || !setIsLoading) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await deleteTeacherTimeSlot(timeSlotId);
      
      // Silinen zaman dilimini listeden kaldır
      setTimeSlots(timeSlots.filter(slot => slot.id !== timeSlotId));
      setSuccess('Zaman dilimi başarıyla silindi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting time slot:', err);
      setError(err.message || 'Zaman dilimi silinirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };
  
  // Tab değişikliğini işle
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setAddTabValue(newValue);
  };
  
  // Bulk input değişikliklerini işle
  const handleBulkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBulkTimeSlots(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Tekrarlama seçeneklerini güncelle
  const handleRepeatOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setRepeatOptions(prev => ({
      ...prev,
      isRepeating: checked,
    }));
  };
  
  // Tekrarlama günlerini güncelle
  const handleRepeatDayChange = (index: number) => {
    setRepeatOptions(prev => {
      const newDays = [...prev.repeatDays];
      newDays[index] = !newDays[index];
      return {
        ...prev,
        repeatDays: newDays,
      };
    });
  };
  
  // Toplu zaman dilimi günlerini güncelle
  const handleBulkDayChange = (index: number) => {
    setBulkTimeSlots(prev => {
      const newDays = [...prev.selectedDays];
      newDays[index] = !newDays[index];
      return {
        ...prev,
        selectedDays: newDays,
      };
    });
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<CalendarIcon />}
            sx={{ mr: 1 }}
          >
            Bugün
          </Button>
        </Box>
        
        {isTeacher && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
              sx={{ mr: 1 }}
            >
              Zaman Dilimi Ekle
            </Button>
            <Tooltip title="Zaman dilimlerini yenile">
              <IconButton 
                color="primary" 
                onClick={loadTimeSlots}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
      
      {timeSlots.length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          Henüz kaydedilmiş zaman dilimi bulunmamaktadır.
        </Alert>
      ) : (
        <Box>
          {groupedTimeSlots.sortedDates.map(dateStr => (
            <Box key={dateStr} sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {new Date(dateStr).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  weekday: 'long'
                })}
              </Typography>
              
              <Paper variant="outlined">
                <List>
                  {groupedTimeSlots.grouped[dateStr].map(slot => (
                    <ListItem
                      key={slot.id}
                      secondaryAction={
                        isTeacher && (
                          <IconButton 
                            edge="end" 
                            color="error" 
                            title="Bu zaman dilimini sil"
                            onClick={() => handleDeleteTimeSlot(slot.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TimeIcon fontSize="small" sx={{ mr: 1 }} />
                            <Typography>
                              {new Date(slot.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - 
                              {new Date(slot.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
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
          ))}
        </Box>
      )}
      
      {/* Zaman Dilimi Ekleme Dialog */}
      <Dialog 
        open={openAddDialog} 
        onClose={() => setOpenAddDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Müsait Zaman Dilimi Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={addTabValue} onChange={handleTabChange} aria-label="time slot tabs">
              <Tab label="Tek Zaman Dilimi" icon={<EventIcon />} iconPosition="start" />
              <Tab label="Toplu Zaman Dilimleri" icon={<DateRangeIcon />} iconPosition="start" />
            </Tabs>
          </Box>
          
          {addTabValue === 0 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Tarih"
                    type="date"
                    name="date"
                    value={newTimeSlot.date}
                    onChange={(e) => setNewTimeSlot(prev => ({ ...prev, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Başlangıç Saati"
                    type="time"
                    name="startTime"
                    value={newTimeSlot.startTime}
                    onChange={(e) => setNewTimeSlot(prev => ({ ...prev, startTime: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Bitiş Saati"
                    type="time"
                    name="endTime"
                    value={newTimeSlot.endTime}
                    onChange={(e) => setNewTimeSlot(prev => ({ ...prev, endTime: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={repeatOptions.isRepeating}
                      onChange={handleRepeatOptionChange}
                      name="isRepeating"
                    />
                  }
                  label="Bu zaman dilimini tekrarla"
                />
              </Box>
              
              {repeatOptions.isRepeating && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Tekrarlama Seçenekleri
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormGroup row>
                        <Typography variant="body2" sx={{ mr: 2, alignSelf: 'center' }}>
                          Tekrarlanacak günler:
                        </Typography>
                        {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map((day, index) => (
                          <FormControlLabel
                            key={day}
                            control={
                              <Checkbox
                                checked={repeatOptions.repeatDays[index]}
                                onChange={() => handleRepeatDayChange(index)}
                                size="small"
                              />
                            }
                            label={day}
                          />
                        ))}
                      </FormGroup>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        margin="normal"
                        label="Şu tarihe kadar tekrarla"
                        type="date"
                        name="repeatUntil"
                        value={repeatOptions.repeatUntil}
                        onChange={(e) => setRepeatOptions(prev => ({ ...prev, repeatUntil: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: newTimeSlot.date }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
          
          {addTabValue === 1 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Başlangıç Tarihi"
                    type="date"
                    name="startDate"
                    value={bulkTimeSlots.startDate}
                    onChange={handleBulkInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Bitiş Tarihi"
                    type="date"
                    name="endDate"
                    value={bulkTimeSlots.endDate}
                    onChange={handleBulkInputChange}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: bulkTimeSlots.startDate }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Başlangıç Saati"
                    type="time"
                    name="startTime"
                    value={bulkTimeSlots.startTime}
                    onChange={handleBulkInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Bitiş Saati"
                    type="time"
                    name="endTime"
                    value={bulkTimeSlots.endTime}
                    onChange={handleBulkInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Hangi günler için zaman dilimi eklensin?
                </Typography>
                
                <FormGroup row>
                  {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].map((day, index) => (
                    <FormControlLabel
                      key={day}
                      control={
                        <Checkbox
                          checked={bulkTimeSlots.selectedDays[index]}
                          onChange={() => handleBulkDayChange(index)}
                        />
                      }
                      label={day}
                    />
                  ))}
                </FormGroup>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  Bu seçenekle, belirtilen tarih aralığındaki seçili günler için aynı saatlerde zaman dilimleri oluşturulacaktır.
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>İptal</Button>
          <Button 
            onClick={handleAddTimeSlot} 
            variant="contained" 
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherCalendar;
