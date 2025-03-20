import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Box, Button, Typography, CircularProgress, Alert, Paper, useTheme } from '@mui/material';

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const theme = useTheme();

  const cardStyle = {
    style: {
      base: {
        color: theme.palette.text.primary,
        fontFamily: theme.typography.fontFamily,
        fontSmoothing: 'antialiased',
        fontSize: '18px',
        lineHeight: '1.5',
        '::placeholder': {
          color: theme.palette.text.secondary,
        },
        padding: '16px',
      },
      invalid: {
        color: theme.palette.error.main,
        iconColor: theme.palette.error.main,
      },
    },
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setProcessing(true);

    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      setError('Kart bilgisi bulunamadı');
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      setError(`Ödeme hatası: ${error.message}`);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setError(null);
      setSucceeded(true);
      setProcessing(false);
      onSuccess();
    } else {
      setError('Beklenmeyen bir hata oluştu.');
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Frontend'den gelen tutar zaten TL cinsinden, 100'e bölmeye gerek yok
    const formattedAmount = amount.toFixed(2);
    
    switch (currency.toLowerCase()) {
      case 'try':
        return `${formattedAmount} ₺`;
      case 'usd':
        return `$${formattedAmount}`;
      case 'eur':
        return `€${formattedAmount}`;
      default:
        return `${formattedAmount} ${currency.toUpperCase()}`;
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        maxWidth: 600, 
        width: '100%', 
        mx: 'auto', 
        p: 4, 
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 'bold', mb: 3 }}>
        Ödeme Bilgileri
      </Typography>
      
      <Typography variant="h5" gutterBottom sx={{ 
        color: theme.palette.primary.main, 
        mb: 4,
        fontWeight: 'medium',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 2,
        backgroundColor: theme.palette.background.default,
        borderRadius: 1,
      }}>
        <span>Toplam Tutar:</span> 
        <span>{formatCurrency(amount, currency)}</span>
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3, fontSize: '1rem' }}>
          {error}
        </Alert>
      )}
      
      {succeeded ? (
        <Alert severity="success" sx={{ mb: 3, fontSize: '1rem' }}>
          Ödeme başarıyla tamamlandı!
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Box 
            sx={{ 
              mb: 4, 
              p: 3, 
              border: `1px solid ${theme.palette.divider}`, 
              borderRadius: 2,
              backgroundColor: theme.palette.background.default,
              '&:focus-within': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
              },
              transition: 'all 0.2s ease-in-out',
              minHeight: 80,
            }}
          >
            <CardElement options={cardStyle} />
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mt: 4,
            gap: 2,
          }}>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={onCancel}
              disabled={processing}
              size="large"
              sx={{ 
                minWidth: 120,
                fontSize: '1rem',
                py: 1.5,
              }}
            >
              İptal
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={processing || !stripe}
              size="large"
              sx={{ 
                minWidth: 200,
                fontSize: '1rem',
                py: 1.5,
                fontWeight: 'bold',
              }}
            >
              {processing ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Öde ${formatCurrency(amount, currency)}`
              )}
            </Button>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ 
            display: 'block', 
            textAlign: 'center', 
            mt: 3,
            fontSize: '0.9rem',
          }}>
            Ödeme bilgileriniz güvenli bir şekilde işlenmektedir.
          </Typography>
        </form>
      )}
    </Paper>
  );
};

export default PaymentForm;
