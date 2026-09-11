import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
