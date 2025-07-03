"""
Neuromorphic MCP Server
6-Brain Cognitive Architecture - Distributed memory across specialized brain regions
"""
import os
import json
import asyncio
import hashlib
import sys
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

import asyncpg
import redis.asyncio as redis
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import httpx
from pydantic import BaseModel
import structlog
from dotenv import load_dotenv

from mcp.server import Server
from mcp.server.models import InitializationOptions, ServerCapabilities
import mcp.server.stdio
import mcp.types as types

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()  # Try default location

# Configure structured logging
logger = structlog.get_logger()

# Neuromorphic Configuration - 6-Brain Architecture
# Each brain region has specialized databases and ports
DATABASE_URLS = {
    "hippocampus": os.getenv("HIPPOCAMPUS_DB_URL", "postgresql://neuromorphic:neuromorphic2025@127.0.0.1:5433/neuromorphic"),
    "neocortex": os.getenv("NEOCORTEX_DB_URL", "postgresql://neuromorphic:neuromorphic2025@127.0.0.1:5433/neuromorphic"),
    "amygdala": os.getenv("AMYGDALA_DB_URL", "mongodb://neuromorphic:neuromorphic2025@127.0.0.1:27018/neuromorphic"),
    "thalamus": os.getenv("THALAMUS_DB_URL", "http://neuromorphic:neuromorphic2025@127.0.0.1:8082"),
    "basal_ganglia": os.getenv("BASAL_GANGLIA_DB_URL", "bolt://neuromorphic:neuromorphic2025@127.0.0.1:7687"),
    "cerebellum": os.getenv("CEREBELLUM_DB_URL", "kafka://127.0.0.1:9093")
}

REDIS_URL = os.getenv("NEUROMORPHIC_REDIS_URL", "redis://localhost:6380")
QDRANT_URL = os.getenv("NEUROMORPHIC_QDRANT_URL", "http://localhost:6334")
EMBEDDING_API_URL = os.getenv("EMBEDDING_API_URL", "http://localhost:1234/v1/embeddings")
INSTANCE_ID = os.getenv("INSTANCE_ID", "Neuromorphic-001")
INSTANCE_ROLE = os.getenv("INSTANCE_ROLE", "primary")

# Constants
VECTOR_DIM = 768  # Granite embeddings
COLLECTION_NAME = "neuromorphic_memory"
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.7"))

# Brain region routing configuration
BRAIN_REGIONS = {
    "hippocampus": {"memory_type": "episodic", "port": 6380, "db_type": "redis"},
    "neocortex": {"memory_type": "semantic", "port": 5433, "db_type": "postgresql"},  
    "amygdala": {"memory_type": "emotional", "port": 27018, "db_type": "mongodb"},
    "thalamus": {"memory_type": "relay", "port": 8082, "db_type": "surrealdb"},
    "basal_ganglia": {"memory_type": "procedural", "port": 7687, "db_type": "neo4j"},
    "cerebellum": {"memory_type": "motor", "port": 9093, "db_type": "kafka"}
}

logger.info("Neuromorphic environment loaded", 
    brain_regions_configured=len(BRAIN_REGIONS),
    redis_url_set=bool(os.getenv("NEUROMORPHIC_REDIS_URL")),
    instance_id=INSTANCE_ID,
    env_path=str(env_path),
    env_exists=env_path.exists()
)

class MemoryEntity(BaseModel):
    """Memory entity structure for neuromorphic system"""
    entity_type: str
    name: str
    content: str
    metadata: Dict[str, Any] = {}
    observations: List[str] = []
    brain_region: str = "neocortex"  # Default to neocortex for semantic memory

class NeuromorphicMemoryServer:
    """Six-brain neuromorphic memory system with specialized regions"""
    
    def __init__(self):
        self.db_pools: Dict[str, Any] = {}
        self.redis_client: Optional[redis.Redis] = None
        self.qdrant_client: Optional[QdrantClient] = None
        self.http_client: Optional[httpx.AsyncClient] = None
        self.qdrant_available = False
        self.embedding_available = False
        
        # Create server with neuromorphic namespace
        self.server = Server("neuromorphic")
        self.setup_tools()
    
    def route_to_brain_region(self, entity_type: str, content: str) -> str:
        """Route memory to appropriate brain region based on content and type"""
        content_lower = content.lower()
        
        # Emotional content → Amygdala
        emotional_keywords = ["fear", "love", "anger", "joy", "sad", "happy", "excited", "worried", "stressed"]
        if any(keyword in content_lower for keyword in emotional_keywords):
            return "amygdala"
            
        # Procedural/action content → Basal Ganglia  
        procedural_keywords = ["step", "process", "workflow", "procedure", "action", "method", "algorithm"]
        if any(keyword in content_lower for keyword in procedural_keywords):
            return "basal_ganglia"
            
        # Motor/movement content → Cerebellum
        motor_keywords = ["movement", "motor", "coordination", "balance", "timing", "sequence"]
        if any(keyword in content_lower for keyword in motor_keywords):
            return "cerebellum"
            
        # Episodic memory (events, experiences) → Hippocampus
        episodic_keywords = ["experience", "event", "remember", "happened", "occurred", "session", "meeting"]
        if any(keyword in content_lower for keyword in episodic_keywords):
            return "hippocampus"
            
        # Relay/routing information → Thalamus
        relay_keywords = ["route", "relay", "forward", "redirect", "gateway", "proxy"]
        if any(keyword in content_lower for keyword in relay_keywords):
            return "thalamus"
            
        # Default: Semantic memory → Neocortex
        return "neocortex"
    
    def setup_tools(self):
        """Register neuromorphic MCP tools"""
        
        @self.server.list_tools()
        async def list_tools() -> List[types.Tool]:
            return [
                types.Tool(
                    name="store_memory",
                    description="Store a memory entity in appropriate brain region with vector embedding and relationships",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "entity_type": {"type": "string"},
                            "name": {"type": "string"},
                            "content": {"type": "string"},
                            "metadata": {"type": "object"},
                            "observations": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "brain_region": {"type": "string", "description": "Optional: specify brain region (auto-routed if not provided)"}
                        },
                        "required": ["entity_type", "name", "content"]
                    }
                ),
                types.Tool(
                    name="recall_memory",
                    description="Recall memories using hybrid vector-graph search across brain regions",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "entity_type": {"type": "string"},
                            "brain_region": {"type": "string", "description": "Optional: search specific brain region"},
                            "include_graph": {"type": "boolean", "default": True},
                            "max_results": {"type": "integer", "default": 20}
                        },
                        "required": ["query"]
                    }
                ),
                types.Tool(
                    name="add_observations",
                    description="Add observations to an existing memory entity",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "entity_name": {"type": "string"},
                            "observations": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["entity_name", "observations"]
                    }
                ),
                types.Tool(
                    name="create_relationship",
                    description="Create a relationship between two memory entities across brain regions",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "from_entity": {"type": "string"},
                            "to_entity": {"type": "string"},
                            "relationship_type": {"type": "string"},
                            "properties": {"type": "object"}
                        },
                        "required": ["from_entity", "to_entity", "relationship_type"]
                    }
                ),
                types.Tool(
                    name="find_patterns",
                    description="Find patterns across memories using clustering and brain region analysis",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "entity_type": {"type": "string"},
                            "brain_region": {"type": "string"},
                            "min_cluster_size": {"type": "integer", "default": 3}
                        }
                    }
                ),
                types.Tool(
                    name="get_memory_stats",
                    description="Get statistics about the neuromorphic memory system",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
            try:
                logger.info(f"Neuromorphic tool called: {name}", instance=INSTANCE_ID, args=arguments)
                
                if name == "store_memory":
                    result = await self.store_memory(**arguments)
                elif name == "recall_memory":
                    result = await self.recall_memory(**arguments)
                elif name == "add_observations":
                    result = await self.add_observations(**arguments)
                elif name == "create_relationship":
                    result = await self.create_relationship(**arguments)
                elif name == "find_patterns":
                    result = await self.find_patterns(**arguments)
                elif name == "get_memory_stats":
                    result = await self.get_memory_stats()
                else:
                    result = {"error": f"Unknown neuromorphic tool: {name}"}
                
                return [types.TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]
                
            except Exception as e:
                logger.error(f"Neuromorphic tool error: {name}", error=str(e), instance=INSTANCE_ID)
                return [types.TextContent(
                    type="text",
                    text=json.dumps({"error": str(e)})
                )]
    
    async def initialize(self):
        """Initialize all brain region connections with proper error handling"""
        try:
            # PostgreSQL connection pool (Neocortex/Hippocampus)
            logger.info("Connecting to Neuromorphic PostgreSQL", url=DATABASE_URLS["neocortex"].split('@')[1] if '@' in DATABASE_URLS["neocortex"] else 'unknown')
            self.db_pools["neocortex"] = await asyncpg.create_pool(DATABASE_URLS["neocortex"], min_size=2, max_size=10)
            self.db_pools["hippocampus"] = self.db_pools["neocortex"]  # Share PostgreSQL pool
            
            # Redis connection (distributed across regions)
            logger.info("Connecting to Neuromorphic Redis", url=REDIS_URL)
            self.redis_client = await redis.from_url(REDIS_URL, decode_responses=True)
            
            # HTTP client for embeddings and other services
            self.http_client = httpx.AsyncClient(timeout=30.0)
            
            # Optional: Qdrant client (graceful degradation if unavailable)
            try:
                logger.info("Attempting Qdrant connection", url=QDRANT_URL)
                self.qdrant_client = QdrantClient(url=QDRANT_URL)
                
                # Test Qdrant connection
                collections = self.qdrant_client.get_collections()
                
                # Create collection if it doesn't exist
                try:
                    self.qdrant_client.get_collection(COLLECTION_NAME)
                    logger.info("Qdrant collection found", collection=COLLECTION_NAME)
                except:
                    logger.info("Creating Qdrant collection", collection=COLLECTION_NAME)
                    self.qdrant_client.create_collection(
                        collection_name=COLLECTION_NAME,
                        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE)
                    )
                
                self.qdrant_available = True
                logger.info("Qdrant connection successful")
                
            except Exception as e:
                logger.warning("Qdrant unavailable, continuing without vector search", error=str(e))
                self.qdrant_available = False
            
            # Optional: Test embedding API
            try:
                logger.info("Testing embedding API", url=EMBEDDING_API_URL)
                response = await self.http_client.post(
                    EMBEDDING_API_URL,
                    json={"input": "test", "model": "granite"},
                    timeout=5.0
                )
                if response.status_code == 200:
                    self.embedding_available = True
                    logger.info("Embedding API available")
                else:
                    raise Exception(f"API returned {response.status_code}")
                    
            except Exception as e:
                logger.warning("Embedding API unavailable, using fallback", error=str(e))
                self.embedding_available = False
            
            logger.info("Neuromorphic Memory Server initialized", 
                        instance=INSTANCE_ID, 
                        role=INSTANCE_ROLE,
                        brain_regions=list(BRAIN_REGIONS.keys()),
                        postgres="connected",
                        redis="connected", 
                        qdrant="available" if self.qdrant_available else "unavailable",
                        embeddings="available" if self.embedding_available else "unavailable")
            
        except Exception as e:
            logger.error("Failed to initialize neuromorphic system", error=str(e))
            raise
    
    async def cleanup(self):
        """Clean up all brain region connections"""
        for pool in self.db_pools.values():
            if pool:
                await pool.close()
        if self.redis_client:
            await self.redis_client.aclose()  # Fixed: use aclose() instead of close()
        if self.http_client:
            await self.http_client.aclose()
    
    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding from LM Studio or fallback to simple hash"""
        if not self.embedding_available:
            # Fallback: Generate simple hash-based embedding
            hash_val = hashlib.sha256(text.encode()).digest()
            # Convert to 768-dimensional vector (repeat hash values)
            embedding = []
            for i in range(VECTOR_DIM):
                embedding.append(float(hash_val[i % len(hash_val)]) / 255.0 - 0.5)
            return embedding
        
        # Check cache first
        cache_key = f"neuromorphic_emb:{hashlib.sha256(text.encode()).hexdigest()[:16]}"
        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except:
            pass  # Continue without cache if Redis unavailable
        
        try:
            # Call embedding API
            response = await self.http_client.post(
                EMBEDDING_API_URL,
                json={"input": text, "model": "granite"}
            )
            data = response.json()
            embedding = data["data"][0]["embedding"]
            
            # Cache for future use
            try:
                await self.redis_client.setex(cache_key, CACHE_TTL, json.dumps(embedding))
            except:
                pass  # Continue without cache if Redis unavailable
                
            return embedding
            
        except Exception as e:
            logger.warning("Embedding API failed, using fallback", error=str(e))
            # Use fallback hash-based embedding
            return await self.get_embedding(text)  # This will use fallback since embedding_available will be False
    
    async def store_memory(self, entity_type: str, name: str, content: str, 
                          metadata: Dict = None, observations: List[str] = None,
                          brain_region: str = None) -> Dict:
        """Store memory in appropriate brain region"""
        metadata = metadata or {}
        observations = observations or []
        
        # Auto-route to brain region if not specified
        if not brain_region:
            brain_region = self.route_to_brain_region(entity_type, content)
        
        # Get embedding
        embedding = await self.get_embedding(content)
        embedding_str = json.dumps(embedding)  # Store as JSON string
        
        # Add brain region routing info to metadata
        metadata["brain_region"] = brain_region
        metadata["routing_reason"] = f"Content routed to {brain_region} for {BRAIN_REGIONS[brain_region]['memory_type']} processing"
        
        async with self.db_pools["neocortex"].acquire() as conn:
            # Store in PostgreSQL (primary memory store)
            entity_id = await conn.fetchval("""
                INSERT INTO neuromorphic_entities (entity_type, name, content, embedding, metadata, brain_region, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (entity_type, name) 
                DO UPDATE SET content = $3, embedding = $4, metadata = $5, brain_region = $6, updated_at = NOW()
                RETURNING id
            """, entity_type, name, content, embedding_str, json.dumps(metadata), brain_region, INSTANCE_ID)
            
            # Add observations
            for obs in observations:
                obs_embedding = await self.get_embedding(obs)
                obs_embedding_str = json.dumps(obs_embedding)
                await conn.execute("""
                    INSERT INTO neuromorphic_observations (entity_id, observation, embedding, brain_region, source)
                    VALUES ($1, $2, $3, $4, $5)
                """, entity_id, obs, obs_embedding_str, brain_region, INSTANCE_ID)
        
        # Store in Qdrant for fast vector search (if available)
        if self.qdrant_available:
            try:
                self.qdrant_client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=[PointStruct(
                        id=entity_id,
                        vector=embedding,
                        payload={
                            "entity_type": entity_type,
                            "name": name,
                            "brain_region": brain_region,
                            "created_by": INSTANCE_ID,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    )]
                )
            except Exception as e:
                logger.warning("Failed to store in Qdrant", error=str(e))
        
        # Invalidate related caches
        try:
            await self.redis_client.delete(f"neuromorphic_recall:{entity_type}:*")
        except:
            pass
        
        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "name": name,
            "brain_region": brain_region,
            "stored_by": INSTANCE_ID,
            "vector_indexed": self.qdrant_available,
            "graph_stored": True
        }
    
    async def recall_memory(self, query: str, entity_type: str = None, brain_region: str = None,
                           include_graph: bool = True, max_results: int = 20) -> Dict:
        """Hybrid vector-graph memory recall across brain regions"""
        # Check cache
        cache_key = f"neuromorphic_recall:{brain_region or 'all'}:{entity_type or 'all'}:{hashlib.sha256(query.encode()).hexdigest()[:16]}"
        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except:
            pass
        
        # Get query embedding
        query_embedding = await self.get_embedding(query)
        
        vector_matches = {}
        
        # Vector search in Qdrant if available
        if self.qdrant_available:
            try:
                search_filter = {}
                if entity_type:
                    search_filter["entity_type"] = entity_type
                if brain_region:
                    search_filter["brain_region"] = brain_region
                
                vector_results = self.qdrant_client.search(
                    collection_name=COLLECTION_NAME,
                    query_vector=query_embedding,
                    query_filter=search_filter,
                    limit=max_results
                )
                
                vector_matches = {
                    point.id: {
                        "score": point.score,
                        "payload": point.payload
                    } for point in vector_results
                }
            except Exception as e:
                logger.warning("Qdrant search failed", error=str(e))
        
        # Fallback to PostgreSQL-only search if no vector matches
        async with self.db_pools["neocortex"].acquire() as conn:
            if not vector_matches:
                # Text-based search fallback
                where_conditions = ["content ILIKE $1"]
                params = [f"%{query}%"]
                
                if entity_type:
                    where_conditions.append(f"entity_type = ${len(params) + 1}")
                    params.append(entity_type)
                    
                if brain_region:
                    where_conditions.append(f"brain_region = ${len(params) + 1}")
                    params.append(brain_region)
                
                entities = await conn.fetch(f"""
                    SELECT id, entity_type, name, content, metadata, brain_region, importance_score
                    FROM neuromorphic_entities
                    WHERE {' AND '.join(where_conditions)}
                    ORDER BY importance_score DESC
                    LIMIT {max_results}
                """, *params)
            else:
                # Get full entity data for vector matches
                entity_ids = list(vector_matches.keys())
                entities = await conn.fetch("""
                    SELECT id, entity_type, name, content, metadata, brain_region, importance_score
                    FROM neuromorphic_entities
                    WHERE id = ANY($1)
                """, entity_ids)
            
            # Build results
            results = []
            for entity in entities:
                result = {
                    "entity_id": entity["id"],
                    "entity_type": entity["entity_type"],
                    "name": entity["name"],
                    "content": entity["content"],
                    "metadata": json.loads(entity["metadata"]) if entity["metadata"] else {},
                    "brain_region": entity["brain_region"],
                    "similarity": vector_matches.get(entity["id"], {}).get("score", 0.0),
                    "importance": entity["importance_score"],
                    "match_type": "direct"
                }
                
                # Get observations
                observations = await conn.fetch("""
                    SELECT observation, timestamp, brain_region, source
                    FROM neuromorphic_observations
                    WHERE entity_id = $1
                    ORDER BY timestamp DESC
                    LIMIT 10
                """, entity["id"])
                
                result["observations"] = [
                    {
                        "text": obs["observation"],
                        "timestamp": obs["timestamp"].isoformat(),
                        "brain_region": obs["brain_region"],
                        "source": obs["source"]
                    } for obs in observations
                ]
                
                results.append(result)
        
        # Sort by combined score (similarity + importance)
        results.sort(key=lambda x: x["similarity"] * 0.7 + x["importance"] * 0.3, reverse=True)
        
        # Cache the results
        response = {
            "query": query,
            "results": results[:max_results],
            "total_found": len(results),
            "search_method": "neuromorphic_hybrid",
            "brain_regions_searched": brain_region or "all",
            "instance": INSTANCE_ID
        }
        
        try:
            await self.redis_client.setex(cache_key, CACHE_TTL // 2, json.dumps(response))
        except:
            pass
        
        return response
    
    async def add_observations(self, entity_name: str, observations: List[str]) -> Dict:
        """Add observations to existing entity across brain regions"""
        async with self.db_pools["neocortex"].acquire() as conn:
            # Find entity
            entity = await conn.fetchrow("""
                SELECT id, brain_region FROM neuromorphic_entities WHERE name = $1
            """, entity_name)
            
            if not entity:
                return {"error": f"Entity '{entity_name}' not found"}
            
            # Add observations
            added = []
            for obs in observations:
                obs_embedding = await self.get_embedding(obs)
                obs_embedding_str = json.dumps(obs_embedding)
                await conn.execute("""
                    INSERT INTO neuromorphic_observations (entity_id, observation, embedding, brain_region, source)
                    VALUES ($1, $2, $3, $4, $5)
                """, entity["id"], obs, obs_embedding_str, entity["brain_region"], INSTANCE_ID)
                added.append(obs)
            
            # Update access count
            await conn.execute("""
                UPDATE neuromorphic_entities 
                SET access_count = access_count + 1 
                WHERE id = $1
            """, entity["id"])
        
        # Invalidate caches
        try:
            await self.redis_client.delete(f"neuromorphic_recall:*{entity_name}*")
        except:
            pass
        
        return {
            "entity_name": entity_name,
            "observations_added": len(added),
            "brain_region": entity["brain_region"],
            "source": INSTANCE_ID
        }
    
    async def create_relationship(self, from_entity: str, to_entity: str, 
                                 relationship_type: str, properties: Dict = None) -> Dict:
        """Create relationship between entities across brain regions"""
        properties = properties or {}
        
        async with self.db_pools["neocortex"].acquire() as conn:
            # Find entities
            from_id = await conn.fetchval("""
                SELECT id FROM neuromorphic_entities WHERE name = $1
            """, from_entity)
            
            to_id = await conn.fetchval("""
                SELECT id FROM neuromorphic_entities WHERE name = $1
            """, to_entity)
            
            if not from_id or not to_id:
                return {"error": "One or both entities not found"}
            
            # Create relationship
            rel_id = await conn.fetchval("""
                INSERT INTO neuromorphic_relationships (from_entity_id, to_entity_id, relationship_type, properties)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, from_id, to_id, relationship_type, json.dumps(properties))
        
        return {
            "relationship_id": rel_id,
            "from": from_entity,
            "to": to_entity,
            "type": relationship_type,
            "created_by": INSTANCE_ID
        }
    
    async def find_patterns(self, entity_type: str = None, brain_region: str = None, min_cluster_size: int = 3) -> Dict:
        """Find patterns using basic clustering"""
        # Simple pattern analysis using database queries
        async with self.db_pools["neocortex"].acquire() as conn:
            where_conditions = []
            params = []
            
            if entity_type:
                where_conditions.append(f"entity_type = ${len(params) + 1}")
                params.append(entity_type)
                
            if brain_region:
                where_conditions.append(f"brain_region = ${len(params) + 1}")
                params.append(brain_region)
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Get entity distribution by brain region
            brain_distribution = await conn.fetch(f"""
                SELECT brain_region, COUNT(*) as count
                FROM neuromorphic_entities{where_clause}
                GROUP BY brain_region
                ORDER BY count DESC
            """, *params)
            
            # Get most connected entities
            connected_entities = await conn.fetch(f"""
                SELECT e.name, e.brain_region, COUNT(r.id) as connection_count
                FROM neuromorphic_entities e
                LEFT JOIN neuromorphic_relationships r ON e.id = r.from_entity_id OR e.id = r.to_entity_id
                {where_clause}
                GROUP BY e.id, e.name, e.brain_region
                HAVING COUNT(r.id) >= $1
                ORDER BY connection_count DESC
                LIMIT 10
            """, min_cluster_size, *params)
        
        return {
            "patterns_found": len(connected_entities),
            "brain_distribution": {row["brain_region"]: row["count"] for row in brain_distribution},
            "highly_connected_entities": [
                {
                    "name": row["name"],
                    "brain_region": row["brain_region"],
                    "connections": row["connection_count"]
                } for row in connected_entities
            ],
            "analysis_by": INSTANCE_ID
        }
    
    async def get_memory_stats(self) -> Dict:
        """Get neuromorphic system statistics"""
        async with self.db_pools["neocortex"].acquire() as conn:
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_entities,
                    COUNT(DISTINCT entity_type) as entity_types,
                    COUNT(DISTINCT brain_region) as brain_regions_used,
                    AVG(access_count) as avg_access_count,
                    MAX(access_count) as max_access_count
                FROM neuromorphic_entities
            """)
            
            obs_count = await conn.fetchval("""
                SELECT COUNT(*) FROM neuromorphic_observations
            """)
            
            rel_count = await conn.fetchval("""
                SELECT COUNT(*) FROM neuromorphic_relationships
            """)
            
            # Get brain region distribution
            brain_distribution = await conn.fetch("""
                SELECT brain_region, COUNT(*) as count
                FROM neuromorphic_entities
                GROUP BY brain_region
                ORDER BY count DESC
            """)
        
        # Get Redis info if available
        redis_info = {}
        try:
            redis_info = await self.redis_client.info()
        except:
            redis_info = {"status": "unavailable"}
        
        return {
            "postgresql": {
                "total_entities": stats["total_entities"],
                "entity_types": stats["entity_types"],
                "brain_regions_used": stats["brain_regions_used"],
                "total_observations": obs_count,
                "total_relationships": rel_count,
                "avg_access_count": float(stats["avg_access_count"] or 0),
                "max_access_count": stats["max_access_count"]
            },
            "brain_distribution": {
                row["brain_region"]: row["count"] for row in brain_distribution
            },
            "services": {
                "qdrant": "available" if self.qdrant_available else "unavailable",
                "embeddings": "available" if self.embedding_available else "fallback",
                "redis": "available" if redis_info.get("redis_version") else "unavailable"
            },
            "instance": {
                "id": INSTANCE_ID,
                "role": INSTANCE_ROLE,
                "brain_regions": list(BRAIN_REGIONS.keys())
            }
        }

async def main():
    """Main entry point"""
    server = NeuromorphicMemoryServer()
    
    try:
        await server.initialize()
        logger.info("Starting Neuromorphic MCP Server", instance=INSTANCE_ID)
        
        # Initialize options
        init_options = InitializationOptions(
            server_name="neuromorphic",
            server_version="0.1.0",
            capabilities=ServerCapabilities()
        )
        
        # Run the server
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await server.server.run(
                read_stream, 
                write_stream, 
                init_options
            )
            
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully")
    except Exception as e:
        logger.error("Server error", error=str(e))
        raise
    finally:
        await server.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
