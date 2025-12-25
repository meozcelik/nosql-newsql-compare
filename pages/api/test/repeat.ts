import type { NextApiRequest, NextApiResponse } from 'next';
import { runTest } from '@/lib/runTest';
import { DatabaseType, OperationType, TestResult } from '@/lib/types';

interface RepeatTestResult {
  database: string;
  operation: OperationType;
  times: number[]; // Array of time taken for each run
  average: number;
  min: number;
  max: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const databases: DatabaseType[] = ['cassandra', 'mongo', 'cockroach'];
    const operations: OperationType[] = ['write', 'read', 'update'];
    const repeatCount = 10;
    const allResults: RepeatTestResult[] = [];

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendStatus = (status: any) => {
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    };

    const dbLabels: { [key: string]: string } = {
      cassandra: 'Cassandra',
      mongo: 'MongoDB',
      cockroach: 'CockroachDB',
    };

    const operationLabels: { [key: string]: string } = {
      write: 'yazma',
      read: 'okuma',
      update: 'güncelleme',
    };

    let totalTests = 0;
    const totalOperations = databases.length * operations.length * repeatCount;

    // Run tests: for each database, for each operation, repeat 10 times
    for (const db of databases) {
      for (const operation of operations) {
        const dbDisplayName = dbLabels[db];
        const times: number[] = [];

        sendStatus({
          type: 'start',
          database: dbDisplayName,
          operation,
          message: `${dbDisplayName} için ${operationLabels[operation]} işlemi 10 kez çalıştırılıyor...`,
        });

        for (let i = 0; i < repeatCount; i++) {
          totalTests++;
          const progress = Math.round((totalTests / totalOperations) * 100);

          try {
            sendStatus({
              type: 'running',
              database: dbDisplayName,
              operation,
              iteration: i + 1,
              total: repeatCount,
              progress,
              message: `${dbDisplayName} - ${operationLabels[operation]} (${i + 1}/${repeatCount}) çalıştırılıyor...`,
            });

            const result = await runTest(db, operation);
            times.push(result.timeTaken);

            // Small delay between iterations
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            console.error(`Error in iteration ${i + 1}:`, error);
            times.push(0); // Failed test
          }
        }

        // Calculate statistics
        const validTimes = times.filter(t => t > 0);
        const average = validTimes.length > 0 
          ? validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length 
          : 0;
        const min = validTimes.length > 0 ? Math.min(...validTimes) : 0;
        const max = validTimes.length > 0 ? Math.max(...validTimes) : 0;

        const repeatResult: RepeatTestResult = {
          database: dbDisplayName,
          operation,
          times,
          average,
          min,
          max,
        };

        allResults.push(repeatResult);

        sendStatus({
          type: 'completed',
          database: dbDisplayName,
          operation,
          result: repeatResult,
          message: `${dbDisplayName} - ${operationLabels[operation]} tamamlandı. Ortalama: ${Math.round(average)}ms`,
        });

        // Delay between operations
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Send final results
    res.write(`data: ${JSON.stringify({ type: 'complete', results: allResults })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
}

