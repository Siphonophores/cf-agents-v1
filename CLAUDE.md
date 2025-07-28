# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ IMPORTANT: Check SDK Features First

**Before implementing custom features, ALWAYS:**

1. **Search existing SDK capabilities** - Use MCP tools to check Cloudflare Agents SDK documentation thoroughly
2. **Review API reference** - Check `cf-docs-agents-api.md` for built-in methods and patterns
3. **Examine current implementation** - Look at existing code in `src/server.ts` for patterns already implemented
4. **Consider WebSocket protocol** - The Agents SDK has sophisticated WebSocket handling - avoid manual message interception

**Key Learning**: The `AIChatAgent` class has built-in WebSocket protocol handling. Custom implementations should extend `onChatMessage()` rather than intercept WebSocket messages directly via `onMessage()`. The SDK handles the `cf_agent_use_chat_request` protocol internally.

## Development Commands

- `npm start` - Start development server with Vite
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm test` - Run tests with Vitest
- `npm run types` - Generate Wrangler type definitions
- `npm run format` - Format code with Prettier
- `npm run check` - Run full check (Prettier, Biome lint, TypeScript)

## Project Architecture

This is a Cloudflare Workers AI Chat Agent built with:

- **Frontend**: React with Vite, TailwindCSS for UI
- **Backend**: Cloudflare Workers with Durable Objects for chat persistence
- **AI Integration**: Vercel AI SDK with OpenAI GPT-4o model
- **Agent Framework**: Cloudflare Agents SDK for chat management, scheduling, and WebSocket communication
- **Communication**: WebSocket-first with HTTP fallback for improved latency and real-time interactions

### Key Files

- `src/server.ts` - Main Chat Durable Object class extending AIChatAgent with WebSocket handlers
- `src/tools.ts` - Tool definitions (both auto-executing and confirmation-required)
- `src/app.tsx` - Chat UI implementation with React using `useAgentChat` hook
- `src/utils.ts` - Tool processing utilities for human-in-the-loop confirmations
- `wrangler.jsonc` - Cloudflare Workers configuration with Durable Objects
- `cf-docs-agents-api.md` - Comprehensive Cloudflare Agents SDK API reference
- `cf-docs-using-web-sockets.md` - WebSocket implementation patterns and examples

### Tool System Architecture

Tools can be configured in two ways:

1. **Auto-executing tools**: Include an `execute` function for immediate execution
2. **Confirmation-required tools**: Omit `execute` function, implement in `executions` object in `tools.ts`

Tool confirmations are handled in the UI via `toolsRequiringConfirmation` array in `app.tsx`.

### Environment Setup

Required environment variables:

- `OPENAI_API_KEY` - Set in `.dev.vars` for local development
- `GATEWAY_BASE_URL` - Optional, enables Cloudflare AI Gateway routing
- `CLOUDFLARE_API_TOKEN` - Required for AI Gateway authentication (create token with "AI Gateway Run" permission)
- Use `wrangler secret bulk .dev.vars` for production deployment (CRITICAL: Run this after any changes to .dev.vars)

**Creating the AI Gateway Token:**

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" → "Custom token"
3. Set permissions: Account - "AI Gateway:Run"
4. Include your account in account resources
5. Copy the token to your `.dev.vars` file

### AI Gateway & WebSocket Configuration

The project supports Cloudflare AI Gateway integration with both HTTP and WebSocket transport:

**HTTP Transport (existing):**

- Add `GATEWAY_BASE_URL` to `.dev.vars` to route requests through AI Gateway
- Format: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai`

**AI Gateway Integration (Current Implementation):**

- HTTP transport through Vercel AI SDK's `streamText()` with AI Gateway routing
- Authentication via `cf-aig-authorization: Bearer {CLOUDFLARE_API_TOKEN}` header
- Streaming responses delivered over existing WebSocket connection managed by AIChatAgent
- GATEWAY_BASE_URL format: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}` (without `/openai` suffix)

**Benefits:**

- Observability, caching, rate limiting, and cost tracking
- Reduced connection overhead and improved latency
- Real-time bi-directional communication
- Multi-provider support through Universal endpoint

### Cloudflare Agents SDK Features

**Core Capabilities:**

- **Real-time communication**: WebSocket connections via `onConnect`, `onMessage`, `onError`, `onClose` handlers
- **Built-in state management**: Automatic state sync between Agent and clients via `setState()` and SQL database
- **Scalable architecture**: Durable Objects provide stateful micro-servers that scale to millions of instances
- **Chat-focused**: `AIChatAgent` class with `onChatMessage()` for streaming AI interactions

**Current Implementation:**

- Real-time streaming chat with GPT-4o through WebSocket and HTTP transport
- Tool execution with human-in-the-loop confirmations
- Task scheduling (one-time, delayed, cron-based) via `scheduleTask` tool
- Chat history persistence via Durable Objects
- MCP (Model Context Protocol) support for external tool integration
- AI Gateway integration for observability, caching, and multi-provider support

### WebSocket Implementation Learnings

**Final Architecture (Working Implementation):**

```
Frontend (useAgentChat)
  ↓ WebSocket (Agents SDK protocol: cf_agent_use_chat_request)
AIChatAgent (built-in protocol handling)
  ↓ onChatMessage() callback
AI Gateway HTTP/WebSocket
  ↓ Provider routing (OpenAI API)
OpenAI GPT-4o
```

**Key Insights from Implementation:**

1. **AIChatAgent Protocol**: The `AIChatAgent` class handles WebSocket protocol internally. Messages from `useAgentChat` are automatically routed to `onChatMessage()` without manual intervention.

2. **WebSocket vs HTTP**: While Cloudflare supports WebSocket connections to AI Gateway, the current implementation uses HTTP transport through `streamText()` from Vercel AI SDK. This provides reliable streaming with built-in error handling.

3. **Message Flow (Actual):**
   - Frontend sends chat via `useAgentChat` hook
   - AIChatAgent receives via internal protocol handling
   - `onChatMessage()` processes request using `streamText()`
   - AI Gateway routes HTTP request to OpenAI
   - Response streams back through existing WebSocket connection
   - UI renders streaming response without modification

4. **Authentication**: AI Gateway requires `cf-aig-authorization: Bearer {CLOUDFLARE_API_TOKEN}` header for authenticated requests.

5. **Production Deployment**: Always run `wrangler secret bulk .dev.vars` to sync environment variables to production after local changes.

**Avoided Implementations:**
- Manual WebSocket message interception in `onMessage()`
- Custom WebSocket client connections (not supported in Workers)
- Direct AI Gateway WebSocket Universal endpoint usage (HTTP works reliably)

### Code Style

- Uses Biome for linting with TypeScript support
- Prettier disabled in favor of Biome formatting
- TailwindCSS for styling with custom component system
- TypeScript with strict configuration
