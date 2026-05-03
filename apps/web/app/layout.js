import "./globals.css";

export const metadata = {
  title: "RegimeGuard AI",
  description: "Hosted crypto strategy lab with backtesting, watchdog monitoring, and AI incident replay.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

