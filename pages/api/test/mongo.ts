import type { NextApiRequest, NextApiResponse } from 'next';
import { runTest } from '@/lib/runTest';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { operation } = req.body;
  const validOperations = ['read', 'write', 'update'];

  if (!operation || !validOperations.includes(operation)) {
    return res.status(400).json({ error: 'Invalid operation. Must be: read, write, or update' });
  }

  try {
    const result = await runTest('mongo', operation as 'read' | 'write' | 'update');
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

