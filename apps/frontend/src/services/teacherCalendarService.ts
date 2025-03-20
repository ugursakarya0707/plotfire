import { getAuthHeader } from './authService';
import { TimeSlot } from '../components/calendar/TeacherCalendar';

const API_URL = process.env['REACT_APP_TEACHER_CONFERENCE_API_URL'] || 'http://localhost:3006/api';

// Öğretmen için müsait zamanları getir
export const getTeacherTimeSlots = async (teacherId: string): Promise<TimeSlot[]> => {
  try {
    console.log(`Fetching time slots for teacher: ${teacherId}`);
    const response = await fetch(`${API_URL}/teacher-time-slots/${encodeURIComponent(teacherId)}`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching time slots: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received time slots data:', data);
    
    // Eğer veri yoksa boş dizi döndür
    if (!data || !Array.isArray(data)) {
      console.warn('No valid time slots data received');
      return [];
    }
    
    // Sadece geçerli zaman dilimlerini filtrele
    const validTimeSlots = data.filter((slot: any) => 
      slot && 
      slot.date && 
      slot.startTime && 
      slot.endTime && 
      typeof slot.isBooked !== 'undefined'
    );
    
    console.log('Valid time slots after filtering:', validTimeSlots);
    
    // API'den gelen gerçek verileri dönüştür
    return validTimeSlots.map((slot: any) => ({
      ...slot,
      id: slot._id || slot.id,
      date: new Date(slot.date),
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      isBooked: Boolean(slot.isBooked),
      studentId: slot.studentId || undefined,
      studentName: slot.studentName || undefined
    }));
  } catch (error: any) {
    console.error('Error fetching teacher time slots:', error);
    throw new Error(error.message || 'Failed to fetch teacher time slots');
  }
};

// Öğretmen için yeni müsait zaman ekle
export const addTeacherTimeSlot = async (
  teacherId: string,
  timeSlotData: Omit<TimeSlot, 'id'>
): Promise<TimeSlot> => {
  try {
    const response = await fetch(`${API_URL}/teacher-time-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify({
        teacherId,
        date: timeSlotData.date.toISOString(),
        startTime: timeSlotData.startTime.toISOString(),
        endTime: timeSlotData.endTime.toISOString(),
        isBooked: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error adding time slot: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      id: data._id,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    };
  } catch (error: any) {
    console.error('Error adding teacher time slot:', error);
    throw new Error(error.message || 'Failed to add teacher time slot');
  }
};

// Öğretmen için müsait zamanı sil
export const deleteTeacherTimeSlot = async (timeSlotId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/teacher-time-slots/${timeSlotId}`, {
      method: 'DELETE',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error deleting time slot: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error deleting teacher time slot:', error);
    throw new Error(error.message || 'Failed to delete teacher time slot');
  }
};

// Öğrenci için ders rezervasyonu yap
export const bookTimeSlot = async (timeSlotId: string): Promise<TimeSlot> => {
  try {
    const response = await fetch(`${API_URL}/teacher-time-slots/${timeSlotId}/book`, {
      method: 'PUT',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error booking time slot: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      id: data._id,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    };
  } catch (error: any) {
    console.error('Error booking time slot:', error);
    throw new Error(error.message || 'Failed to book time slot');
  }
};

// Öğrenci için ders rezervasyonunu iptal et
export const cancelBooking = async (timeSlotId: string): Promise<TimeSlot> => {
  try {
    const response = await fetch(`${API_URL}/teacher-time-slots/${timeSlotId}/cancel`, {
      method: 'PUT',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error canceling booking: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      id: data._id,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    };
  } catch (error: any) {
    console.error('Error canceling booking:', error);
    throw new Error(error.message || 'Failed to cancel booking');
  }
};

// Öğrenci için rezerve edilmiş dersleri getir
export const getStudentBookings = async (): Promise<TimeSlot[]> => {
  try {
    const response = await fetch(`${API_URL}/teacher-time-slots/student/bookings`, {
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching student bookings: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.map((slot: any) => ({
      ...slot,
      id: slot._id,
      date: new Date(slot.date),
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    }));
  } catch (error: any) {
    console.error('Error fetching student bookings:', error);
    throw new Error(error.message || 'Failed to fetch student bookings');
  }
};
