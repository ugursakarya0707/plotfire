import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Stripe public key - normalde .env dosyasından alınmalı
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_51R2etGIxbDpmVS9S5TDxwFbuc6OB37SYniitXvLOnS7IGVkRntPmiIyLKOmyBm9K8vdvHXhQ2fs6EfOqW62fADOi00Ur3EgXZW');

interface StripeProviderProps {
  children: React.ReactNode;
}

const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
