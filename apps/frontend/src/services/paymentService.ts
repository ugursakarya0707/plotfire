import { getAuthHeader } from './authService';

const PAYMENT_SERVICE_URL = 'http://localhost:3007/api';

/**
 * Video konferans için ödeme başlatır
 * @param teacherId Öğretmen ID
 * @param amount Ödeme miktarı
 * @returns Ödeme bilgileri ve client secret
 */
export const createVideoConferencePayment = async (teacherId: string, amount: number) => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/payments/video-conference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify({ teacherId, amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Video konferans ödemesi başlatılamadı');
    }

    return await response.json();
  } catch (error) {
    console.error('Video konferans ödemesi başlatılırken hata oluştu:', error);
    throw error;
  }
};

/**
 * Rezervasyon için ödeme başlatır
 * @param teacherId Öğretmen ID
 * @param amount Ödeme miktarı
 * @param reservationId Rezervasyon ID
 * @returns Ödeme bilgileri ve client secret
 */
export const createReservationPayment = async (teacherId: string, amount: number, reservationId: string) => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/payments/reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
      body: JSON.stringify({ teacherId, amount, reservationId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Rezervasyon ödemesi başlatılamadı');
    }

    return await response.json();
  } catch (error) {
    console.error('Rezervasyon ödemesi başlatılırken hata oluştu:', error);
    throw error;
  }
};

/**
 * Kullanıcının tüm ödemelerini getirir
 * @returns Kullanıcının ödemeleri
 */
export const getUserPayments = async () => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/payments/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ödemeler getirilemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Ödemeler getirilirken hata oluştu:', error);
    throw error;
  }
};

/**
 * Belirli bir ödemenin detaylarını getirir
 * @param paymentId Ödeme ID
 * @returns Ödeme detayları
 */
export const getPaymentById = async (paymentId: string) => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader() as Record<string, string>)
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ödeme detayları getirilemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Ödeme detayları getirilirken hata oluştu:', error);
    throw error;
  }
};
