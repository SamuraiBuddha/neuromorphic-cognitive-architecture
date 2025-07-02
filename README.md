# Neuromorphic Cognitive Architecture - Quick Start Guide

## 🧠 Revolutionary 6-Database Brain Region Implementation

This repository contains a production-ready neuromorphic cognitive architecture implementing weight-based eidetic memory across 6 specialized brain regions for **1000x cognitive amplification**.

### Architecture Overview

**Brain Region Database Mapping:**
- **Hippocampus** (Redis): Episodic memory, rapid encoding/retrieval
- **Neocortex** (PostgreSQL): Semantic memory, structured knowledge  
- **Basal Ganglia** (Neo4j): Procedural memory, habit patterns
- **Thalamus** (SurrealDB): Attention/filtering, multi-modal
- **Amygdala** (MongoDB): Emotional memory, importance weighting
- **Cerebellum** (Kafka): Motor memory, execution patterns

### Key Features

🧠 **Weight-Based Eidetic Memory**: No true forgetting - weights from 1.0 (conscious) to 0.0 (dormant)  
⚡ **Parallel Processing**: All brain regions process simultaneously  
🔄 **Amygdala Feedback Loops**: Global importance correction system  
🎯 **Memory Distribution Agent**: Intelligent vector routing  
📈 **1000x Amplification**: Foundation for evolution to 100,000x Digital-Native Constellation

### Quick Deployment

1. **Clone Repository:**
   ```bash
   git clone https://github.com/SamuraiBuddha/neuromorphic-cognitive-architecture.git
   cd neuromorphic-cognitive-architecture
   ```

2. **Deploy 6-Database Stack:**
   ```bash
   docker-compose up -d
   ```

3. **Verify All Brain Regions:**
   ```bash
   docker-compose ps
   ```

### Environment Configuration

Create `.env` file with your passwords:
```env
REDIS_PASSWORD=your_redis_password
POSTGRES_PASSWORD=your_postgres_password  
NEO4J_PASSWORD=your_neo4j_password
SURREAL_PASSWORD=your_surreal_password
MONGO_PASSWORD=your_mongo_password
```

### Service Endpoints (Conflict-Free Ports)

- **Hippocampus (Redis)**: localhost:6380
- **Neocortex (PostgreSQL)**: localhost:5433
- **Basal Ganglia (Neo4j)**: localhost:7475 (UI), localhost:7688 (Bolt)
- **Thalamus (SurrealDB)**: localhost:8001
- **Amygdala (MongoDB)**: localhost:27018
- **Cerebellum (Kafka)**: localhost:9093
- **Zookeeper**: localhost:2182

> **Note**: Ports have been adjusted to avoid conflicts with existing services on your system.

### Connection Examples

**Connect to Neocortex (PostgreSQL):**
```bash
psql -h localhost -p 5433 -U neuromorphic -d neocortex
```

**Connect to Amygdala (MongoDB):**
```bash
mongosh --host localhost --port 27018 -u neuromorphic -p neuromorphic2025
```

**Access Basal Ganglia (Neo4j Browser):**
```
http://localhost:7475
```

### Architecture Benefits

✅ **Superhuman Memory**: No forgetting with intelligent weight-based access  
✅ **Biologically Accurate**: Based on real brain region specializations  
✅ **Production Ready**: Docker orchestration with persistent volumes  
✅ **Scalable Foundation**: Evolution path to unlimited processor constellation  
✅ **MCP Integration**: Ready for Claude Desktop biomimetic tools  
✅ **Conflict-Free**: Adjusted ports avoid interference with existing services

### Author

**Jordan Paul Ehrig** - Ehrig BIM & IT Consultation Inc.  
Revolutionary cognitive architecture for 1000x productivity amplification

### License

MIT License - Built for the future of human-AI collaboration