import type { TestStatus } from '@/lib/types';

interface StatusModalProps {
  status: TestStatus | null;
  onClose: () => void;
}

export default function StatusModal({ status, onClose }: StatusModalProps) {
  if (!status) return null;

  const operationLabels: { [key: string]: string } = {
    write: 'Yazma',
    read: 'Okuma',
    update: 'Güncelleme',
  };

  const statusColors: { [key: string]: string } = {
    starting: '#6c757d',
    running: '#007bff',
    verifying: '#ffc107',
    completed: '#28a745',
    error: '#dc3545',
  };

  const statusLabels: { [key: string]: string } = {
    starting: 'Başlatılıyor',
    running: 'Çalışıyor',
    verifying: 'Doğrulanıyor',
    completed: 'Tamamlandı',
    error: 'Hata',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={status.status === 'completed' || status.status === 'error' ? onClose : undefined}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          animation: 'slideIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Canlı Durum Takibi</h2>
          {(status.status === 'completed' || status.status === 'error') && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6c757d',
                padding: '0.25rem 0.5rem',
              }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e9ecef' }}>
            <span style={{ fontWeight: '600', color: '#495057' }}>Veritabanı:</span>
            <span style={{ color: '#007bff', fontWeight: '500' }}>{status.currentDatabase}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e9ecef' }}>
            <span style={{ fontWeight: '600', color: '#495057' }}>İşlem:</span>
            <span style={{ color: '#28a745', fontWeight: '500' }}>
              {operationLabels[status.currentOperation] || status.currentOperation}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e9ecef' }}>
            <span style={{ fontWeight: '600', color: '#495057' }}>Durum:</span>
            <span style={{
              color: statusColors[status.status],
              fontWeight: 'bold',
            }}>
              {statusLabels[status.status]}
            </span>
          </div>
          {status.recordCount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e9ecef' }}>
              <span style={{ fontWeight: '600', color: '#495057' }}>Kayıt Sayısı:</span>
              <span style={{ color: '#6c757d' }}>{status.recordCount.toLocaleString()}</span>
            </div>
          )}
          {status.iteration && status.total && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e9ecef' }}>
              <span style={{ fontWeight: '600', color: '#495057' }}>İterasyon:</span>
              <span style={{ color: '#007bff', fontWeight: '500' }}>
                {status.iteration} / {status.total}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: '600', color: '#495057' }}>İlerleme:</span>
            <span style={{ color: '#007bff', fontWeight: '500' }}>{status.progress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '30px',
            backgroundColor: '#e9ecef',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${status.progress}%`,
              height: '100%',
              backgroundColor: statusColors[status.status],
              transition: 'width 0.3s ease, background-color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}>
              {status.progress}%
            </div>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
        }}>
          <p style={{ margin: 0, color: '#495057', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {status.message}
          </p>
        </div>

        {(status.status === 'completed' || status.status === 'error') && (
          <button
            onClick={onClose}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.75rem',
              backgroundColor: status.status === 'error' ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = status.status === 'error' ? '#c82333' : '#218838';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = status.status === 'error' ? '#dc3545' : '#28a745';
            }}
          >
            {status.status === 'error' ? 'Kapat' : 'Tamam'}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

