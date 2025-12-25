#!/bin/bash

echo "Waiting for databases to be ready..."

# Wait for Cassandra
echo "Waiting for Cassandra..."
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # First check if container is running
  if ! docker ps | grep -q nosql-cassandra; then
    echo "Cassandra container is not running yet... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
    sleep 3
    ATTEMPT=$((ATTEMPT+1))
    continue
  fi
  
  # Check if port is open and CQL is responding
  if docker exec nosql-cassandra cqlsh -e "SELECT now() FROM system.local;" > /dev/null 2>&1; then
    echo "Cassandra is ready!"
    break
  fi
  echo "Cassandra is not ready yet... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
  sleep 3
  ATTEMPT=$((ATTEMPT+1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Warning: Cassandra may not be fully ready, but continuing..."
fi

# Wait for MongoDB
echo "Waiting for MongoDB..."
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # First check if container is running
  if ! docker ps | grep -q nosql-mongodb; then
    echo "MongoDB container is not running yet... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
    sleep 3
    ATTEMPT=$((ATTEMPT+1))
    continue
  fi
  
  if docker exec nosql-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "MongoDB is ready!"
    break
  fi
  echo "MongoDB is not ready yet... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
  sleep 3
  ATTEMPT=$((ATTEMPT+1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Warning: MongoDB may not be fully ready, but continuing..."
fi

# Wait for CockroachDB
echo "Waiting for CockroachDB..."
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # First check if container is running
  if ! docker ps | grep -q nosql-cockroachdb; then
    echo "CockroachDB container is not running yet... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
    sleep 3
    ATTEMPT=$((ATTEMPT+1))
    continue
  fi
  
  if docker exec nosql-cockroachdb cockroach sql --insecure -e "SELECT 1" > /dev/null 2>&1; then
    echo "CockroachDB is ready!"
    break
  fi
  echo "CockroachDB is not ready yet... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
  sleep 3
  ATTEMPT=$((ATTEMPT+1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Warning: CockroachDB may not be fully ready, but continuing..."
fi

echo "All databases are ready!"

