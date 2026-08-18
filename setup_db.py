#!/usr/bin/env python3
"""Create database and user for CRE Comps if they don't exist."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Try to create database and user using psql
# This will prompt for postgres password if needed

create_user_sql = """
-- Create user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'statbrio') THEN
        CREATE USER statbrio WITH PASSWORD '2001';
    END IF;
END
$$;
"""

create_db_sql = """
-- Create database if not exists
SELECT 'CREATE DATABASE cre_comps OWNER statbrio'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cre_comps')\gexec
"""

grant_sql = """
-- Grant permissions
GRANT ALL ON SCHEMA public TO statbrio;
"""

# Try with trusted connection first (no password needed if local)
try:
    # Try to connect as postgres
    result = subprocess.run(
        ["psql", "-U", "postgres", "-c", "SELECT 1"],
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result.returncode == 0:
        print("✓ PostgreSQL connection successful")
        
        # Create user
        result = subprocess.run(
            ["psql", "-U", "postgres", "-c", create_user_sql],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✓ User creation/check successful")
        else:
            print(f"✗ User creation failed: {result.stderr}")
        
        # Create database
        result = subprocess.run(
            ["psql", "-U", "postgres", "-c", create_db_sql],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✓ Database creation/check successful")
        else:
            print(f"✗ Database creation failed: {result.stderr}")
        
        # Grant permissions
        result = subprocess.run(
            ["psql", "-U", "postgres", "-d", "cre_comps", "-c", grant_sql],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✓ Permissions granted")
        else:
            print(f"✗ Permission grant failed: {result.stderr}")
            
    else:
        print(f"✗ PostgreSQL connection failed: {result.stderr}")
        print("\nPlease make sure PostgreSQL is running and provide the password when prompted.")
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    print("✗ PostgreSQL connection timed out")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

print("\n✓ Database setup completed!")
