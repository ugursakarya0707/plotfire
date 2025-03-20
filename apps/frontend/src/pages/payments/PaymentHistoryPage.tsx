import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentHistory from '../../components/payment/PaymentHistory';
import { useAuth } from '../../contexts/AuthContext';

const PaymentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Kullanıcı giriş yapmamışsa, giriş sayfasına yönlendir
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ödeme Geçmişim</h1>
        <p className="text-gray-600">Tüm ödeme işlemlerinizi buradan görüntüleyebilirsiniz.</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <PaymentHistory />
      </div>
      
      <div className="mt-6 flex justify-between">
        <button 
          onClick={() => navigate('/')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Ana Sayfaya Dön
        </button>
        
        <button 
          onClick={() => navigate('/teachers')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Öğretmenlere Göz At
        </button>
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
