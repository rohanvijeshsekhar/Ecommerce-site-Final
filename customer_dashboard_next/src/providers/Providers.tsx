'use client';

import React, { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../contexts/AuthContext';
import { StoreProvider } from '../contexts/StoreContext';
import { WishlistProvider } from '../contexts/WishlistContext';

interface ProvidersProps {
  children: ReactNode;
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function Providers({ children }: ProvidersProps) {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <StoreProvider>
          <WishlistProvider>
            {children}
          </WishlistProvider>
        </StoreProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
