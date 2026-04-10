// Custom layout that hides the sidebar for full-screen editor experience
'use client';

export default function CustomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-stone-50 z-50">
      {children}
    </div>
  );
}
