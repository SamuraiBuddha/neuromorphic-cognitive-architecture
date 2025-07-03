@echo off
REM Neuromorphic Database Setup - Windows Batch Version
echo 🧠 Neuromorphic Database Setup (Windows)
echo ================================

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo 📋 Pulling latest changes...
git pull origin main

echo 🔄 Restarting containers with fresh volumes...
docker-compose down -v
docker-compose up -d

echo ⏳ Waiting 30 seconds for containers to start...
timeout /t 30 /nobreak >nul

echo 📋 Creating neuromorphic database...
docker exec neuromorphic-neocortex psql -U neuromorphic -c "CREATE DATABASE neuromorphic;" 2>nul

echo 🗄️ Creating schema tables...
docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "CREATE TABLE IF NOT EXISTS neuromorphic_entities (id SERIAL PRIMARY KEY, entity_type VARCHAR(100) NOT NULL, name VARCHAR(500) NOT NULL, content TEXT NOT NULL, embedding TEXT, metadata JSONB DEFAULT '{}', brain_region VARCHAR(50) DEFAULT 'neocortex', importance_score REAL DEFAULT 0.5, access_count INTEGER DEFAULT 0, created_by VARCHAR(100) DEFAULT 'Neuromorphic-001', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), UNIQUE(entity_type, name));"

docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "CREATE TABLE IF NOT EXISTS neuromorphic_observations (id SERIAL PRIMARY KEY, entity_id INTEGER REFERENCES neuromorphic_entities(id) ON DELETE CASCADE, observation TEXT NOT NULL, embedding TEXT, brain_region VARCHAR(50) DEFAULT 'neocortex', source VARCHAR(100) DEFAULT 'Neuromorphic-001', timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW());"

docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "CREATE TABLE IF NOT EXISTS neuromorphic_relationships (id SERIAL PRIMARY KEY, from_entity_id INTEGER REFERENCES neuromorphic_entities(id) ON DELETE CASCADE, to_entity_id INTEGER REFERENCES neuromorphic_entities(id) ON DELETE CASCADE, relationship_type VARCHAR(100) NOT NULL, properties JSONB DEFAULT '{}', strength REAL DEFAULT 1.0, created_by VARCHAR(100) DEFAULT 'Neuromorphic-001', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), UNIQUE(from_entity_id, to_entity_id, relationship_type));"

echo 📊 Creating indexes...
docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_type ON neuromorphic_entities(entity_type); CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_brain_region ON neuromorphic_entities(brain_region);"

echo 🌱 Inserting bootstrap data...
docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "INSERT INTO neuromorphic_entities (entity_type, name, content, brain_region, metadata, importance_score, created_by) VALUES ('System_Bootstrap', 'Neuromorphic_System_Initialize_2025-07-03', 'Neuromorphic cognitive architecture initialized with 6 specialized brain regions', 'neocortex', '{\"status\": \"ready\", \"brain_regions\": 6}', 1.0, 'Neuromorphic-001') ON CONFLICT (entity_type, name) DO NOTHING;"

echo ✅ Verifying setup...
docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "\dt"

echo 🧠 Database setup complete!
echo 🚀 Next step: python src/neuromorphic_mcp_server.py
pause
