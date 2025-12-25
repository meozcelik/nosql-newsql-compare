import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TestResult } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceChartProps {
  results: TestResult[];
  operation: 'write' | 'read' | 'update';
}

export default function PerformanceChart({ results, operation }: PerformanceChartProps) {
  // Filter results for this operation
  const operationResults = results.filter((r) => r.operation === operation);

  // Group by database
  const cassandraResult = operationResults.find((r) => r.database === 'Cassandra');
  const mongoResult = operationResults.find((r) => r.database === 'MongoDB');
  const cockroachResult = operationResults.find((r) => r.database === 'CockroachDB');

  const data = {
    labels: ['Cassandra', 'MongoDB', 'CockroachDB'],
    datasets: [
      {
        label: `Süre (ms)`,
        data: [
          cassandraResult?.timeTaken || 0,
          mongoResult?.timeTaken || 0,
          cockroachResult?.timeTaken || 0,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const operationLabels: { [key: string]: string } = {
    write: 'Yazma',
    read: 'Okuma',
    update: 'Güncelleme',
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `${operationLabels[operation]} İşlemi Performansı`,
        font: {
          size: 14,
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const result = operationResults.find(
              (r) => r.database === context.label
            );
            if (result) {
              return [
                `Kayıt Sayısı: ${result.recordCount.toLocaleString()}`,
                `Veri Bütünlüğü: ${result.dataIntegrity ? 'Başarılı' : 'Başarısız'}`,
                result.error ? `Hata: ${result.error}` : '',
              ].filter(Boolean);
            }
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Süre (milisaniye)',
          font: {
            size: 12,
          },
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  if (operationResults.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#999',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        {operationLabels[operation] || operation} işlemi için test sonucu bulunamadı
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '0.5rem', height: '200px' }}>
      <Bar data={data} options={options} />
    </div>
  );
}

