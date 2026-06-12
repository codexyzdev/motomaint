"use client";

import { SessionProvider } from "next-auth/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DriveSyncProvider } from "@/lib/DriveSyncContext";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID!}>
      <SessionProvider>
        <DriveSyncProvider>
          {children}
        </DriveSyncProvider>
      </SessionProvider>
    </GoogleOAuthProvider>
  );
}