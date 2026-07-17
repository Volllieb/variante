---
name: ai-architect
description: AI-Architektur-Wissen für Vercel AI SDK v6. Pattern-Selektion (generateText, useChat, ToolLoopAgent, DurableAgent), Model-Wahl, Provider-Strategie, MCP-Integration, Fehlerdiagnose. Verwenden bei: Chatbot bauen, AI SDK einrichten, Agent-Design, Provider-Konfiguration.
---

# AI Architect — Vercel AI SDK v6

## AI Pattern Selection Tree

```
What does the AI feature need to do?
├─ Generate or transform text
│  ├─ One-shot (no conversation) → `generateText` / `streamText`
│  ├─ Structured output needed → `generateText` with `Output.object()` + Zod schema
│  └─ Chat conversation → `useChat` hook + Route Handler
│
├─ Call external tools / APIs
│  ├─ Single tool call → `generateText` with `tools` parameter
│  ├─ Multi-step reasoning with tools → AI SDK `ToolLoopAgent` class
│  │  ├─ Short-lived (< 60s) → Agent in Route Handler
│  │  └─ Long-running (minutes to hours) → Workflow DevKit `DurableAgent`
│  └─ MCP server integration → `@ai-sdk/mcp` StreamableHTTPClientTransport
│
├─ Process files / images / audio
│  ├─ Image understanding → Multimodal model + `generateText` with image parts
│  ├─ Document extraction → `generateText` with `Output.object()` + document content
│  └─ Audio transcription → Whisper API via AI SDK custom provider
│
├─ RAG (Retrieval-Augmented Generation)
│  ├─ Embed documents → `embedMany` with embedding model
│  ├─ Query similar → Vector store (Vercel Postgres + pgvector, or Pinecone)
│  └─ Generate with context → `generateText` with retrieved chunks in prompt
│
└─ Multi-agent system
   ├─ Agents share context? → Workflow DevKit `Worlds` (shared state)
   ├─ Independent agents? → Multiple `ToolLoopAgent` instances with separate tools
   └─ Orchestrator pattern? → Parent Agent delegates to child Agents via tools
```

## Model Selection Decision Tree

```
Choosing a model?
├─ What's the priority?
│  ├─ Speed + low cost
│  │  ├─ Simple tasks (classification, extraction) → `gpt-5.2`
│  │  ├─ Fast with good quality → `gemini-3-flash`
│  │  └─ Lowest latency → `claude-haiku-4.5`
│  │
│  ├─ Maximum quality
│  │  ├─ Complex reasoning → `claude-opus-4.6` or `gpt-5`
│  │  ├─ Long context (> 100K tokens) → `gemini-3.1-pro-preview` (1M context)
│  │  └─ Balanced quality/speed → `claude-sonnet-4.6`
│  │
│  ├─ Code generation
│  │  ├─ Inline completions → `gpt-5.3-codex`
│  │  ├─ Full file generation → `claude-sonnet-4.6` or `gpt-5`
│  │  └─ Code review / analysis → `claude-opus-4.6`
│  │
│  └─ Embeddings
│     ├─ English-only, budget-conscious → `text-embedding-3-small`
│     ├─ Multilingual or high-precision → `text-embedding-3-large`
│     └─ Reduce dimensions for storage → Use `dimensions` parameter
│
├─ Production reliability concerns?
│  ├─ AI Gateway with fallback ordering:
│  │  primary: claude-sonnet-4.6 → fallback: gpt-5 → fallback: gemini-3.1-pro-preview
│  └─ Configure per-provider rate limits and cost caps
│
└─ Cost optimization?
   ├─ Cheaper model for routing/classification, expensive for generation
   ├─ Cache repeated queries with Cache Components around AI calls
   └─ Track costs per user/feature with AI Gateway tags
```

## Type-Safe Agents (AI SDK v6)

### Recommended Structure
```
lib/
  agents/
    my-agent.ts       # Agent definition + type export
  tools/
    weather-tool.ts   # Individual tool definitions
    calculator-tool.ts
```

### Define Tools
```ts
// lib/tools/weather-tool.ts
import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, condition: 'sunny', location };
  },
});
```

### Define Agent and Export Type
```ts
// lib/agents/my-agent.ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';
import { weatherTool } from '../tools/weather-tool';

export const myAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4',
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: weatherTool,
  },
});

export type MyAgentUIMessage = InferAgentUIMessage<typeof myAgent>;
```

### Use with `useChat`
```tsx
// app/chat.tsx
import { useChat } from '@ai-sdk/react';
import type { MyAgentUIMessage } from '@/lib/agents/my-agent';

export function Chat() {
  const { messages } = useChat<MyAgentUIMessage>();
  return (
    <div>
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  );
}
```

### Rendering Parts with Type Safety
```tsx
function Message({ message }: { message: MyAgentUIMessage }) {
  return (
    <div>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <p key={i}>{part.text}</p>;
          case 'tool-weather':
            if (part.state === 'output-available') {
              return (
                <div key={i}>
                  Weather in {part.input.location}: {part.output.temperature}F
                </div>
              );
            }
            return <div key={i}>Loading weather...</div>;
          default:
            return null;
        }
      })}
    </div>
  );
}
```

### Splitting Tool Rendering into Components
```ts
// lib/tools/weather-tool.ts
import { tool, UIToolInvocation } from 'ai';

export type WeatherToolInvocation = UIToolInvocation<typeof weatherTool>;
```

```tsx
// components/weather-tool.tsx
import type { WeatherToolInvocation } from '@/lib/tools/weather-tool';

export function WeatherToolComponent({
  invocation,
}: {
  invocation: WeatherToolInvocation;
}) {
  if (invocation.state === 'output-available') {
    return (
      <div>
        Weather in {invocation.input.location}: {invocation.output.temperature}F
      </div>
    );
  }
  return <div>Loading weather for {invocation.input?.location}...</div>;
}
```

## AI Error Diagnostic Tree

```
AI feature failing?
├─ "Model not found" / 401 Unauthorized
│  ├─ API key set? → Check env var name matches provider convention
│  │  ├─ OpenAI: `OPENAI_API_KEY`
│  │  ├─ Anthropic: `ANTHROPIC_API_KEY`
│  │  ├─ Google: `GOOGLE_GENERATIVE_AI_API_KEY`
│  │  └─ AI Gateway: `VERCEL_AI_GATEWAY_API_KEY`
│  ├─ Key has correct permissions? → Check provider dashboard
│  └─ Using AI Gateway? → Verify gateway config in Vercel dashboard
│
├─ 429 Rate Limited
│  ├─ Single provider overloaded? → Add fallback providers via AI Gateway
│  ├─ Burst traffic? → Add application-level queue or rate limiting
│  └─ Cost cap hit? → Check AI Gateway cost limits
│
├─ Streaming not working
│  ├─ Using Edge runtime? → Streaming works by default
│  ├─ Using Node.js runtime? → Ensure `supportsResponseStreaming: true`
│  ├─ Proxy or CDN buffering? → Check for buffering headers
│  └─ Client not consuming stream? → Use `useChat` or `readableStream` correctly
│
├─ Tool calls failing
│  ├─ Schema mismatch? → Ensure `inputSchema` matches what model sends
│  ├─ Tool execution error? → Wrap in try/catch, return error as tool result
│  ├─ Model not calling tools? → Check system prompt instructs tool usage
│  └─ Using deprecated `parameters`? → Migrate to `inputSchema` (AI SDK v6)
│
├─ Agent stuck in loop
│  ├─ No step limit? → Add `stopWhen: stepCountIs(N)` (v6; `maxSteps` was removed)
│  ├─ Tool always returns same result? → Add variation or "give up" condition
│  └─ Circular tool dependency? → Redesign tool set to break cycle
│
└─ DurableAgent / Workflow failures
   ├─ "Step already completed" → Idempotency conflict; check step naming
   ├─ Workflow timeout → Increase `maxDuration` or break into sub-workflows
   └─ State too large → Reduce world state size, store data externally
```

## Provider Strategy Decision Matrix

| Scenario | Configuration | Rationale |
|----------|--------------|-----------|
| Development / prototyping | Direct provider SDK | Simplest setup, fast iteration |
| Single-provider production | AI Gateway with monitoring | Cost tracking, usage analytics |
| Multi-provider production | AI Gateway with ordered fallbacks | High availability, auto-failover |
| Cost-sensitive | AI Gateway with model routing | Cheap model for simple, expensive for complex |
| Compliance / data residency | Specific provider + region lock | Data stays in required jurisdiction |
| High-throughput | AI Gateway + rate limiting + queue | Prevents rate limit errors |
