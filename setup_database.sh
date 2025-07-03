#!/bin/bash
# Neuromorphic Database Initialization Script
# Run this to set up the neuromorphic database manually

echo "🧠 Neuromorphic Database Setup"
echo "================================"

# Check if container is running
if ! docker ps | grep -q neuromorphic-neocortex; then
    echo "❌ PostgreSQL container not running. Start with: docker-compose up -d"
    exit 1
fi

echo "📋 Creating neuromorphic database..."
docker exec neuromorphic-neocortex psql -U neuromorphic -c "CREATE DATABASE neuromorphic;" 2>/dev/null || echo "Database may already exist"

echo "📋 Checking databases..."
docker exec neuromorphic-neocortex psql -U neuromorphic -l

echo "🗄️ Creating schema..."
docker exec -i neuromorphic-neocortex psql -U neuromorphic -d neuromorphic << 'EOF'
-- Neuromorphic Cognitive Architecture Database Schema
-- 6-Brain Region Memory System with Vector Embeddings

-- Main entity storage table
CREATE TABLE IF NOT EXISTS neuromorphic_entities (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT, -- Store as text for now (JSON array)
    metadata JSONB DEFAULT '{}',
    brain_region VARCHAR(50) DEFAULT 'neocortex',
    importance_score REAL DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    created_by VARCHAR(100) DEFAULT 'Neuromorphic-001',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(entity_type, name)
);

-- Observations table for memory details
CREATE TABLE IF NOT EXISTS neuromorphic_observations (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES neuromorphic_entities(id) ON DELETE CASCADE,
    observation TEXT NOT NULL,
    embedding TEXT, -- Store as text for now (JSON array)
    brain_region VARCHAR(50) DEFAULT 'neocortex',
    source VARCHAR(100) DEFAULT 'Neuromorphic-001',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relationships table for graph connections
CREATE TABLE IF NOT EXISTS neuromorphic_relationships (
    id SERIAL PRIMARY KEY,
    from_entity_id INTEGER REFERENCES neuromorphic_entities(id) ON DELETE CASCADE,
    to_entity_id INTEGER REFERENCES neuromorphic_entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}',
    strength REAL DEFAULT 1.0,
    created_by VARCHAR(100) DEFAULT 'Neuromorphic-001',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(from_entity_id, to_entity_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_type ON neuromorphic_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_brain_region ON neuromorphic_entities(brain_region);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_name ON neuromorphic_entities(name);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_importance ON neuromorphic_entities(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_access ON neuromorphic_entities(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_entities_created ON neuromorphic_entities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_neuromorphic_observations_entity ON neuromorphic_observations(entity_id);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_observations_brain_region ON neuromorphic_observations(brain_region);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_observations_timestamp ON neuromorphic_observations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_neuromorphic_relationships_from ON neuromorphic_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_relationships_to ON neuromorphic_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_relationships_type ON neuromorphic_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_neuromorphic_relationships_strength ON neuromorphic_relationships(strength DESC);

-- Insert initial system entity
INSERT INTO neuromorphic_entities (entity_type, name, content, brain_region, metadata, importance_score, created_by)
VALUES (
    'System_Bootstrap',
    'Neuromorphic_System_Initialize_2025-07-03',
    'Neuromorphic cognitive architecture initialized with 6 specialized brain regions: hippocampus (episodic), neocortex (semantic), amygdala (emotional), thalamus (relay), basal_ganglia (procedural), cerebellum (motor). Ready for distributed memory processing.',
    'neocortex',
    '{"initialization_timestamp": "2025-07-03T18:16:13Z", "brain_regions": 6, "status": "ready", "mcp_server": "neuromorphic", "version": "0.1.0"}',
    1.0,
    'Neuromorphic-001'
) ON CONFLICT (entity_type, name) DO NOTHING;

-- Function to update timestamp on modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER trigger_update_neuromorphic_entities_updated_at
    BEFORE UPDATE ON neuromorphic_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EOF

echo "✅ Checking tables created..."
docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "\dt"

echo "🎯 Testing initial data..."
docker exec neuromorphic-neocortex psql -U neuromorphic -d neuromorphic -c "SELECT entity_type, name, brain_region FROM neuromorphic_entities;"

echo "🧠 Neuromorphic database ready!"
echo "Next: python src/neuromorphic_mcp_server.py"
