#!/bin/bash

# Update package lists and install PostgreSQL
sudo dnf update -y
sudo systemctl start sshd
sudo systemctl enable sshd
sudo yum install -y postgresql
sudo yum install -y firewalld


# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Start and enable Firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Create a new PostgreSQL user and database
echo "Creating PostgreSQL user and database..."
sudo -u postgres "psql -c \"CREATE USER developer WITH PASSWORD 'postgres';\""
sudo -u postgres "psql -c \"CREATE DATABASE IF NOT EXISTS registry_database OWNER developer;\""

# Connect to the PostgreSQL database and create schema and table
echo "Creating schema and table in PostgreSQL database..."
sudo -u postgres psql -d registry_database -c "CREATE SCHEMA IF NOT EXISTS registration_schema;"
sudo -u postgres psql -d registry_database -c "CREATE TABLE IF NOT EXISTS registration_schema.business_registry (
    registrationid VARCHAR PRIMARY KEY,
    businessname VARCHAR(255),
    fca_approved BOOLEAN,
    hmrc_approved BOOLEAN,
    gambling_approved BOOLEAN
);"

# Configure firewall (if using firewall-cmd)
sudo firewall-cmd --zone=public --add-service=ssh --permanent
sudo firewall-cmd --reload

# Allow remote connections to PostgreSQL
# Note: This may pose a security risk, so use with caution
echo "Configuring PostgreSQL for remote access..."
# Modify postgresql.conf to listen on all network interfaces
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /var/lib/pgsql/data/postgresql.conf
# Modify pg_hba.conf to allow remote connections from any IP address
sudo sh -c "echo 'host all all 0.0.0.0/0 md5' >> /var/lib/pgsql/data/pg_hba.conf"

# Restart PostgreSQL service to apply changes
sudo systemctl restart postgresql

echo "PostgreSQL setup complete."
echo "Please connect to the server manually using SSH:"
echo "ssh -i /path/to/private/cloud.key centos@10.72.101.146"
