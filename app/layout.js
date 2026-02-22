import './globals.css';

export const metadata = {
  title: '水果数字大挑战',
  description: '适合5岁小朋友的水果数字反应小游戏'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
