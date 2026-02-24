import OpenAI from 'openai';
import { z, ZodError } from 'zod';
import { checkAndRecord } from '../utils/rateLimit';

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are an expert in process modeling and workflow analysis.
Your only function is to convert natural language descriptions into a structured JSON that represents a flowchart diagram.

## STRICT RULES
- Respond ONLY with the JSON. No explanations, no text before or after, no markdown code blocks (do not use \`\`\`).
- If the input does not describe a valid flow, return: {"error": "Could not be interpreted as a flow"}
- Never invent steps that the user did not mention.
- If there is ambiguity, choose the simplest interpretation.

## NODE TYPES
Use exactly these values for the "type" field:
- "start"     → the starting point of the flow (there can only be 1)
- "end"       → the end point of the flow (there can be multiple)
- "action"    → an action, task, or concrete step
- "condition" → a decision or yes/no question (always has exactly 2 outgoing edges)

## REQUIRED JSON STRUCTURE
{
  "nodes": [
    { "id": "1", "label": "short node text", "type": "start|end|action|condition" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "optional text on the arrow" }
  ]
}

## CONSTRUCTION RULES
- Node labels must be short: 6 words maximum.
- "condition" nodes MUST always have exactly 2 outgoing edges, with labels "Yes" and "No".
- The flow always starts with a "start" node and ends with at least one "end" node.
- IDs are sequential numeric strings: "1", "2", "3"...
- No node can be disconnected (all nodes must have at least 1 incoming or outgoing edge).

## EXAMPLE
Input: "The user registers, their email is verified, if valid they enter the system, if not they are asked to retry"

Output:
{
  "nodes": [
    { "id": "1", "label": "User registers", "type": "start" },
    { "id": "2", "label": "Verify email", "type": "action" },
    { "id": "3", "label": "Is email valid?", "type": "condition" },
    { "id": "4", "label": "Enter the system", "type": "end" },
    { "id": "5", "label": "Ask user to retry", "type": "end" }
  ],
  "edges": [
    { "from": "1", "to": "2" },
    { "from": "2", "to": "3" },
    { "from": "3", "to": "4", "label": "Yes" },
    { "from": "3", "to": "5", "label": "No" }
  ]
}`;

const FlowNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['start', 'end', 'action', 'condition']),
});

const FlowEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});

export const FlowGraphSchema = z.object({
  nodes: z.array(FlowNodeSchema).min(1),
  edges: z.array(FlowEdgeSchema).min(1),
});

export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export type FlowGraph = z.infer<typeof FlowGraphSchema>;

function validateFlow(graph: FlowGraph): void {
  if (!graph.nodes.find(n => n.type === 'start')) throw new Error('Missing start node');
  if (!graph.nodes.find(n => n.type === 'end')) throw new Error('Missing end node');

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) throw new Error(`Edge references unknown node: ${edge.from}`);
    if (!nodeIds.has(edge.to)) throw new Error(`Edge references unknown node: ${edge.to}`);
  }
}

export async function generateFlow(userPrompt: string): Promise<FlowGraph> {
  checkAndRecord();
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Invalid JSON response from AI');
  }

  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    throw new Error((parsed as { error: string }).error);
  }

  try {
    const graph = FlowGraphSchema.parse(parsed);
    validateFlow(graph);
    return graph;
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      throw new Error(`Invalid response structure: ${first.path.join('.')} — ${first.message}`);
    }
    throw err;
  }
}
