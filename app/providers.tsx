"use client";

import { SessionProvider } from "next-auth/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DriveSyncBootstrap } from "@/components/DriveSyncBootstrap";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID!}>
      <SessionProvider>
        <DriveSyncBootstrap>
          {children}
        </DriveSyncBootstrap>
      </SessionProvider>
    </GoogleOAuthProvider>
  );
}