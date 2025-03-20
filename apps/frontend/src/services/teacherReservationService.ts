import { getAuthHeader } from '../utils/authUtils';

const API_URL = process.env.REACT_APP_TEACHER_CONFERENCE_API_URL || '';

export interface Reservation {
  id: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  timeSlotId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
}

/**
 * Öğretmenin tüm rezervasyonlarını getirir
 * @param teacherId Öğretmen kimliği
 * @returns Rezervasyon listesi
 */
export const getTeacherReservations = async (teacherId: string): Promise<Reservation[]> => {
  try {
    const response = await fetch(`${API_URL}/teacher-reservations/${teacherId}`, {
      method: 'GET',
      headers: { ...(getAuthHeader() as Record<string, string>) },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    // API'den gelen tarihleri Date nesnesine dönüştür
    return data.map((reservation: any) => ({
      ...reservation,
      date: new Date(reservation.date),
      startTime: new Date(reservation.startTime),
      endTime: new Date(reservation.endTime),
      createdAt: new Date(reservation.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching teacher reservations:', error);
    throw error;
  }
};

/**
 * Rezervasyon durumunu günceller
 * @param reservationId Rezervasyon kimliği
 * @param status Yeni durum
 * @returns Güncellenmiş rezervasyon
 */
export const updateReservationStatus = async (
  reservationId: string, 
  status: 'scheduled' | 'completed' | 'cancelled'
): Promise<Reservation> => {
  try {
    const response = await fetch(`${API_URL}/teacher-reservations/${reservationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    // API'den gelen tarihleri Date nesnesine dönüştür
    return {
      ...data,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      createdAt: new Date(data.createdAt),
    };
  } catch (error) {
    console.error('Error updating reservation status:', error);
    throw error;
  }
};
