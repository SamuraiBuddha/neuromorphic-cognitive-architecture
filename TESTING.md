# Connection Testing Guide - No Additional Software Required

## 🧠 Brain Region Connection Tests (Docker-Based)

All these tests use Docker containers, so no additional client software needed!

### 1. **Neocortex (PostgreSQL) - Port 5433**

```bash
# Test connection using Docker
docker exec -it neuromorphic-neocortex psql -U neuromorphic -d neocortex -c "SELECT version();"

# Alternative: Enter interactive shell
docker exec -it neuromorphic-neocortex psql -U neuromorphic -d neocortex
```

### 2. **Amygdala (MongoDB) - Port 27018**

```bash
# Test connection using Docker
docker exec -it neuromorphic-amygdala mongosh --eval "db.runCommand({connectionStatus: 1})"

# Alternative: Enter interactive shell  
docker exec -it neuromorphic-amygdala mongosh
```

### 3. **Hippocampus (Redis) - Port 6380**

```bash
# Test connection using Docker
docker exec -it neuromorphic-hippocampus redis-cli ping

# Test with password
docker exec -it neuromorphic-hippocampus redis-cli -a neuromorphic2025 ping

# Interactive shell
docker exec -it neuromorphic-hippocampus redis-cli -a neuromorphic2025
```

### 4. **Basal Ganglia (Neo4j) - Port 7475**

```bash
# Test connection using Docker
docker exec -it neuromorphic-basal-ganglia cypher-shell -u neo4j -p neuromorphic2025 "RETURN 'Neo4j is online' AS status;"

# Interactive shell
docker exec -it neuromorphic-basal-ganglia cypher-shell -u neo4j -p neuromorphic2025
```

**Web Browser Access (No CLI needed):**
- Open: http://localhost:7475
- Username: neo4j
- Password: neuromorphic2025

### 5. **Thalamus (SurrealDB) - Port 8001**

```bash
# Check if container is running
docker logs neuromorphic-thalamus

# Test via curl (if available)
curl -X POST http://localhost:8001/sql -H "Content-Type: application/json" -d '{"sql":"INFO FOR DB;"}'
```

### 6. **Cerebellum (Kafka) - Port 9093**

```bash
# List topics using Docker
docker exec -it neuromorphic-cerebellum kafka-topics --bootstrap-server localhost:9092 --list

# Check Kafka status
docker exec -it neuromorphic-cerebellum kafka-broker-api-versions --bootstrap-server localhost:9092
```

### 7. **Overall System Health Check**

```bash
# Check all containers are running
docker-compose ps

# View logs for any specific brain region
docker-compose logs hippocampus
docker-compose logs neocortex  
docker-compose logs basal_ganglia
docker-compose logs thalamus
docker-compose logs amygdala
docker-compose logs cerebellum

# View all logs
docker-compose logs
```

### 8. **Quick Status Dashboard**

```bash
# One-liner to check all brain regions
echo "🧠 NEUROMORPHIC BRAIN STATUS 🧠" && \
echo "Hippocampus (Redis):" && docker exec neuromorphic-hippocampus redis-cli -a neuromorphic2025 ping 2>/dev/null || echo "❌ Offline" && \
echo "Neocortex (PostgreSQL):" && docker exec neuromorphic-neocortex pg_isready -U neuromorphic 2>/dev/null || echo "❌ Offline" && \
echo "Amygdala (MongoDB):" && docker exec neuromorphic-amygdala mongosh --quiet --eval "db.runCommand({ping: 1}).ok" 2>/dev/null || echo "❌ Offline" && \
echo "All containers:" && docker-compose ps --services --filter "status=running" | wc -l && echo "brain regions online! 🚀"
```

## 🎯 **No External Tools Needed**

All these commands work with just Docker - no need to install:
- ❌ psql (PostgreSQL client)
- ❌ mongosh (MongoDB client)  
- ❌ redis-cli (Redis client)
- ❌ cypher-shell (Neo4j client)

Just use the Docker exec commands above! 🐳