    async def _connect_hippocampus(self) -> None:
        """Connect to Redis (Hippocampus) - Episodic Memory"""
        try:
            self.hippocampus = redis.Redis(
                host=self.config.get('redis_host', 'localhost'),
                port=self.config.get('redis_port', 6379),
                password=self.config.get('redis_password', 'neuromorphic2025'),
                decode_responses=True
            )
            await self.hippocampus.ping()
            self.logger.info("🧠 Hippocampus (Redis) connected - Episodic memory online")
        except Exception as e:
            self.logger.error(f"❌ Hippocampus connection failed: {e}")
            raise

    async def _connect_neocortex(self) -> None:
        """Connect to PostgreSQL (Neocortex) - Semantic Memory"""
        try:
            self.neocortex = await asyncpg.connect(
                host=self.config.get('postgres_host', 'localhost'),
                port=self.config.get('postgres_port', 5432),
                user=self.config.get('postgres_user', 'neuromorphic'),
                password=self.config.get('postgres_password', 'neuromorphic2025'),
                database=self.config.get('postgres_db', 'neocortex')
            )
            # Initialize semantic memory schema
            await self._init_neocortex_schema()
            self.logger.info("🧠 Neocortex (PostgreSQL) connected - Semantic memory online")
        except Exception as e:
            self.logger.error(f"❌ Neocortex connection failed: {e}")
            raise

    async def _connect_basal_ganglia(self) -> None:
        """Connect to Neo4j (Basal Ganglia) - Procedural Memory"""
        try:
            neo4j_uri = f"bolt://{self.config.get('neo4j_host', 'localhost')}:7687"
            self.basal_ganglia = AsyncGraphDatabase.driver(
                neo4j_uri,
                auth=('neo4j', self.config.get('neo4j_password', 'neuromorphic2025'))
            )
            # Verify connection
            await self.basal_ganglia.verify_connectivity()
            self.logger.info("🧠 Basal Ganglia (Neo4j) connected - Procedural memory online")
        except Exception as e:
            self.logger.error(f"❌ Basal Ganglia connection failed: {e}")
            raise

    async def _connect_thalamus(self) -> None:
        """Connect to SurrealDB (Thalamus) - Attention/Filtering"""
        try:
            surreal_url = f"ws://{self.config.get('surreal_host', 'localhost')}:8000/rpc"
            self.thalamus = surrealdb.Surreal(surreal_url)
            await self.thalamus.connect()
            await self.thalamus.signin({
                "user": "neuromorphic",
                "pass": self.config.get('surreal_password', 'neuromorphic2025')
            })
            await self.thalamus.use("thalamus", "attention")
            self.logger.info("🧠 Thalamus (SurrealDB) connected - Attention filtering online")
        except Exception as e:
            self.logger.error(f"❌ Thalamus connection failed: {e}")
            raise