import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { RepeatTestResult } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RepeatTestChartProps {
  results: RepeatTestResult[];
  operation: 'write' | 'read' | 'update';
}

export default function RepeatTestChart({ results, operation }: RepeatTestChartProps) {
  // Filter results for this operation
  const operationResults = results.filter((r) => r.operation === operation);

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
        {operation} işlemi için test sonucu bulunamadı
      </div>
    );
  }

  const operationLabels: { [key: string]: string } = {
    write: 'Yazma',
    read: 'Okuma',
    update: 'Güncelleme',
  };

  // Prepare data for line chart
  const iterations = Array.from({ length: 10 }, (_, i) => i + 1);
  
  const cassandraResult = operationResults.find((r) => r.database === 'Cassandra');
  const mongoResult = operationResults.find((r) => r.database === 'MongoDB');
  const cockroachResult = operationResults.find((r) => r.database === 'CockroachDB');

  const datasets = [];

  if (cassandraResult) {
    datasets.push({
      label: 'Cassandra',
      data: cassandraResult.times,
      borderColor: 'rgba(54, 162, 235, 1)',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  }

  if (mongoResult) {
    datasets.push({
      label: 'MongoDB',
      data: mongoResult.times,
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.1)',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  }

  if (cockroachResult) {
    datasets.push({
      label: 'CockroachDB',
      data: cockroachResult.times,
      borderColor: 'rgba(255, 99, 132, 1)',
      backgroundColor: 'rgba(255, 99, 132, 0.1)',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  }

  const data = {
    labels: iterations.map(i => `Test ${i}`),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 11,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: `${operationLabels[operation]} İşlemi - 10 Tekrar Performans Karşılaştırması`,
        font: {
          size: 13,
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const result = operationResults.find(
              (r) => r.database === context.dataset.label
            );
            if (result) {
              return [
                `Ortalama: ${Math.round(result.average).toLocaleString()}ms`,
                `Min: ${result.min.toLocaleString()}ms`,
                `Max: ${result.max.toLocaleString()}ms`,
              ];
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
            size: 11,
          },
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: 'Test İterasyonu',
          font: {
            size: 11,
          },
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
  };

  return (
    <div style={{ marginBottom: '0.5rem', height: '200px' }}>
      <Line data={data} options={options} />
    </div>
  );
}

