import {
  routeAgentRequest,
  type Schedule,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "agents";

import { unstable_getSchedulePrompt } from "agents/schedule";

import { AIChatAgent } from "agents/ai-chat-agent";
import {
  createDataStreamResponse,
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { processToolCalls } from "./utils";
import { tools, executions } from "./tools";

// Configure OpenAI with optional AI Gateway
const getOpenAIProvider = (env: Env) => {
  // Use AI Gateway if configured, otherwise use direct OpenAI
  console.log("Configuring OpenAI provider:");
  console.log("- GATEWAY_BASE_URL:", env.GATEWAY_BASE_URL);
  console.log("- CLOUDFLARE_API_TOKEN configured:", !!env.CLOUDFLARE_API_TOKEN);
  console.log("- OPENAI_API_KEY configured:", !!env.OPENAI_API_KEY);
  
  if (env.GATEWAY_BASE_URL && env.CLOUDFLARE_API_TOKEN) {
    console.log("Using AI Gateway with authentication");
    return createOpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: `${env.GATEWAY_BASE_URL}/openai`,
      headers: {
        "cf-aig-authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    });
  } else if (env.GATEWAY_BASE_URL) {
    console.log("Using AI Gateway without authentication");
    return createOpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: `${env.GATEWAY_BASE_URL}/openai`,
    });
  }
  console.log("Using direct OpenAI connection");
  return openai;
};

const getModel = (env: Env) => {
  const provider = getOpenAIProvider(env);
  return provider("gpt-4o-2024-11-20");
};

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
export class Chat extends AIChatAgent<Env> {
  private activeConnections = new Set<Connection>();
  
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    console.log("Chat agent instance created");
  }
  
  // Add a method to catch any incoming requests to see what's being called
  async fetch(request: Request): Promise<Response> {
    console.log(`Chat agent received request: ${request.method} ${new URL(request.url).pathname}`);
    const response = await super.fetch(request);
    console.log(`Chat agent response status: ${response.status}`);
    return response;
  }
  /**
   * Handles incoming chat messages and manages the response stream
   * @param onFinish - Callback function executed when streaming completes
   */

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    console.log("onChatMessage called - processing chat request");
    console.log("Gateway configured:", !!this.env.GATEWAY_BASE_URL);
    console.log("Token configured:", !!this.env.CLOUDFLARE_API_TOKEN);
    
    const model = getModel(this.env);
    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    // Collect all tools, including MCP tools
    const allTools = {
      ...tools,
      ...this.mcp.unstable_getAITools(),
    };

    // Create a streaming response that handles both text and tool outputs
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: this.messages,
          dataStream,
          tools: allTools,
          executions,
        });

        console.log("About to call streamText with model:", model);
        console.log("Processed messages count:", processedMessages.length);
        
        // Stream the AI response using GPT-4
        const result = streamText({
          model,
          system: `You are a helpful assistant that can do various tasks... 

${unstable_getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
`,
          messages: processedMessages,
          tools: allTools,
          onFinish: async (args) => {
            console.log("streamText finished successfully");
            onFinish(
              args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]
            );
            // await this.mcp.closeConnection(mcpConnection.id);
          },
          onError: (error) => {
            console.error("Error while streaming:", error);
          },
          maxSteps: 10,
        });
        
        console.log("streamText result created, merging into dataStream");

        // Merge the AI response stream with tool execution outputs
        result.mergeIntoDataStream(dataStream);
      },
    });

    return dataStreamResponse;
  }
  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        content: `Running scheduled task: ${description}`,
        createdAt: new Date(),
      },
    ]);
  }

  /**
   * WebSocket connection handler - called when a client connects
   */
  async onConnect(connection: Connection, _ctx: ConnectionContext) {
    console.log(`Client connected: ${connection.id}`);
    this.activeConnections.add(connection);

    // Send welcome message
    connection.send(
      JSON.stringify({
        type: "connection_established",
        message: "Connected to Chat Agent with AI Gateway support",
        supportsRealtime:
          !!this.env.GATEWAY_BASE_URL && !!this.env.CLOUDFLARE_API_TOKEN,
      })
    );
  }

  /**
   * WebSocket message handler - let parent class handle the protocol
   */
  async onMessage(connection: Connection, message: WSMessage) {
    console.log("WebSocket message received:", typeof message);
    // Let the parent AIChatAgent class handle the WebSocket protocol
    return super.onMessage(connection, message);
  }

  /**
   * WebSocket error handler
   */
  async onError(connection: Connection, error: unknown): Promise<void>;
  async onError(error: unknown): Promise<void>;
  async onError(
    connectionOrError: Connection | unknown,
    error?: unknown
  ): Promise<void> {
    if (error !== undefined) {
      // Called with connection and error
      const connection = connectionOrError as Connection;
      console.error(`WebSocket error for connection ${connection.id}:`, error);
    } else {
      // Called with just error
      console.error(`WebSocket error:`, connectionOrError);
    }
  }

  /**
   * WebSocket close handler
   */
  async onClose(
    connection: Connection,
    code: number,
    reason: string,
    _wasClean: boolean
  ) {
    console.log(`Connection ${connection.id} closed: ${code} - ${reason}`);
    this.activeConnections.delete(connection);
  }

  /**
   * Handle chat messages via AI Gateway Universal endpoint (HTTP)
   */
  private async handleChatMessageViaAIGateway(
    connection: Connection,
    data: {
      realtime?: boolean;
      messages?: any[];
      tools?: any[];
      type?: string;
    }
  ) {
    try {
      // Check if AI Gateway is configured
      if (!this.env.GATEWAY_BASE_URL || !this.env.CLOUDFLARE_API_TOKEN) {
        connection.send(
          JSON.stringify({
            type: "fallback",
            message: "AI Gateway not configured, using standard HTTP",
          })
        );
        return;
      }

      // Determine provider and endpoint based on message requirements
      const useRealtimeAPI = data.realtime || false;

      // Convert gateway URL to Universal endpoint
      const universalURL = this.env.GATEWAY_BASE_URL.replace("/openai", "");

      const aiGatewayRequest = [
        {
          provider: "openai",
          endpoint: useRealtimeAPI ? "realtime" : "chat/completions",
          headers: {
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            ...(useRealtimeAPI && { "OpenAI-Beta": "realtime=v1" }),
          },
          query: {
            model: "gpt-4o-2024-11-20",
            messages: data.messages || [],
            stream: true,
            ...(data.tools && { tools: data.tools }),
          },
        },
      ];

      // Make HTTP request to AI Gateway Universal endpoint
      const response = await fetch(universalURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cf-aig-authorization": `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: JSON.stringify(aiGatewayRequest),
      });

      if (!response.ok) {
        throw new Error(
          `AI Gateway request failed: ${response.status} ${response.statusText}`
        );
      }

      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Send chunk back to client
            connection.send(
              JSON.stringify({
                type: "ai_response_chunk",
                data: chunk,
              })
            );
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Send completion message
      connection.send(
        JSON.stringify({
          type: "ai_response_complete",
        })
      );
    } catch (error) {
      console.error("Error handling chat message via AI Gateway:", error);
      connection.send(
        JSON.stringify({
          type: "error",
          error: "Failed to process chat message via AI Gateway",
        })
      );
    }
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    console.log(`Incoming request: ${request.method} ${url.pathname}`);

    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!env.OPENAI_API_KEY;
      return Response.json({
        success: hasOpenAIKey,
        gateway: !!env.GATEWAY_BASE_URL,
      });
    }
    if (!env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
      );
    }
    
    // Route the request to our agent or return 404 if not found
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      console.log("Request routed to agent successfully");
      return agentResponse;
    } else {
      console.log("No agent route found, returning 404");
      return new Response("Not found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
