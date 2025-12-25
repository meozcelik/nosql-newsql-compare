import { useState, useEffect, useRef } from 'react';
import type { TestResult, TestStatus, RepeatTestResult } from '@/lib/types';
import PerformanceChart from '@/components/PerformanceChart';
import RepeatTestChart from '@/components/RepeatTestChart';
import StatusModal from '@/components/StatusModal';

export default function Home() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [repeatResults, setRepeatResults] = useState<RepeatTestResult[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [runningAllTests, setRunningAllTests] = useState(false);
  const [runningRepeatTests, setRunningRepeatTests] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const runTest = async (database: string, operation: string) => {
    // Prevent running tests if all tests or repeat tests are running
    if (runningAllTests || runningRepeatTests) {
      alert('Lütfen tüm testler tamamlanana kadar bekleyin.');
      return;
    }

    const key = `${database}-${operation}`;
    setLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(`/api/test/${database}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation }),
      });

      const result: TestResult = await response.json();
      setResults((prev) => [...prev, result]);
    } catch (error: any) {
      console.error('Test error:', error);
      setResults((prev) => [
        ...prev,
        {
          database,
          operation: operation as 'read' | 'write' | 'update',
          timeTaken: 0,
          recordCount: 0,
          dataIntegrity: false,
          error: error.message,
        },
      ]);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const clearResults = () => {
    setResults([]);
    setRepeatResults([]);
  };

  const runRepeatTests = async () => {
    setRunningRepeatTests(true);
    setTestStatus(null);
    setRepeatResults([]);

    try {
      const response = await fetch('/api/test/repeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'complete') {
                setRepeatResults(data.results);
                setTimeout(() => {
                  setTestStatus(null);
                }, 2000);
                setRunningRepeatTests(false);
                break;
              } else if (data.type === 'error') {
                alert('Hata: ' + data.error);
                setRunningRepeatTests(false);
                setTestStatus(null);
                break;
              } else {
                // Status update
                setTestStatus({
                  currentDatabase: data.database,
                  currentOperation: data.operation,
                  status: data.type === 'start' ? 'starting' :
                    data.type === 'running' ? 'running' :
                      data.type === 'completed' ? 'completed' : 'running',
                  progress: data.progress || 0,
                  message: data.message,
                  iteration: data.iteration,
                  total: data.total,
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Repeat tests error:', error);
      alert('Tekrarlı testler çalıştırılırken hata oluştu: ' + error.message);
      setRunningRepeatTests(false);
      setTestStatus(null);
    }
  };

  const runAllTests = async () => {
    setRunningAllTests(true);
    setTestStatus(null);
    setResults([]);

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Use Server-Sent Events for real-time status updates
      const eventSource = new EventSource('/api/test/all-stream', {
        // Note: EventSource doesn't support POST, so we'll use a workaround
      });

      // For POST request with SSE, we need to use fetch with streaming
      const response = await fetch('/api/test/all-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'complete') {
                setResults(data.results);
                // Keep status visible for 2 seconds before closing
                setTimeout(() => {
                  setTestStatus(null);
                }, 2000);
                setRunningAllTests(false);
                break;
              } else if (data.type === 'error') {
                alert('Hata: ' + data.error);
                setRunningAllTests(false);
                setTestStatus(null);
                break;
              } else {
                // It's a status update
                setTestStatus(data);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error('All tests error:', error);
      alert('Tüm testler çalıştırılırken hata oluştu: ' + error.message);
      setRunningAllTests(false);
      setTestStatus(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const databases = [
    { name: 'cassandra', displayName: 'Cassandra' },
    { name: 'mongo', displayName: 'MongoDB' },
    { name: 'cockroach', displayName: 'CockroachDB' },
  ];

  const operations = ['write', 'read', 'update'];

  const operationLabels: { [key: string]: string } = {
    write: 'Yazma',
    read: 'Okuma',
    update: 'Güncelleme',
  };

  const statusLabels: { [key: string]: string } = {
    write: 'Yazma',
    read: 'Okuma',
    update: 'Güncelleme',
  };

  const closeModal = () => {
    setTestStatus(null);
  };

  return (
    <div style={{
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: '#f5f7fa',
      minHeight: '100vh',
    }}>
      {/* Status Modal */}
      <StatusModal status={testStatus} onClose={closeModal} />

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <h1 style={{
            margin: 0,
            color: '#1a1a1a',
            fontSize: '1.75rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            NoSQL vs NewSQL Veritabanı Performans Karşılaştırması
          </h1>
        </div>

        {/* Controls Section */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.25rem', fontWeight: '600' }}>Test Kontrolleri</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={runAllTests}
                disabled={runningAllTests || runningRepeatTests}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: runningAllTests || runningRepeatTests ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: runningAllTests || runningRepeatTests ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: runningAllTests || runningRepeatTests ? 'none' : '0 2px 4px rgba(40, 167, 69, 0.3)',
                }}
                onMouseOver={(e) => {
                  if (!runningAllTests && !runningRepeatTests) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {runningAllTests ? 'Çalışıyor...' : 'Tüm Testleri Çalıştır'}
              </button>
              <button
                onClick={runRepeatTests}
                disabled={runningAllTests || runningRepeatTests}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: runningAllTests || runningRepeatTests ? '#ccc' : '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: runningAllTests || runningRepeatTests ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: runningAllTests || runningRepeatTests ? 'none' : '0 2px 4px rgba(111, 66, 193, 0.3)',
                }}
                onMouseOver={(e) => {
                  if (!runningAllTests && !runningRepeatTests) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {runningRepeatTests ? 'Çalışıyor...' : 'Tekrarlı Test (10x)'}
              </button>
              <button
                onClick={clearResults}
                disabled={results.length === 0 && repeatResults.length === 0}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: results.length === 0 && repeatResults.length === 0 ? '#e9ecef' : '#dc3545',
                  color: results.length === 0 && repeatResults.length === 0 ? '#6c757d' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: results.length === 0 && repeatResults.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: results.length === 0 && repeatResults.length === 0 ? 'none' : '0 2px 4px rgba(220, 53, 69, 0.3)',
                }}
                onMouseOver={(e) => {
                  if (results.length > 0 || repeatResults.length > 0) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Temizle
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {databases.map((db) => (
              <div key={db.name} style={{
                border: '1px solid #e9ecef',
                padding: '1rem',
                borderRadius: '10px',
                backgroundColor: '#fafbfc',
                transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#495057', fontSize: '1rem', fontWeight: '600' }}>{db.displayName}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {operations.map((op) => {
                    const key = `${db.name}-${op}`;
                    const isLoading = loading[key];
                    return (
                      <button
                        key={op}
                        onClick={() => runTest(db.name, op)}
                        disabled={isLoading || runningAllTests || runningRepeatTests}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: isLoading || runningAllTests || runningRepeatTests ? '#e9ecef' : '#007bff',
                          color: isLoading || runningAllTests || runningRepeatTests ? '#6c757d' : 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isLoading || runningAllTests ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          if (!isLoading && !runningAllTests && !runningRepeatTests) {
                            e.currentTarget.style.backgroundColor = '#0056b3';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = isLoading || runningAllTests || runningRepeatTests ? '#e9ecef' : '#007bff';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {isLoading ? 'Çalışıyor...' : `${operationLabels[op]} Testi`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repeat Test Results */}
        {repeatResults.length > 0 && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#1a1a1a', fontSize: '1.1rem', fontWeight: '600' }}>
              Tekrarlı Test Sonuçları (10 İterasyon)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '200px' }}>
                <RepeatTestChart results={repeatResults} operation="write" />
              </div>
              <div style={{ height: '200px' }}>
                <RepeatTestChart results={repeatResults} operation="read" />
              </div>
              <div style={{ height: '200px' }}>
                <RepeatTestChart results={repeatResults} operation="update" />
              </div>
            </div>
          </div>
        )}

        {/* Results Section - Compact Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Charts */}
          {results.length > 0 && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#1a1a1a', fontSize: '1.1rem', fontWeight: '600' }}>
                Performans Grafikleri
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ height: '200px' }}>
                  <PerformanceChart results={results} operation="write" />
                </div>
                <div style={{ height: '200px' }}>
                  <PerformanceChart results={results} operation="read" />
                </div>
                <div style={{ height: '200px' }}>
                  <PerformanceChart results={results} operation="update" />
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            maxHeight: results.length > 0 ? 'calc(100vh - 400px)' : 'auto',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#1a1a1a', fontSize: '1.1rem', fontWeight: '600' }}>
              Test Sonuçları
            </h2>
            {results.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#6c757d',
              }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  Henüz test sonucu yok.<br />
                  Test çalıştırmak için yukarıdaki butonları kullanın.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '0.625rem', textAlign: 'left', fontWeight: '600', color: '#495057', fontSize: '0.8rem' }}>
                        Veritabanı
                      </th>
                      <th style={{ padding: '0.625rem', textAlign: 'left', fontWeight: '600', color: '#495057', fontSize: '0.8rem' }}>
                        İşlem
                      </th>
                      <th style={{ padding: '0.625rem', textAlign: 'left', fontWeight: '600', color: '#495057', fontSize: '0.8rem' }}>
                        Süre (ms)
                      </th>
                      <th style={{ padding: '0.625rem', textAlign: 'left', fontWeight: '600', color: '#495057', fontSize: '0.8rem' }}>
                        Kayıt
                      </th>
                      <th style={{ padding: '0.625rem', textAlign: 'left', fontWeight: '600', color: '#495057', fontSize: '0.8rem' }}>
                        Bütünlük
                      </th>
                      <th style={{ padding: '0.625rem', textAlign: 'left', fontWeight: '600', color: '#495057', fontSize: '0.8rem' }}>
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #e9ecef',
                        transition: 'background-color 0.2s',
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.625rem', color: '#212529' }}>{result.database}</td>
                        <td style={{ padding: '0.625rem', color: '#495057' }}>
                          {operationLabels[result.operation] || result.operation}
                        </td>
                        <td style={{ padding: '0.625rem', color: '#495057', fontFamily: 'monospace' }}>
                          {result.timeTaken.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem', color: '#495057' }}>
                          {result.recordCount.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem' }}>
                          <span
                            style={{
                              color: result.dataIntegrity ? '#28a745' : '#dc3545',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                            }}
                          >
                            {result.dataIntegrity ? 'Başarılı' : 'Başarısız'}
                          </span>
                        </td>
                        <td style={{ padding: '0.625rem' }}>
                          {result.error ? (
                            <span style={{ color: '#dc3545', fontSize: '0.8rem' }} title={result.error}>
                              Hata
                            </span>
                          ) : (
                            <span style={{ color: '#28a745', fontSize: '0.85rem' }}>Başarılı</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

