// Shadow Clone Memory Gateway Agent
// Runs on local VLLM with Phi-3.5-mini for speed

import { VLLMClient } from './vllm-client.js';
import { HybridMemory } from './hybrid-memory.js';

class MemoryGatewayClone {
  constructor() {
    this.vllm = new VLLMClient({
      model: 'microsoft/Phi-3.5-mini-instruct',
      baseUrl: 'http://localhost:8001',
      temperature: 0.1 // Consistent behavior
    });
    
    this.memory = new HybridMemory();
  }

  async processMemoryOperation(operation) {
    const { type, data } = operation;
    
    // Shadow Clone Jutsu - spawn parallel operations
    const clones = await Promise.all([
      this.cloneEntityCheck(data),
      this.clonePriorityAssignment(data),
      this.cloneRelationshipMapping(data)
    ]);
    
    // Collect clone knowledge
    const [entityStatus, priority, relationships] = clones;
    
    // Synthesize results
    return this.synthesize({
      operation: type,
      entityStatus,
      priority,
      relationships,
      originalData: data
    });
  }
  
  async cloneEntityCheck(data) {
    // Clone 1: Check if entity exists
    const prompt = `
      Task: Check if entity exists in knowledge graph
      Entity Name: ${data.name}
      Entity Type: ${data.entity_type}
      
      Search for exact matches and similar entities.
      Return: { exists: boolean, similar: string[], exactMatch: string }
    `;
    
    const result = await this.vllm.complete(prompt);
    const existing = await this.memory.searchNodes(data.name);
    
    return {
      exists: existing.results.length > 0,
      similar: existing.results.map(e => e.name),
      exactMatch: existing.results.find(e => e.name === data.name)?.name
    };
  }
  
  async clonePriorityAssignment(data) {
    // Clone 2: Auto-assign priority
    const prompt = `
      Task: Assign priority level
      Content: ${data.content}
      Type: ${data.entity_type}
      
      Priority Levels:
      - P0-CRITICAL: Infrastructure, core patterns, tool configs
      - P1-HIGH: Active projects, current work
      - P2-MEDIUM: Reference, completed work
      
      Return: { priority: string, reasoning: string }
    `;
    
    const result = await this.vllm.complete(prompt);
    return JSON.parse(result);
  }
  
  async cloneRelationshipMapping(data) {
    // Clone 3: Map relationships
    const prompt = `
      Task: Identify relationships
      Entity: ${data.name}
      Content: ${data.content}
      
      Find entities this should connect to.
      Relationship types: uses, implements, references, generates, inspires
      
      Return: { relationships: [{from, to, type}] }
    `;
    
    const result = await this.vllm.complete(prompt);
    return JSON.parse(result);
  }
  
  async synthesize(cloneResults) {
    const { operation, entityStatus, priority, relationships, originalData } = cloneResults;
    
    // Synthesis logic - combine clone knowledge
    if (operation === 'store' && entityStatus.exists) {
      // Convert to edit operation
      return {
        action: 'add_observations',
        entity_name: entityStatus.exactMatch,
        observations: [originalData.content],
        metadata_updates: { 
          priority: priority.priority,
          last_updated: new Date().toISOString()
        }
      };
    }
    
    // Create new entity with auto-assigned values
    return {
      action: 'store_memory',
      ...originalData,
      metadata: {
        ...originalData.metadata,
        priority: priority.priority,
        auto_assigned: true
      },
      relationships: relationships.relationships
    };
  }
}

// n8n webhook handler
export async function handleMemoryRequest(req, res) {
  const gateway = new MemoryGatewayClone();
  const result = await gateway.processMemoryOperation(req.body);
  
  res.json({
    success: true,
    result,
    executionTime: Date.now() - req.startTime,
    method: 'shadow_clone_parallelism'
  });
}

// Deployment notes:
// 1. Run VLLM: vllm serve microsoft/Phi-3.5-mini-instruct --port 8001 --gpu-memory-utilization 0.5
// 2. This agent handles ALL memory operations - Claude just sends requests
// 3. True parallelism through Promise.all() - all clones work simultaneously
// 4. Each clone has a specific job - no context switching
