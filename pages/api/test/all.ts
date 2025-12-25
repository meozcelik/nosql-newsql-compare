import type { NextApiRequest, NextApiResponse } from 'next';
import { runTest } from '@/lib/runTest';
import { DatabaseType, OperationType, TestResult } from '@/lib/types';

interface AllTestsResult {
  results: TestResult[];
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    totalTime: number;
  };
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
    const allResults: TestResult[] = [];

    // Run tests sequentially - one database at a time, one operation at a time
    for (const db of databases) {
      for (const operation of operations) {
        try {
          const result = await runTest(db, operation);
          allResults.push(result);
          
          // Small delay between operations to ensure clean state
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          allResults.push({
            database: db,
            operation,
            timeTaken: 0,
            recordCount: 0,
            dataIntegrity: false,
            error: error.message,
          });
        }
      }
    }

    // Calculate summary
    const summary = {
      totalTests: allResults.length,
      successfulTests: allResults.filter(r => !r.error && r.dataIntegrity).length,
      failedTests: allResults.filter(r => r.error || !r.dataIntegrity).length,
      totalTime: allResults.reduce((sum, r) => sum + r.timeTaken, 0),
    };

    const response: AllTestsResult = {
      results: allResults,
      summary,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
