export type DatabaseType = 'cassandra' | 'mongo' | 'cockroach';
export type OperationType = 'read' | 'write' | 'update';

export interface TestRecord {
  id: string;
  user_id: number;
  name: string;
  email: string;
  age: number;
  created_at: Date;
  data: string;
}

export interface TestResult {
  database: string;
  operation: OperationType;
  timeTaken: number; // milliseconds
  recordCount: number;
  dataIntegrity: boolean;
  error?: string;
}

export interface TestStatus {
  currentDatabase: string;
  currentOperation: OperationType;
  status: 'starting' | 'running' | 'verifying' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  recordCount?: number;
  iteration?: number;
  total?: number;
}

export interface RepeatTestResult {
  database: string;
  operation: OperationType;
  times: number[]; // Array of time taken for each run
  average: number;
  min: number;
  max: number;
}
