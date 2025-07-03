    async def cleanup(self):
        """Clean up all brain region connections"""
        for pool in self.db_pools.values():
            if pool:
                await pool.close()
        if self.redis_client:
            await self.redis_client.aclose()  # Fixed: use aclose() instead of close()
        if self.http_client:
            await self.http_client.aclose()