import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FDFBF7',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px 20px' }}>
        <h1
          style={{
            fontSize: '120px',
            color: '#B85C38',
            margin: '0 0 20px 0',
            fontWeight: '700',
          }}
        >
          404
        </h1>
        <p
          style={{
            fontSize: '20px',
            color: '#1C1917',
            margin: '0 0 40px 0',
            lineHeight: '1.6',
          }}
        >
          Page introuvable / الصفحة غير موجودة
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            backgroundColor: '#B85C38',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: '16px',
            borderRadius: '4px',
            fontWeight: '500',
          }}
        >
          Retour / العودة
        </Link>
      </div>
    </div>
  );
}
