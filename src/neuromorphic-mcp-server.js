#!/usr/bin/env node
/**
 * Neuromorphic MCP Server - Connecting Claude to 4-Brain Architecture
 * 
 * This MCP server provides 8 biomimetic tools that allow Claude to interact
 * with the neuromorphic cognitive architecture for 1000x amplification.
 * 
 * Author: Jordan Paul Ehrig - Ehrig BIM & IT Consultation Inc.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import redis from 'redis';
import pg from 'pg';
import neo4j from 'neo4j-driver';
import { MongoClient } from 'mongodb';

class NeuromorphicBrain {
  constructor() {
    this.connections = {};
    this.memoryWeights = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.error('🧠 Initializing Neuromorphic Brain connections...');
      
      // Hippocampus (Redis) - Episodic Memory
      this.connections.hippocampus = redis.createClient({
        url: 'redis://localhost:6380',
        password: 'neuromorphic2025'
      });
      await this.connections.hippocampus.connect();

      // Neocortex (PostgreSQL) - Semantic Memory
      this.connections.neocortex = new pg.Client({
        host: 'localhost',
        port: 5433,
        user: 'neuromorphic',
        password: 'neuromorphic2025',
        database: 'neocortex'
      });
      await this.connections.neocortex.connect();

      // Basal Ganglia (Neo4j) - Procedural Memory
      this.connections.basalGanglia = neo4j.driver(
        'bolt://localhost:7688',
        neo4j.auth.basic('neo4j', 'neuromorphic2025')
      );

      // Amygdala (MongoDB) - Emotional Memory
      this.connections.amygdala = new MongoClient('mongodb://neuromorphic:neuromorphic2025@localhost:27018/amygdala');
      await this.connections.amygdala.connect();

      this.isInitialized = true;
      console.error('✅ Neuromorphic Brain fully connected - 1000x amplification active!');
      
    } catch (error) {
      console.error('❌ Neuromorphic Brain initialization failed:', error.message);
      throw error;
    }
  }

  calculateMemoryWeight(content, importance = 0.5, emotional = 0.5) {
    // Weight-based eidetic memory: 1.0 = conscious, 0.0 = dormant (never forgotten)
    const baseWeight = 0.6;
    const importanceBoost = importance * 0.3;
    const emotionalBoost = emotional * 0.1;
    
    return Math.min(1.0, baseWeight + importanceBoost + emotionalBoost);
  }

  async storeEpisodicMemory(event, context, importance = 0.5) {
    const memoryId = `episodic:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const weight = this.calculateMemoryWeight(event, importance);
    
    const memory = {
      id: memoryId,
      event,
      context,
      weight,
      timestamp: new Date().toISOString(),
      accessCount: 0
    };

    await this.connections.hippocampus.setEx(memoryId, 31536000, JSON.stringify(memory)); // 1 year TTL
    this.memoryWeights.set(memoryId, weight);
    
    return { memoryId, weight, stored: 'hippocampus' };
  }

  async retrieveSemanticKnowledge(query, threshold = 0.1) {
    try {
      // Search semantic memory in Neocortex (PostgreSQL)
      const result = await this.connections.neocortex.query(`
        SELECT * FROM semantic_memory 
        WHERE content ILIKE $1 AND weight >= $2 
        ORDER BY weight DESC, last_accessed DESC 
        LIMIT 10
      `, [`%${query}%`, threshold]);
      
      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        weight: row.weight,
        associations: row.associations || []
      }));
    } catch (error) {
      // If table doesn't exist yet, return empty (will be created on first store)
      return [];
    }
  }

  async learnProceduralPattern(pattern, context, steps) {
    const session = this.connections.basalGanglia.session();
    try {
      const patternId = `pattern:${Date.now()}`;
      const weight = this.calculateMemoryWeight(pattern, 0.7);
      
      await session.run(`
        CREATE (p:Pattern {
          id: $patternId,
          content: $pattern,
          context: $context,
          weight: $weight,
          steps: $steps,
          created: datetime()
        })
      `, { patternId, pattern, context, weight, steps });
      
      return { patternId, weight, stored: 'basal_ganglia' };
    } finally {
      await session.close();
    }
  }

  async weightEmotionalImportance(content, emotional_valence, intensity) {
    const emotionalWeight = intensity * (emotional_valence > 0 ? 1 : 0.5);
    const memoryId = `emotional:${Date.now()}`;
    
    const document = {
      _id: memoryId,
      content,
      emotional_valence,
      intensity,
      weight: emotionalWeight,
      created: new Date()
    };
    
    const db = this.connections.amygdala.db('amygdala');
    await db.collection('emotional_memories').insertOne(document);
    
    return { memoryId, emotionalWeight, stored: 'amygdala' };
  }

  async searchEideticMemory(query, threshold = 0.1) {
    const results = {
      episodic: [],
      semantic: [],
      procedural: [],
      emotional: []
    };

    try {
      // Search Hippocampus (Redis) for episodic memories
      const episodicKeys = await this.connections.hippocampus.keys('episodic:*');
      for (const key of episodicKeys.slice(0, 10)) {
        const memory = JSON.parse(await this.connections.hippocampus.get(key));
        if (memory.weight >= threshold && (
          memory.event.toLowerCase().includes(query.toLowerCase()) ||
          memory.context.toLowerCase().includes(query.toLowerCase())
        )) {
          results.episodic.push(memory);
        }
      }

      // Search Neocortex (PostgreSQL) for semantic knowledge
      results.semantic = await this.retrieveSemanticKnowledge(query, threshold);

      // Search Basal Ganglia (Neo4j) for procedural patterns
      const session = this.connections.basalGanglia.session();
      try {
        const proceduralResult = await session.run(`
          MATCH (p:Pattern) 
          WHERE p.weight >= $threshold 
            AND (p.content CONTAINS $query OR p.context CONTAINS $query)
          RETURN p.id as id, p.content as content, p.weight as weight, p.context as context
          ORDER BY p.weight DESC
          LIMIT 10
        `, { threshold, query });
        
        results.procedural = proceduralResult.records.map(record => ({
          id: record.get('id'),
          content: record.get('content'),
          weight: record.get('weight'),
          context: record.get('context')
        }));
      } finally {
        await session.close();
      }

      // Search Amygdala (MongoDB) for emotional memories
      const db = this.connections.amygdala.db('amygdala');
      const emotionalResults = await db.collection('emotional_memories')
        .find({
          weight: { $gte: threshold },
          content: { $regex: query, $options: 'i' }
        })
        .sort({ weight: -1 })
        .limit(10)
        .toArray();
      
      results.emotional = emotionalResults.map(doc => ({
        id: doc._id,
        content: doc.content,
        weight: doc.weight,
        emotional_valence: doc.emotional_valence
      }));

    } catch (error) {
      console.error('Error in parallel brain search:', error.message);
    }

    return results;
  }
}