import { Client as CassandraClient } from 'cassandra-driver';
import { MongoClient, Db } from 'mongodb';
import { Client as CockroachClient } from 'pg';

// Connection instances
let cassandraClient: CassandraClient | null = null;
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let cockroachClient: CockroachClient | null = null;

// Environment variables
const CASSANDRA_HOST = process.env.CASSANDRA_HOST || 'localhost';
const CASSANDRA_PORT = parseInt(process.env.CASSANDRA_PORT || '9042');
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'test_keyspace';
const CASSANDRA_DATACENTER = process.env.CASSANDRA_DATACENTER || 'datacenter1';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/test_db?authSource=admin';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'test_db';

const COCKROACHDB_HOST = process.env.COCKROACHDB_HOST || 'localhost';
const COCKROACHDB_PORT = parseInt(process.env.COCKROACHDB_PORT || '26257');
const COCKROACHDB_USER = process.env.COCKROACHDB_USER || 'root';
const COCKROACHDB_PASSWORD = process.env.COCKROACHDB_PASSWORD || '';
const COCKROACHDB_DATABASE = process.env.COCKROACHDB_DATABASE || 'test_db';
const COCKROACHDB_SSL = process.env.COCKROACHDB_SSL === 'true';

/**
 * Initialize Cassandra connection
 */
export async function connectCassandra(): Promise<CassandraClient> {
  if (cassandraClient) {
    return cassandraClient;
  }

  try {
    // First connect without keyspace to create it
    const tempClient = new CassandraClient({
      contactPoints: [`${CASSANDRA_HOST}:${CASSANDRA_PORT}`],
      localDataCenter: CASSANDRA_DATACENTER,
    });

    // Create keyspace if it doesn't exist
    await tempClient.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${CASSANDRA_KEYSPACE}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);

    await tempClient.shutdown();

    // Now connect with keyspace
    cassandraClient = new CassandraClient({
      contactPoints: [`${CASSANDRA_HOST}:${CASSANDRA_PORT}`],
      localDataCenter: CASSANDRA_DATACENTER,
      keyspace: CASSANDRA_KEYSPACE,
    });

    // Create table if it doesn't exist
    await cassandraClient.execute(`
      CREATE TABLE IF NOT EXISTS test_data (
        id UUID PRIMARY KEY,
        user_id INT,
        name TEXT,
        email TEXT,
        age INT,
        created_at TIMESTAMP,
        data TEXT
      )
    `);

    console.log('Cassandra connected successfully');
    return cassandraClient;
  } catch (error) {
    console.error('Cassandra connection error:', error);
    throw error;
  }
}

/**
 * Initialize MongoDB connection
 */
export async function connectMongoDB(): Promise<Db> {
  if (mongoDb) {
    return mongoDb;
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }

  mongoDb = mongoClient.db(MONGODB_DB_NAME);

  // Create collection if it doesn't exist (MongoDB creates it automatically on first insert)
  // But we can ensure indexes
  try {
    await mongoDb.collection('test_data').createIndex({ id: 1 }, { unique: true });
  } catch (error: any) {
    // Index might already exist, ignore error
    if (!error.message.includes('already exists') && !error.message.includes('duplicate key')) {
      console.warn('MongoDB index creation warning:', error.message);
    }
  }

  console.log('MongoDB connected successfully');
  return mongoDb;
}

/**
 * Initialize CockroachDB connection
 */
export async function connectCockroachDB(): Promise<CockroachClient> {
  if (cockroachClient) {
    return cockroachClient;
  }

  try {
    // First connect to default database to create the target database
    const tempClient = new CockroachClient({
      host: COCKROACHDB_HOST,
      port: COCKROACHDB_PORT,
      user: COCKROACHDB_USER,
      password: COCKROACHDB_PASSWORD,
      database: 'defaultdb', // Default database in CockroachDB
      ssl: COCKROACHDB_SSL ? { rejectUnauthorized: false } : false,
    });

    await tempClient.connect();

    // Create database if it doesn't exist (CockroachDB doesn't support IF NOT EXISTS, so we catch the error)
    try {
      await tempClient.query(`CREATE DATABASE ${COCKROACHDB_DATABASE}`);
    } catch (error: any) {
      // Database already exists, ignore error
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    await tempClient.end();

    // Now connect to the target database
    cockroachClient = new CockroachClient({
      host: COCKROACHDB_HOST,
      port: COCKROACHDB_PORT,
      user: COCKROACHDB_USER,
      password: COCKROACHDB_PASSWORD,
      database: COCKROACHDB_DATABASE,
      ssl: COCKROACHDB_SSL ? { rejectUnauthorized: false } : false,
    });

    await cockroachClient.connect();

    // Create table if it doesn't exist
    await cockroachClient.query(`
      CREATE TABLE IF NOT EXISTS test_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT,
        name TEXT,
        email TEXT,
        age INT,
        created_at TIMESTAMP DEFAULT NOW(),
        data TEXT
      )
    `);

    console.log('CockroachDB connected successfully');
    return cockroachClient;
  } catch (error) {
    console.error('CockroachDB connection error:', error);
    throw error;
  }
}

/**
 * Close all database connections
 */
export async function closeAllConnections(): Promise<void> {
  if (cassandraClient) {
    await cassandraClient.shutdown();
    cassandraClient = null;
  }

  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
  }

  if (cockroachClient) {
    await cockroachClient.end();
    cockroachClient = null;
  }
}

/**
 * Get Cassandra client instance
 */
export function getCassandraClient(): CassandraClient | null {
  return cassandraClient;
}

/**
 * Get MongoDB database instance
 */
export function getMongoDB(): Db | null {
  return mongoDb;
}

/**
 * Get CockroachDB client instance
 */
export function getCockroachDBClient(): CockroachClient | null {
  return cockroachClient;
}

