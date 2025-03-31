import React, { useState } from 'react';
import { Modal, Box, Typography, CircularProgress, Button } from '@mui/material';
import PaymentForm from './PaymentForm';
import StripeProvider from '../../providers/StripeProvider';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  onSuccess: (result: any) => void;
  paymentType: 'video_conference' | 'reservation';
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  amount,
  currency,
  onSuccess,
  paymentType
}) => {
  const [loading, setLoading] = useState(false);
  
  const handlePaymentSuccess = () => {
    // Simulate a successful payment
    const result = { success: true };
    onSuccess(result);
  };
  
  const title = paymentType === 'video_conference' ? 'Video Konferans Ödemesi' : 'Rezervasyon Ödemesi';
  
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby="payment-modal-title"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 500 },
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography id="payment-modal-title" variant="h5" component="h2" gutterBottom>
          {title}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Ödeme Tutarı: {amount} {currency.toUpperCase()}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bu bir test uygulamasıdır. Gerçek ödeme alınmayacaktır.
            </Typography>
            
            {/* Basitleştirilmiş ödeme formu */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button 
                variant="outlined" 
                onClick={onClose}
                disabled={loading}
              >
                İptal
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handlePaymentSuccess}
                disabled={loading}
              >
                Ödemeyi Tamamla
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default PaymentModal;
