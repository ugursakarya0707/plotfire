import React from 'react';
import { Modal, Box, Typography, CircularProgress } from '@mui/material';
import PaymentForm from './PaymentForm';
import StripeProvider from '../../providers/StripeProvider';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientSecret: string | null;
  amount: number;
  currency: string;
  loading: boolean;
  onSuccess: () => void;
  title?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  clientSecret,
  amount,
  currency,
  loading,
  onSuccess,
  title = 'Ödeme İşlemi'
}) => {
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
        ) : clientSecret ? (
          <StripeProvider>
            <PaymentForm
              clientSecret={clientSecret}
              amount={amount}
              currency={currency}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </StripeProvider>
        ) : (
          <Typography color="error">
            Ödeme başlatılamadı. Lütfen daha sonra tekrar deneyin.
          </Typography>
        )}
      </Box>
    </Modal>
  );
};

export default PaymentModal;
