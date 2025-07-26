# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Agent Framework**: Cloudflare Agents package for chat management and scheduling

### Key Files

- `src/server.ts` - Main Chat Durable Object class extending AIChatAgent
- `src/tools.ts` - Tool definitions (both auto-executing and confirmation-required)
- `src/app.tsx` - Chat UI implementation with React
- `src/utils.ts` - Tool processing utilities for human-in-the-loop confirmations
- `wrangler.jsonc` - Cloudflare Workers configuration with Durable Objects

### Tool System Architecture

Tools can be configured in two ways:
1. **Auto-executing tools**: Include an `execute` function for immediate execution
2. **Confirmation-required tools**: Omit `execute` function, implement in `executions` object in `tools.ts`

Tool confirmations are handled in the UI via `toolsRequiringConfirmation` array in `app.tsx`.

### Environment Setup

Required environment variables:
- `OPENAI_API_KEY` - Set in `.dev.vars` for local development
- `GATEWAY_BASE_URL` - Optional, enables Cloudflare AI Gateway routing
- Use `wrangler secret bulk .dev.vars` for production deployment

### AI Gateway Configuration

The project supports optional Cloudflare AI Gateway integration:
- Add `GATEWAY_BASE_URL` to `.dev.vars` to route requests through AI Gateway
- Format: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai`
- Provides observability, caching, rate limiting, and cost tracking
- Code automatically detects and uses gateway when configured

### Agent Features

- Real-time streaming chat with GPT-4o
- Tool execution with human-in-the-loop confirmations
- Task scheduling (one-time, delayed, cron-based) via `scheduleTask` tool
- Chat history persistence via Durable Objects
- MCP (Model Context Protocol) support for external tool integration

### Code Style

- Uses Biome for linting with TypeScript support
- Prettier disabled in favor of Biome formatting
- TailwindCSS for styling with custom component system
- TypeScript with strict configuration