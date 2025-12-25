import { v4 as uuidv4 } from 'uuid';
import { connectCassandra, connectMongoDB, connectCockroachDB, getCassandraClient, getMongoDB, getCockroachDBClient } from './dbConnectors';
import { DatabaseType, OperationType, TestRecord, TestResult } from './types';

const RECORD_COUNT = 10000;

/**
 * Generate test data
 */
function generateTestData(count: number): TestRecord[] {
  const records: TestRecord[] = [];
  for (let i = 0; i < count; i++) {
    records.push({
      id: uuidv4(),
      user_id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 20 + (i % 50),
      created_at: new Date(),
      data: `Test data for user ${i + 1}`,
    });
  }
  return records;
}

/**
 * Run write test for Cassandra
 */
async function runCassandraWriteTest(records: TestRecord[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const client = getCassandraClient();
    if (!client) {
      throw new Error('Cassandra client not initialized');
    }

    // Bulk insert using batch
    const queries = records.map((record) => ({
      query: 'INSERT INTO test_data (id, user_id, name, email, age, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [record.id, record.user_id, record.name, record.email, record.age, record.created_at, record.data],
    }));

    // Execute in batches of 100
    const batchSize = 100;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      await Promise.all(
        batch.map((q) => client.execute(q.query, q.params, { prepare: true }))
      );
    }

    // Verify data integrity - read one record
    const verifyRecord = records[0];
    const result = await client.execute(
      'SELECT * FROM test_data WHERE id = ?',
      [verifyRecord.id],
      { prepare: true }
    );

    if (result.rows.length === 0 || result.rows[0].get('name') !== verifyRecord.name) {
      dataIntegrity = false;
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'Cassandra',
      operation: 'write',
      timeTaken,
      recordCount: records.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'Cassandra',
      operation: 'write',
      timeTaken: Date.now() - startTime,
      recordCount: records.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run read test for Cassandra
 */
async function runCassandraReadTest(recordIds: string[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const client = getCassandraClient();
    if (!client) {
      throw new Error('Cassandra client not initialized');
    }

    // First, get existing records from database (Cassandra LIMIT doesn't support parameters)
    const limitCount = Math.min(recordIds.length, 1000);
    const existingRecords = await client.execute(`SELECT id FROM test_data LIMIT ${limitCount}`, [], { prepare: false });

    if (existingRecords.rows.length === 0) {
      // No records exist, return failure
      return {
        database: 'Cassandra',
        operation: 'read',
        timeTaken: Date.now() - startTime,
        recordCount: 0,
        dataIntegrity: false,
        error: 'No records found in database. Please run Write test first.',
      };
    }

    // Use existing record IDs
    const idsToRead = existingRecords.rows.slice(0, Math.min(recordIds.length, 1000)).map((row) => row.get('id').toString());

    // Read records
    const readPromises = idsToRead.map((id) =>
      client.execute('SELECT * FROM test_data WHERE id = ?', [id], { prepare: true })
    );

    const results = await Promise.all(readPromises);

    // Verify data integrity - check that all records were found and have expected fields
    if (results.some((r) => r.rows.length === 0)) {
      dataIntegrity = false;
    } else {
      // Verify that records have expected structure
      const firstResult = results[0].rows[0];
      if (!firstResult || !firstResult.get('id') || !firstResult.get('name')) {
        dataIntegrity = false;
      }
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'Cassandra',
      operation: 'read',
      timeTaken,
      recordCount: idsToRead.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'Cassandra',
      operation: 'read',
      timeTaken: Date.now() - startTime,
      recordCount: recordIds.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run update test for Cassandra
 */
async function runCassandraUpdateTest(recordIds: string[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const client = getCassandraClient();
    if (!client) {
      throw new Error('Cassandra client not initialized');
    }

    // First, get existing records from database (Cassandra LIMIT doesn't support parameters)
    const limitCount = Math.min(recordIds.length, 1000);
    const existingRecords = await client.execute(`SELECT id FROM test_data LIMIT ${limitCount}`, [], { prepare: false });

    if (existingRecords.rows.length === 0) {
      // No records exist, return failure
      return {
        database: 'Cassandra',
        operation: 'update',
        timeTaken: Date.now() - startTime,
        recordCount: 0,
        dataIntegrity: false,
        error: 'No records found in database. Please run Write test first.',
      };
    }

    // Use existing record IDs
    const idsToUpdate = existingRecords.rows.slice(0, Math.min(recordIds.length, 1000)).map((row) => row.get('id').toString());

    // Update records
    const updatePromises = idsToUpdate.map((id) =>
      client.execute(
        'UPDATE test_data SET name = ?, age = ? WHERE id = ?',
        [`Updated User ${id}`, 99, id],
        { prepare: true }
      )
    );

    await Promise.all(updatePromises);

    // Verify update
    const verifyResult = await client.execute(
      'SELECT * FROM test_data WHERE id = ?',
      [idsToUpdate[0]],
      { prepare: true }
    );

    if (verifyResult.rows.length === 0 || verifyResult.rows[0].get('age') !== 99) {
      dataIntegrity = false;
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'Cassandra',
      operation: 'update',
      timeTaken,
      recordCount: idsToUpdate.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'Cassandra',
      operation: 'update',
      timeTaken: Date.now() - startTime,
      recordCount: recordIds.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run write test for MongoDB
 */
async function runMongoWriteTest(records: TestRecord[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const db = getMongoDB();
    if (!db) {
      throw new Error('MongoDB client not initialized');
    }

    const collection = db.collection('test_data');

    // Convert to MongoDB format
    const mongoRecords = records.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      email: r.email,
      age: r.age,
      created_at: r.created_at,
      data: r.data,
    }));

    // Bulk insert
    await collection.insertMany(mongoRecords, { ordered: false });

    // Verify data integrity
    const verifyRecord = await collection.findOne({ id: records[0].id });
    if (!verifyRecord || verifyRecord.name !== records[0].name) {
      dataIntegrity = false;
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'MongoDB',
      operation: 'write',
      timeTaken,
      recordCount: records.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'MongoDB',
      operation: 'write',
      timeTaken: Date.now() - startTime,
      recordCount: records.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run read test for MongoDB
 */
async function runMongoReadTest(recordIds: string[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const db = getMongoDB();
    if (!db) {
      throw new Error('MongoDB client not initialized');
    }

    const collection = db.collection('test_data');

    // First, get existing records from database
    const existingRecords = await collection.find({}).limit(recordIds.length).toArray();

    if (existingRecords.length === 0) {
      // No records exist, return failure
      return {
        database: 'MongoDB',
        operation: 'read',
        timeTaken: Date.now() - startTime,
        recordCount: 0,
        dataIntegrity: false,
        error: 'No records found in database. Please run Write test first.',
      };
    }

    // Use existing record IDs
    const idsToRead = existingRecords.slice(0, Math.min(recordIds.length, 1000)).map((r) => r.id);

    // Read records
    const readPromises = idsToRead.map((id) => collection.findOne({ id }));
    const results = await Promise.all(readPromises);

    // Verify data integrity - check that all records were found and have expected fields
    if (results.some((r) => !r)) {
      dataIntegrity = false;
    } else {
      // Verify that records have expected structure
      const firstResult = results[0];
      if (!firstResult || !firstResult.id || !firstResult.name) {
        dataIntegrity = false;
      }
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'MongoDB',
      operation: 'read',
      timeTaken,
      recordCount: idsToRead.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'MongoDB',
      operation: 'read',
      timeTaken: Date.now() - startTime,
      recordCount: recordIds.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run update test for MongoDB
 */
async function runMongoUpdateTest(recordIds: string[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const db = getMongoDB();
    if (!db) {
      throw new Error('MongoDB client not initialized');
    }

    const collection = db.collection('test_data');

    // First, get existing records from database
    const existingRecords = await collection.find({}).limit(recordIds.length).toArray();

    if (existingRecords.length === 0) {
      // No records exist, return failure
      return {
        database: 'MongoDB',
        operation: 'update',
        timeTaken: Date.now() - startTime,
        recordCount: 0,
        dataIntegrity: false,
        error: 'No records found in database. Please run Write test first.',
      };
    }

    // Use existing record IDs
    const idsToUpdate = existingRecords.slice(0, Math.min(recordIds.length, 1000)).map((r) => r.id);

    // Update records
    const updatePromises = idsToUpdate.map((id) =>
      collection.updateOne(
        { id },
        { $set: { name: `Updated User ${id}`, age: 99 } }
      )
    );

    await Promise.all(updatePromises);

    // Verify update
    const verifyRecord = await collection.findOne({ id: idsToUpdate[0] });
    if (!verifyRecord || verifyRecord.age !== 99) {
      dataIntegrity = false;
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'MongoDB',
      operation: 'update',
      timeTaken,
      recordCount: idsToUpdate.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'MongoDB',
      operation: 'update',
      timeTaken: Date.now() - startTime,
      recordCount: recordIds.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run write test for CockroachDB
 */
async function runCockroachWriteTest(records: TestRecord[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const client = getCockroachDBClient();
    if (!client) {
      throw new Error('CockroachDB client not initialized');
    }

    // Bulk insert using parameterized queries
    const insertQuery = `
      INSERT INTO test_data (id, user_id, name, email, age, created_at, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    // Execute in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.all(
        batch.map((record) =>
          client.query(insertQuery, [
            record.id,
            record.user_id,
            record.name,
            record.email,
            record.age,
            record.created_at,
            record.data,
          ])
        )
      );
    }

    // Verify data integrity - with proper type checking
    const verifyResult = await client.query('SELECT * FROM test_data WHERE id = $1', [records[0].id]);
    if (verifyResult.rows.length === 0) {
      dataIntegrity = false;
    } else {
      const row = verifyResult.rows[0];
      // Check name with type safety
      const nameMatches = row.name && String(row.name) === String(records[0].name);
      if (!nameMatches) {
        dataIntegrity = false;
      }
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'CockroachDB',
      operation: 'write',
      timeTaken,
      recordCount: records.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'CockroachDB',
      operation: 'write',
      timeTaken: Date.now() - startTime,
      recordCount: records.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run read test for CockroachDB
 */
async function runCockroachReadTest(recordIds: string[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const client = getCockroachDBClient();
    if (!client) {
      throw new Error('CockroachDB client not initialized');
    }

    // First, get existing records from database
    const existingRecordsResult = await client.query('SELECT id FROM test_data LIMIT $1', [recordIds.length]);

    if (existingRecordsResult.rows.length === 0) {
      // No records exist, return failure
      return {
        database: 'CockroachDB',
        operation: 'read',
        timeTaken: Date.now() - startTime,
        recordCount: 0,
        dataIntegrity: false,
        error: 'No records found in database. Please run Write test first.',
      };
    }

    // Use existing record IDs
    const idsToRead = existingRecordsResult.rows.slice(0, Math.min(recordIds.length, 1000)).map((row) => row.id);

    // Read records using parameterized queries
    const readPromises = idsToRead.map((id) =>
      client.query('SELECT * FROM test_data WHERE id = $1', [id])
    );

    const results = await Promise.all(readPromises);

    // Verify data integrity - check that all records were found and have expected fields
    if (results.some((r) => r.rows.length === 0)) {
      dataIntegrity = false;
    } else {
      // Verify that records have expected structure
      const firstResult = results[0].rows[0];
      if (!firstResult || !firstResult.id || !firstResult.name) {
        dataIntegrity = false;
      } else {
        // Additional check: verify data types are correct
        const hasValidStructure =
          firstResult.id !== null &&
          firstResult.id !== undefined &&
          firstResult.name !== null &&
          firstResult.name !== undefined &&
          firstResult.age !== null &&
          firstResult.age !== undefined;

        if (!hasValidStructure) {
          dataIntegrity = false;
        }
      }
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'CockroachDB',
      operation: 'read',
      timeTaken,
      recordCount: idsToRead.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'CockroachDB',
      operation: 'read',
      timeTaken: Date.now() - startTime,
      recordCount: recordIds.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Run update test for CockroachDB
 */
async function runCockroachUpdateTest(recordIds: string[]): Promise<TestResult> {
  const startTime = Date.now();
  let dataIntegrity = true;
  let error: string | undefined;

  try {
    const client = getCockroachDBClient();
    if (!client) {
      throw new Error('CockroachDB client not initialized');
    }

    // First, get existing records from database
    const existingRecordsResult = await client.query('SELECT id FROM test_data LIMIT $1', [recordIds.length]);

    if (existingRecordsResult.rows.length === 0) {
      // No records exist, return failure
      return {
        database: 'CockroachDB',
        operation: 'update',
        timeTaken: Date.now() - startTime,
        recordCount: 0,
        dataIntegrity: false,
        error: 'No records found in database. Please run Write test first.',
      };
    }

    // Use existing record IDs
    const idsToUpdate = existingRecordsResult.rows.slice(0, Math.min(recordIds.length, 1000)).map((row) => row.id);

    // Update records using parameterized queries
    const updatePromises = idsToUpdate.map((id) =>
      client.query('UPDATE test_data SET name = $1, age = $2 WHERE id = $3', [
        `Updated User ${id}`,
        99,
        id,
      ])
    );

    await Promise.all(updatePromises);

    // Small delay to ensure updates are committed (CockroachDB distributed nature)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify update - with proper type conversion
    const verifyResult = await client.query('SELECT * FROM test_data WHERE id = $1', [idsToUpdate[0]]);
    if (verifyResult.rows.length === 0) {
      dataIntegrity = false;
    } else {
      const row = verifyResult.rows[0];
      // Convert age to number and check both age and name
      const ageValue = typeof row.age === 'string' ? parseInt(row.age, 10) : Number(row.age);
      const nameMatches = row.name && row.name.includes('Updated User');

      if (ageValue !== 99 || !nameMatches) {
        dataIntegrity = false;
      }
    }

    const timeTaken = Date.now() - startTime;
    return {
      database: 'CockroachDB',
      operation: 'update',
      timeTaken,
      recordCount: idsToUpdate.length,
      dataIntegrity,
    };
  } catch (err: any) {
    error = err.message;
    return {
      database: 'CockroachDB',
      operation: 'update',
      timeTaken: Date.now() - startTime,
      recordCount: recordIds.length,
      dataIntegrity: false,
      error,
    };
  }
}

/**
 * Main test runner function
 */
export async function runTest(
  dbType: DatabaseType,
  operation: OperationType
): Promise<TestResult> {
  try {
    // Connect to database
    switch (dbType) {
      case 'cassandra':
        await connectCassandra();
        break;
      case 'mongo':
        await connectMongoDB();
        break;
      case 'cockroach':
        await connectCockroachDB();
        break;
    }

    // Generate test data
    const testRecords = generateTestData(RECORD_COUNT);
    const recordIds = testRecords.map((r) => r.id);

    // Run appropriate test
    switch (dbType) {
      case 'cassandra':
        switch (operation) {
          case 'write':
            return await runCassandraWriteTest(testRecords);
          case 'read':
            return await runCassandraReadTest(recordIds.slice(0, 1000)); // Read 1000 records
          case 'update':
            return await runCassandraUpdateTest(recordIds.slice(0, 1000)); // Update 1000 records
        }
        break;

      case 'mongo':
        switch (operation) {
          case 'write':
            return await runMongoWriteTest(testRecords);
          case 'read':
            return await runMongoReadTest(recordIds.slice(0, 1000)); // Read 1000 records
          case 'update':
            return await runMongoUpdateTest(recordIds.slice(0, 1000)); // Update 1000 records
        }
        break;

      case 'cockroach':
        switch (operation) {
          case 'write':
            return await runCockroachWriteTest(testRecords);
          case 'read':
            return await runCockroachReadTest(recordIds.slice(0, 1000)); // Read 1000 records
          case 'update':
            return await runCockroachUpdateTest(recordIds.slice(0, 1000)); // Update 1000 records
        }
        break;
    }

    throw new Error(`Unsupported database type: ${dbType}`);
  } catch (error: any) {
    return {
      database: dbType,
      operation,
      timeTaken: 0,
      recordCount: 0,
      dataIntegrity: false,
      error: error.message,
    };
  }
}

