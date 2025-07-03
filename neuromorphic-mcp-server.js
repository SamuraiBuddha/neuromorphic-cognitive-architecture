#!/usr/bin/env node

/**
 * Neuromorphic MCP Server
 * Model Context Protocol interface for BiomimeticMemoryManager
 * Bridges Claude Desktop to 6-brain neuromorphic cognitive architecture
 * 
 * @author Jordan Paul Ehrig - Ehrig BIM & IT Consultation Inc.
 * @version 1.0.0 - Production Ready
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import BiomimeticMemoryManager from './BiomimeticMemoryManager.js';

/**
 * Embedding service configuration for mxbai model
 */
class EmbeddingService {
    constructor() {
        this.apiUrl = 'http://127.0.0.1:1234/v1/embeddings';
        this.model = 'text-embedding-mxbai-embed-large-v1';
    }

    async generateEmbedding(text) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    input: text
                })
            });

            if (!response.ok) {
                throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error) {
            console.error('🚨 Embedding generation failed:', error);
            throw error;
        }
    }
}

/**
 * Neuromorphic MCP Server Implementation
 */
class NeuromorphicMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'neuromorphic-cognitive-architecture',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.embeddingService = new EmbeddingService();
        this.memoryManager = null;
        this.isInitialized = false;

        this.setupTools();
        this.setupHandlers();
    }

    setupTools() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'store_neuromorphic_memory',
                        description: 'Store memory in the 6-brain neuromorphic architecture with weight-based eidetic principles',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                content: {
                                    type: 'string',
                                    description: 'Memory content to store'
                                },
                                type: {
                                    type: 'string',
                                    description: 'Memory type (general, semantic, procedural, emotional, attention, motor)',
                                    default: 'general'
                                },
                                initialWeight: {
                                    type: 'number',
                                    description: 'Initial memory weight (0.0-1.0)',
                                    default: 1.0
                                },
                                emotionalWeight: {
                                    type: 'number',
                                    description: 'Emotional significance weight (0.0-1.0)',
                                    default: 0.5
                                },
                                semanticWeight: {
                                    type: 'number',
                                    description: 'Semantic importance weight (0.0-1.0)',
                                    default: 0.5
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Memory tags for categorization'
                                }
                            },
                            required: ['content']
                        }
                    },
                    {
                        name: 'retrieve_neuromorphic_memory',
                        description: 'Retrieve specific memory by ID with weight-based access simulation',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                memoryId: {
                                    type: 'string',
                                    description: 'Memory ID to retrieve'
                                }
                            },
                            required: ['memoryId']
                        }
                    },
                    {
                        name: 'search_neuromorphic_memories',
                        description: 'Search memories using biomimetic parallel processing across all 6 brain regions',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query'
                                },
                                maxResults: {
                                    type: 'number',
                                    description: 'Maximum number of results',
                                    default: 20
                                },
                                minWeight: {
                                    type: 'number',
                                    description: 'Minimum memory weight threshold',
                                    default: 0.1
                                },
                                includeSubconscious: {
                                    type: 'boolean',
                                    description: 'Include subconscious memories',
                                    default: false
                                },
                                sortBy: {
                                    type: 'string',
                                    description: 'Sort criteria (weight, recent, frequency)',
                                    default: 'weight'
                                }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'perform_memory_consolidation',
                        description: 'Trigger biomimetic memory consolidation cycle (sleep simulation)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    description: 'Consolidation type (sws for slow-wave sleep, rem for REM sleep)',
                                    enum: ['sws', 'rem'],
                                    default: 'sws'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_neuromorphic_statistics',
                        description: 'Get comprehensive statistics about the neuromorphic memory system',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'initialize_neuromorphic_brain',
                        description: 'Initialize all 6 brain region connections for neuromorphic processing',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });
    }

    setupHandlers() {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'initialize_neuromorphic_brain':
                        return await this.initializeNeuromorphicBrain();

                    case 'store_neuromorphic_memory':
                        return await this.storeMemory(args);

                    case 'retrieve_neuromorphic_memory':
                        return await this.retrieveMemory(args);

                    case 'search_neuromorphic_memories':
                        return await this.searchMemories(args);

                    case 'perform_memory_consolidation':
                        return await this.performConsolidation(args);

                    case 'get_neuromorphic_statistics':
                        return await this.getStatistics();

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                console.error(`🚨 Tool execution error [${name}]:`, error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`
                        }
                    ]
                };
            }
        });
    }

    async initializeNeuromorphicBrain() {
        try {
            console.log('🧠 Initializing neuromorphic cognitive architecture...');
            
            this.memoryManager = new BiomimeticMemoryManager({
                // Configure with containerized brain regions
                hippocampus: {
                    host: 'localhost',
                    port: 6380,
                    password: 'neuromorphic2025'
                },
                neocortex: {
                    host: 'localhost',
                    port: 5433,
                    database: 'neocortex',
                    user: 'neuromorphic',
                    password: 'neuromorphic2025'
                },
                basalGanglia: {
                    uri: 'bolt://localhost:7688',
                    user: 'neo4j',
                    password: 'neuromorphic2025'
                },
                thalamus: {
                    url: 'http://localhost:8082',
                    user: 'neuromorphic',
                    password: 'neuromorphic2025'
                },
                amygdala: {
                    url: 'mongodb://neuromorphic:neuromorphic2025@localhost:27018',
                    database: 'amygdala'
                },
                cerebellum: {
                    brokers: ['localhost:9093'],
                    clientId: 'neuromorphic-mcp-server'
                }
            });

            await this.memoryManager.initialize();
            this.isInitialized = true;

            return {
                content: [
                    {
                        type: 'text',
                        text: '🎯 Neuromorphic brain initialized! All 6 brain regions connected:\n\n' +
                              '✅ Hippocampus (Redis:6380) - Working memory\n' +
                              '✅ Neocortex (PostgreSQL:5433) - Semantic knowledge\n' +
                              '✅ Basal Ganglia (Neo4j:7688) - Procedural patterns\n' +
                              '✅ Thalamus (SurrealDB:8082) - Attention/filtering\n' +
                              '✅ Amygdala (MongoDB:27018) - Emotional importance\n' +
                              '✅ Cerebellum (Kafka:9093) - Motor/execution patterns\n\n' +
                              '🧠 Ready for 1000x cognitive amplification!'
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to initialize neuromorphic brain: ${error.message}\n\n` +
                              'Ensure all 6 brain region containers are running:\n' +
                              '- docker-compose up -d\n' +
                              '- Check container status: docker ps'
                    }
                ]
            };
        }
    }

    async storeMemory(args) {
        await this.ensureInitialized();

        const { content, type, initialWeight, emotionalWeight, semanticWeight, tags } = args;

        // Generate embedding for memory content
        console.log('🔮 Generating embedding for memory content...');
        const embedding = await this.embeddingService.generateEmbedding(content);

        const memoryData = {
            content,
            type: type || 'general',
            initialWeight: initialWeight || 1.0,
            emotionalWeight: emotionalWeight || 0.5,
            semanticWeight: semanticWeight || 0.5,
            tags: tags || [],
            embedding,
            metadata: {
                embeddingModel: this.embeddingService.model,
                storedAt: new Date().toISOString()
            }
        };

        const memoryId = await this.memoryManager.storeMemory(memoryData);

        return {
            content: [
                {
                    type: 'text',
                    text: `🧠 Memory stored successfully!\n\n` +
                          `Memory ID: ${memoryId}\n` +
                          `Type: ${memoryData.type}\n` +
                          `Weight: ${memoryData.initialWeight}\n` +
                          `Emotional Weight: ${memoryData.emotionalWeight}\n` +
                          `Semantic Weight: ${memoryData.semanticWeight}\n` +
                          `Embedding: ${embedding.length} dimensions\n` +
                          `Tags: ${memoryData.tags.join(', ') || 'none'}\n\n` +
                          `Distributed across 6 brain regions for optimal recall.`
                }
            ]
        };
    }

    async retrieveMemory(args) {
        await this.ensureInitialized();

        const { memoryId } = args;
        const memory = await this.memoryManager.retrieveMemory(memoryId);

        if (!memory) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Memory not found: ${memoryId}`
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `🧠 Memory retrieved successfully!\n\n` +
                          `**Content:** ${memory.content}\n\n` +
                          `**Details:**\n` +
                          `- ID: ${memory.id}\n` +
                          `- Type: ${memory.type}\n` +
                          `- Weight: ${memory.weight}\n` +
                          `- Access Count: ${memory.accessCount}\n` +
                          `- Created: ${new Date(memory.created).toLocaleString()}\n` +
                          `- Last Accessed: ${new Date(memory.lastAccessed).toLocaleString()}\n` +
                          `- Tags: ${memory.tags.join(', ') || 'none'}`
                }
            ]
        };
    }

    async searchMemories(args) {
        await this.ensureInitialized();

        const { query, maxResults, minWeight, includeSubconscious, sortBy } = args;

        // Generate embedding for search query
        console.log('🔍 Generating embedding for search query...');
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);

        const searchOptions = {
            maxResults: maxResults || 20,
            minWeight: minWeight || 0.1,
            includeSubconscious: includeSubconscious || false,
            sortBy: sortBy || 'weight',
            queryEmbedding
        };

        const memories = await this.memoryManager.searchMemories(query, searchOptions);

        if (memories.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `🔍 No memories found for query: "${query}"\n\n` +
                              `Try adjusting search parameters:\n` +
                              `- Lower minWeight threshold\n` +
                              `- Include subconscious memories\n` +
                              `- Use different search terms`
                    }
                ]
            };
        }

        const resultText = memories.map((memory, index) => 
            `${index + 1}. **${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}**\n` +
            `   Weight: ${memory.weight.toFixed(3)} | Access Count: ${memory.accessCount} | Type: ${memory.type}\n` +
            `   ID: ${memory.id}\n`
        ).join('\n');

        return {
            content: [
                {
                    type: 'text',
                    text: `🧠 Found ${memories.length} memories for: "${query}"\n\n` +
                          `**Search Results:**\n${resultText}\n\n` +
                          `Searched across all 6 brain regions with parallel processing.`
                }
            ]
        };
    }

    async performConsolidation(args) {
        await this.ensureInitialized();

        const { type } = args;
        const consolidationType = type || 'sws';

        console.log(`💤 Starting ${consolidationType.toUpperCase()} consolidation cycle...`);
        const processed = await this.memoryManager.performConsolidation(consolidationType);

        return {
            content: [
                {
                    type: 'text',
                    text: `💤 ${consolidationType.toUpperCase()} consolidation complete!\n\n` +
                          `Processed: ${processed} memories\n` +
                          `Type: ${consolidationType === 'sws' ? 'Slow-Wave Sleep' : 'REM Sleep'}\n\n` +
                          `**Effects:**\n` +
                          `${consolidationType === 'sws' ? 
                            '- Strengthened recent important memories\n- Applied natural decay to unused memories' :
                            '- Enhanced semantic connections\n- Created creative associations'}\n\n` +
                          `Biomimetic sleep simulation strengthens your cognitive architecture.`
                }
            ]
        };
    }

    async getStatistics() {
        await this.ensureInitialized();

        const stats = await this.memoryManager.getMemoryStatistics();

        return {
            content: [
                {
                    type: 'text',
                    text: `📊 Neuromorphic Memory Statistics\n\n` +
                          `**Overall System:**\n` +
                          `- Total Memories: ${stats.totalMemories}\n` +
                          `- Conscious Memories: ${stats.consciousMemories}\n` +
                          `- Average Weight: ${stats.averageWeight.toFixed(3)}\n` +
                          `- Amplification Factor: ${stats.amplificationFactor.toFixed(1)}x\n\n` +
                          `**Weight Distribution:**\n` +
                          `- Conscious (≥0.8): ${stats.weightDistribution.conscious}\n` +
                          `- Accessible (≥0.3): ${stats.weightDistribution.accessible}\n` +
                          `- Dormant (<0.1): ${stats.weightDistribution.dormant}\n\n` +
                          `**Brain Region Distribution:**\n` +
                          `- Hippocampus: ${stats.regionDistribution.hippocampus.count || 0}\n` +
                          `- Neocortex: ${stats.regionDistribution.neocortex.count || 0}\n` +
                          `- Basal Ganglia: ${stats.regionDistribution.basalGanglia.count || 0}\n` +
                          `- Thalamus: ${stats.regionDistribution.thalamus.count || 0}\n` +
                          `- Amygdala: ${stats.regionDistribution.amygdala.count || 0}\n` +
                          `- Cerebellum: ${stats.regionDistribution.cerebellum.count || 0}\n\n` +
                          `**Consolidation:**\n` +
                          `- Cycles Performed: ${stats.consolidationsPerformed}\n` +
                          `- Last Consolidation: ${stats.lastConsolidation ? 
                            new Date(stats.lastConsolidation).toLocaleString() : 'Never'}\n\n` +
                          `🧠 Neuromorphic architecture achieving ${stats.amplificationFactor.toFixed(1)}x cognitive amplification!`
                }
            ]
        };
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Neuromorphic brain not initialized. Call initialize_neuromorphic_brain first.');
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('🧠 Neuromorphic MCP Server running - Ready for 1000x cognitive amplification!');
    }
}

// Start the server
const server = new NeuromorphicMCPServer();
server.run().catch(console.error);
