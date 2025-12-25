import type { NextApiRequest, NextApiResponse } from 'next';
import { runTest } from '@/lib/runTest';
import { DatabaseType, OperationType, TestResult, TestStatus } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    const databases: DatabaseType[] = ['cassandra', 'mongo', 'cockroach'];
    const operations: OperationType[] = ['write', 'read', 'update'];
    const allResults: TestResult[] = [];
    const totalTests = databases.length * operations.length;
    let currentTest = 0;

    const sendStatus = (status: TestStatus) => {
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    };

    // Run tests sequentially - one database at a time, one operation at a time
    for (const db of databases) {
      for (const operation of operations) {
        currentTest++;
        const progress = Math.round((currentTest / totalTests) * 100);

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

        const dbDisplayName = dbLabels[db] || db;

        // Send starting status
        sendStatus({
          currentDatabase: dbDisplayName,
          currentOperation: operation,
          status: 'starting',
          progress,
          message: `${dbDisplayName} için ${operationLabels[operation]} işlemi başlatılıyor...`,
        });

        try {
          const recordCount = operation === 'write' ? 10000 : 1000;
          
          // Send running status
          sendStatus({
            currentDatabase: dbDisplayName,
            currentOperation: operation,
            status: 'running',
            progress,
            message: `${dbDisplayName} için ${recordCount.toLocaleString()} kayıt ${operationLabels[operation]} işlemi yapılıyor...`,
            recordCount,
          });

          const result = await runTest(db, operation);

          // Send verifying status
          sendStatus({
            currentDatabase: dbDisplayName,
            currentOperation: operation,
            status: 'verifying',
            progress,
            message: `${dbDisplayName} için ${operationLabels[operation]} işlemi sonuçları doğrulanıyor...`,
          });

          allResults.push(result);

          // Send completed status
          sendStatus({
            currentDatabase: dbDisplayName,
            currentOperation: operation,
            status: 'completed',
            progress,
            message: `${dbDisplayName} için ${operationLabels[operation]} işlemi tamamlandı. Süre: ${result.timeTaken.toLocaleString()}ms`,
          });

          // Small delay between operations
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error: any) {
          const errorResult: TestResult = {
            database: db,
            operation,
            timeTaken: 0,
            recordCount: 0,
            dataIntegrity: false,
            error: error.message,
          };
          allResults.push(errorResult);

          sendStatus({
            currentDatabase: dbDisplayName,
            currentOperation: operation,
            status: 'error',
            progress,
            message: `${dbDisplayName} için ${operationLabels[operation]} işlemi başarısız: ${error.message}`,
          });
        }
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

