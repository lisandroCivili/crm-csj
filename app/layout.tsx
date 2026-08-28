import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Club San Jorge",
  description: "Gestión de leads, ventas y padrón de clientes",
};

/**
 * Next inyecta este mismo viewport por defecto, pero conviene que este escrito:
 * el sistema se usa mucho desde el celular y es la linea de la que depende que
 * las medidas en `px` sean las del telefono y no las de un escritorio simulado.
 *
 * Sin `maximumScale` ni `userScalable` a proposito: apagar el zoom es comodo
 * para el que disena y un problema para el que necesita agrandar la letra.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
