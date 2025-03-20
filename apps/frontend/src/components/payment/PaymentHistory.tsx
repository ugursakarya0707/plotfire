import React, { useState, useEffect } from 'react';
import { getAuthHeader } from '../../contexts/AuthContext';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  type: string;
  teacherName?: string;
}

const PAYMENT_SERVICE_URL = process.env.REACT_APP_PAYMENT_SERVICE_URL || 'http://localhost:3007/api';

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${PAYMENT_SERVICE_URL}/payments/me`, {
          headers: {
            ...getAuthHeader() as Record<string, string>
          }
        });

        if (!response.ok) {
          throw new Error('Ödeme geçmişi yüklenirken bir hata oluştu');
        }

        const data = await response.json();
        setPayments(data);
      } catch (err: any) {
        setError(err.message || 'Ödeme geçmişi yüklenirken bir hata oluştu');
        console.error('Error fetching payment history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY'
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Başarılı';
      case 'pending':
        return 'Beklemede';
      case 'failed':
        return 'Başarısız';
      default:
        return status;
    }
  };

  const getPaymentTypeText = (type: string) => {
    switch (type) {
      case 'video_conference':
        return 'Video Konferans';
      case 'reservation':
        return 'Rezervasyon';
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Ödeme geçmişi yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (payments.length === 0) {
    return <div className="text-center py-8">Henüz bir ödeme geçmişiniz bulunmuyor.</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Ödeme Geçmişi</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Son ödeme işlemleriniz</p>
      </div>
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tür
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğretmen
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPaymentTypeText(payment.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.teacherName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                      {getStatusText(payment.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
