import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "Maar Katar Tournament — Cricket Auction",
  description: "Live cricket player auction platform for Maar Katar Tournament. Roaring Vipers vs Mighty Mongooses.",
  keywords: "cricket, auction, maar katar, tournament, roaring vipers, mighty mongooses",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
