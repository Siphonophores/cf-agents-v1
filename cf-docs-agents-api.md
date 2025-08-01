---
title: Agents API · Cloudflare Agents docs
description: This page provides an overview of the Agent SDK API, including the
  Agent class, methods and properties built-in to the Agents SDK.
lastUpdated: 2025-06-26T18:43:59.000Z
chatbotDeprioritize: false
source_url:
  html: https://developers.cloudflare.com/agents/api-reference/agents-api/
  md: https://developers.cloudflare.com/agents/api-reference/agents-api/index.md
---

This page provides an overview of the Agent SDK API, including the `Agent` class, methods and properties built-in to the Agents SDK.

The Agents SDK exposes two main APIs:

- The server-side `Agent` class. An Agent encapsulates all of the logic for an Agent, including how clients can connect to it, how it stores state, the methods it exposes, how to call AI models, and any error handling.
- The client-side `AgentClient` class, which allows you to connect to an Agent instance from a client-side application. The client APIs also include React hooks, including `useAgent` and `useAgentChat`, and allow you to automatically synchronize state between each unique Agent (running server-side) and your client applications.

Note

Agents require [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/), see [Configuration](https://developers.cloudflare.com/agents/getting-started/testing-your-agent/#add-the-agent-configuration) to learn how to add the required bindings to your project.

You can also find more specific usage examples for each API in the [Agents API Reference](https://developers.cloudflare.com/agents/api-reference/).

- JavaScript

  ```js
  import { Agent } from "agents";

  class MyAgent extends Agent {
    // Define methods on the Agent
  }

  export default MyAgent;
  ```

- TypeScript

  ```ts
  import { Agent } from "agents";

  class MyAgent extends Agent {
    // Define methods on the Agent
  }

  export default MyAgent;
  ```

An Agent can have many (millions of) instances: each instance is a separate micro-server that runs independently of the others. This allows Agents to scale horizontally: an Agent can be associated with a single user, or many thousands of users, depending on the agent you're building.

Instances of an Agent are addressed by a unique identifier: that identifier (ID) can be the user ID, an email address, GitHub username, a flight ticket number, an invoice ID, or any other identifier that helps to uniquely identify the instance and for whom it is acting on behalf of.

Note

An instance of an Agent is globally unique: given the same name (or ID), you will always get the same instance of an agent.

This allows you to avoid synchronizing state across requests: if an Agent instance represents a specific user, team, channel or other entity, you can use the Agent instance to store state for that entity. No need to set up a centralized session store.

If the client disconnects, you can always route the client back to the exact same Agent and pick up where they left off.

### Agent class API

Writing an Agent requires you to define a class that extends the `Agent` class from the Agents SDK package. An Agent encapsulates all of the logic for an Agent, including how clients can connect to it, how it stores state, the methods it exposes, and any error handling.

You can also define your own methods on an Agent: it's technically valid to publish an Agent only has your own methods exposed, and create/get Agents directly from a Worker.

Your own methods can access the Agent's environment variables and bindings on `this.env`, state on `this.setState`, and call other methods on the Agent via `this.yourMethodName`.

- JavaScript

  ```js
  import { Agent } from "agents";

  // Pass the Env as a TypeScript type argument
  // Any services connected to your Agent or Worker as Bindings
  // are then available on this.env.<BINDING_NAME>

  // The core class for creating Agents that can maintain state, orchestrate
  // complex AI workflows, schedule tasks, and interact with users and other
  // Agents.
  class MyAgent extends Agent {
    // Optional initial state definition
    initialState = {
      counter: 0,
      messages: [],
      lastUpdated: null,
    };

    // Called when a new Agent instance starts or wakes from hibernation
    async onStart() {
      console.log("Agent started with state:", this.state);
    }

    // Handle HTTP requests coming to this Agent instance
    // Returns a Response object
    async onRequest(request) {
      return new Response("Hello from Agent!");
    }

    // Called when a WebSocket connection is established
    // Access the original request via ctx.request for auth etc.
    async onConnect(connection, ctx) {
      // Connections are automatically accepted by the SDK.
      // You can also explicitly close a connection here with connection.close()
      // Access the Request on ctx.request to inspect headers, cookies and the URL
    }

    // Called for each message received on a WebSocket connection
    // Message can be string, ArrayBuffer, or ArrayBufferView
    async onMessage(connection, message) {
      // Handle incoming messages
      connection.send("Received your message");
    }

    // Handle WebSocket connection errors
    async onError(connection, error) {
      console.error(`Connection error:`, error);
    }

    // Handle WebSocket connection close events
    async onClose(connection, code, reason, wasClean) {
      console.log(`Connection closed: ${code} - ${reason}`);
    }

    // Called when the Agent's state is updated from any source
    // source can be "server" or a client Connection
    onStateUpdate(state, source) {
      console.log("State updated:", state, "Source:", source);
    }

    // You can define your own custom methods to be called by requests,
    // WebSocket messages, or scheduled tasks
    async customProcessingMethod(data) {
      // Process data, update state, schedule tasks, etc.
      this.setState({ ...this.state, lastUpdated: new Date() });
    }
  }
  ```

- TypeScript

  ```ts
  import { Agent } from "agents";

  interface Env {
    // Define environment variables & bindings here
  }

  // Pass the Env as a TypeScript type argument
  // Any services connected to your Agent or Worker as Bindings
  // are then available on this.env.<BINDING_NAME>

  // The core class for creating Agents that can maintain state, orchestrate
  // complex AI workflows, schedule tasks, and interact with users and other
  // Agents.
  class MyAgent extends Agent<Env, State> {
    // Optional initial state definition
    initialState = {
      counter: 0,
      messages: [],
      lastUpdated: null,
    };

    // Called when a new Agent instance starts or wakes from hibernation
    async onStart() {
      console.log("Agent started with state:", this.state);
    }

    // Handle HTTP requests coming to this Agent instance
    // Returns a Response object
    async onRequest(request: Request): Promise<Response> {
      return new Response("Hello from Agent!");
    }

    // Called when a WebSocket connection is established
    // Access the original request via ctx.request for auth etc.
    async onConnect(connection: Connection, ctx: ConnectionContext) {
      // Connections are automatically accepted by the SDK.
      // You can also explicitly close a connection here with connection.close()
      // Access the Request on ctx.request to inspect headers, cookies and the URL
    }

    // Called for each message received on a WebSocket connection
    // Message can be string, ArrayBuffer, or ArrayBufferView
    async onMessage(connection: Connection, message: WSMessage) {
      // Handle incoming messages
      connection.send("Received your message");
    }

    // Handle WebSocket connection errors
    async onError(connection: Connection, error: unknown): Promise<void> {
      console.error(`Connection error:`, error);
    }

    // Handle WebSocket connection close events
    async onClose(
      connection: Connection,
      code: number,
      reason: string,
      wasClean: boolean
    ): Promise<void> {
      console.log(`Connection closed: ${code} - ${reason}`);
    }

    // Called when the Agent's state is updated from any source
    // source can be "server" or a client Connection
    onStateUpdate(state: State, source: "server" | Connection) {
      console.log("State updated:", state, "Source:", source);
    }

    // You can define your own custom methods to be called by requests,
    // WebSocket messages, or scheduled tasks
    async customProcessingMethod(data: any) {
      // Process data, update state, schedule tasks, etc.
      this.setState({ ...this.state, lastUpdated: new Date() });
    }
  }
  ```

* JavaScript

  ```js
  // Basic Agent implementation with custom methods
  import { Agent } from "agents";

  class MyAgent extends Agent {
    initialState = {
      counter: 0,
      lastUpdated: null,
    };

    async onRequest(request) {
      if (request.method === "POST") {
        await this.incrementCounter();
        return new Response(JSON.stringify(this.state), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(this.state), {
        headers: { "Content-Type": "application/json" },
      });
    }

    async incrementCounter() {
      this.setState({
        counter: this.state.counter + 1,
        lastUpdated: new Date(),
      });
    }
  }
  ```

* TypeScript

  ```ts
  // Basic Agent implementation with custom methods
  import { Agent } from "agents";

  interface MyState {
    counter: number;
    lastUpdated: Date | null;
  }

  class MyAgent extends Agent<Env, MyState> {
    initialState = {
      counter: 0,
      lastUpdated: null,
    };

    async onRequest(request: Request) {
      if (request.method === "POST") {
        await this.incrementCounter();
        return new Response(JSON.stringify(this.state), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(this.state), {
        headers: { "Content-Type": "application/json" },
      });
    }

    async incrementCounter() {
      this.setState({
        counter: this.state.counter + 1,
        lastUpdated: new Date(),
      });
    }
  }
  ```

### WebSocket API

The WebSocket API allows you to accept and manage WebSocket connections made to an Agent.

#### Connection

Represents a WebSocket connection to an Agent.

```ts
// WebSocket connection interface
interface Connection<State = unknown> {
  // Unique ID for this connection
  id: string;

  // Client-specific state attached to this connection
  state: State;

  // Update the connection's state
  setState(state: State): void;

  // Accept an incoming WebSocket connection
  accept(): void;

  // Close the WebSocket connection with optional code and reason
  close(code?: number, reason?: string): void;

  // Send a message to the client
  // Can be string, ArrayBuffer, or ArrayBufferView
  send(message: string | ArrayBuffer | ArrayBufferView): void;
}
```

- JavaScript

  ```js
  // Example of handling WebSocket messages
  export class YourAgent extends Agent {
    async onMessage(connection, message) {
      if (typeof message === "string") {
        try {
          // Parse JSON message
          const data = JSON.parse(message);

          if (data.type === "update") {
            // Update connection-specific state
            connection.setState({
              ...connection.state,
              lastActive: Date.now(),
            });

            // Update global Agent state
            this.setState({
              ...this.state,
              connections: this.state.connections + 1,
            });

            // Send response back to this client only
            connection.send(
              JSON.stringify({
                type: "updated",
                status: "success",
              })
            );
          }
        } catch (e) {
          connection.send(JSON.stringify({ error: "Invalid message format" }));
        }
      }
    }
  }
  ```

- TypeScript

  ```ts
  // Example of handling WebSocket messages
  export class YourAgent extends Agent {
    async onMessage(connection: Connection, message: WSMessage) {
      if (typeof message === "string") {
        try {
          // Parse JSON message
          const data = JSON.parse(message);

          if (data.type === "update") {
            // Update connection-specific state
            connection.setState({
              ...connection.state,
              lastActive: Date.now(),
            });

            // Update global Agent state
            this.setState({
              ...this.state,
              connections: this.state.connections + 1,
            });

            // Send response back to this client only
            connection.send(
              JSON.stringify({
                type: "updated",
                status: "success",
              })
            );
          }
        } catch (e) {
          connection.send(JSON.stringify({ error: "Invalid message format" }));
        }
      }
    }
  }
  ```

#### WSMessage

Types of messages that can be received from a WebSocket.

```ts
// Types of messages that can be received from WebSockets
type WSMessage = string | ArrayBuffer | ArrayBufferView;
```

#### ConnectionContext

Context information for a WebSocket connection.

```ts
// Context available during WebSocket connection
interface ConnectionContext {
  // The original HTTP request that initiated the WebSocket connection
  request: Request;
}
```

### State synchronization API

Note

To learn more about how to manage state within an Agent, refer to the documentation on [managing and syncing state](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/).

#### State

Methods and types for managing Agent state.

```ts
// State management in the Agent class
class Agent<Env, State = unknown> {
  // Initial state that will be set if no state exists yet
  initialState: State = {} as unknown as State;

  // Current state of the Agent, persisted across restarts
  get state(): State;

  // Update the Agent's state
  // Persists to storage and notifies all connected clients
  setState(state: State): void;

  // Called when state is updated from any source
  // Override to react to state changes
  onStateUpdate(state: State, source: "server" | Connection): void;
}
```

- JavaScript

  ```js
  // Example of state management in an Agent

  // Inside your Agent class
  export class YourAgent extends Agent {
    async addMessage(sender, text) {
      // Update state with new message
      this.setState({
        ...this.state,
        messages: [
          ...this.state.messages,
          { sender, text, timestamp: Date.now() },
        ].slice(-this.state.settings.maxHistoryLength), // Maintain max history
      });

      // The onStateUpdate method will automatically be called
      // and all connected clients will receive the update
    }

    // Override onStateUpdate to add custom behavior when state changes
    onStateUpdate(state, source) {
      console.log(
        `State updated by ${source === "server" ? "server" : "client"}`
      );

      // You could trigger additional actions based on state changes
      if (state.messages.length > 0) {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage.text.includes("@everyone")) {
          this.notifyAllParticipants(lastMessage);
        }
      }
    }
  }
  ```

- TypeScript

  ```ts
  // Example of state management in an Agent
  interface ChatState {
    messages: Array<{ sender: string; text: string; timestamp: number }>;
    participants: string[];
    settings: {
      allowAnonymous: boolean;
      maxHistoryLength: number;
    };
  }

  interface Env {
    // Your bindings and environment variables
  }

  // Inside your Agent class
  export class YourAgent extends Agent<Env, ChatState> {
    async addMessage(sender: string, text: string) {
      // Update state with new message
      this.setState({
        ...this.state,
        messages: [
          ...this.state.messages,
          { sender, text, timestamp: Date.now() },
        ].slice(-this.state.settings.maxHistoryLength), // Maintain max history
      });

      // The onStateUpdate method will automatically be called
      // and all connected clients will receive the update
    }

    // Override onStateUpdate to add custom behavior when state changes
    onStateUpdate(state: ChatState, source: "server" | Connection) {
      console.log(
        `State updated by ${source === "server" ? "server" : "client"}`
      );

      // You could trigger additional actions based on state changes
      if (state.messages.length > 0) {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage.text.includes("@everyone")) {
          this.notifyAllParticipants(lastMessage);
        }
      }
    }
  }
  ```

### Scheduling API

#### Scheduling tasks

Schedule tasks to run at a specified time in the future.

```ts
// Scheduling API for running tasks in the future
class Agent<Env, State = unknown> {
  // Schedule a task to run in the future
  // when: seconds from now, specific Date, or cron expression
  // callback: method name on the Agent to call
  // payload: data to pass to the callback
  // Returns a Schedule object with the task ID
  async schedule<T = any>(
    when: Date | string | number,
    callback: keyof this,
    payload?: T
  ): Promise<Schedule<T>>;

  // Get a scheduled task by ID
  // Returns undefined if the task doesn't exist
  async getSchedule<T = any>(id: string): Promise<Schedule<T> | undefined>;

  // Get all scheduled tasks matching the criteria
  // Returns an array of Schedule objects
  getSchedules<T = any>(criteria?: {
    description?: string;
    id?: string;
    type?: "scheduled" | "delayed" | "cron";
    timeRange?: { start?: Date; end?: Date };
  }): Schedule<T>[];

  // Cancel a scheduled task by ID
  // Returns true if the task was cancelled, false otherwise
  async cancelSchedule(id: string): Promise<boolean>;
}
```

- JavaScript

  ```js
  // Example of scheduling in an Agent

  export class YourAgent extends Agent {
    // Schedule a one-time reminder in 2 hours
    async scheduleReminder(userId, message) {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const schedule = await this.schedule(twoHoursFromNow, "sendReminder", {
        userId,
        message,
        channel: "email",
      });

      console.log(`Scheduled reminder with ID: ${schedule.id}`);
      return schedule.id;
    }

    // Schedule a recurring daily task using cron
    async scheduleDailyReport() {
      // Run at 08:00 AM every day
      const schedule = await this.schedule(
        "0 8 * * *", // Cron expression: minute hour day month weekday
        "generateDailyReport",
        { reportType: "daily-summary" }
      );

      console.log(`Scheduled daily report with ID: ${schedule.id}`);
      return schedule.id;
    }

    // Method that will be called when the scheduled task runs
    async sendReminder(data) {
      console.log(`Sending reminder to ${data.userId}: ${data.message}`);
      // Add code to send the actual notification
    }
  }
  ```

- TypeScript

  ```ts
  // Example of scheduling in an Agent
  interface ReminderData {
    userId: string;
    message: string;
    channel: string;
  }

  export class YourAgent extends Agent {
    // Schedule a one-time reminder in 2 hours
    async scheduleReminder(userId: string, message: string) {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const schedule = await this.schedule<ReminderData>(
        twoHoursFromNow,
        "sendReminder",
        { userId, message, channel: "email" }
      );

      console.log(`Scheduled reminder with ID: ${schedule.id}`);
      return schedule.id;
    }

    // Schedule a recurring daily task using cron
    async scheduleDailyReport() {
      // Run at 08:00 AM every day
      const schedule = await this.schedule(
        "0 8 * * *", // Cron expression: minute hour day month weekday
        "generateDailyReport",
        { reportType: "daily-summary" }
      );

      console.log(`Scheduled daily report with ID: ${schedule.id}`);
      return schedule.id;
    }

    // Method that will be called when the scheduled task runs
    async sendReminder(data: ReminderData) {
      console.log(`Sending reminder to ${data.userId}: ${data.message}`);
      // Add code to send the actual notification
    }
  }
  ```

#### Schedule object

Represents a scheduled task.

```ts
// Represents a scheduled task
type Schedule<T = any> = {
  // Unique identifier for the schedule
  id: string;
  // Name of the method to be called
  callback: string;
  // Data to be passed to the callback
  payload: T;
} & (
  | {
      // One-time execution at a specific time
      type: "scheduled";
      // Timestamp when the task should execute
      time: number;
    }
  | {
      // Delayed execution after a certain time
      type: "delayed";
      // Timestamp when the task should execute
      time: number;
      // Number of seconds to delay execution
      delayInSeconds: number;
    }
  | {
      // Recurring execution based on cron expression
      type: "cron";
      // Timestamp for the next execution
      time: number;
      // Cron expression defining the schedule
      cron: string;
    }
);
```

- JavaScript

  ```js
  export class YourAgent extends Agent {
    // Example of managing scheduled tasks
    async viewAndManageSchedules() {
      // Get all scheduled tasks
      const allSchedules = this.getSchedules();
      console.log(`Total scheduled tasks: ${allSchedules.length}`);

      // Get tasks scheduled for a specific time range
      const upcomingSchedules = this.getSchedules({
        timeRange: {
          start: new Date(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
      });

      // Get a specific task by ID
      const taskId = "task-123";
      const specificTask = await this.getSchedule(taskId);

      if (specificTask) {
        console.log(
          `Found task: ${specificTask.callback} at ${new Date(specificTask.time)}`
        );

        // Cancel a scheduled task
        const cancelled = await this.cancelSchedule(taskId);
        console.log(`Task cancelled: ${cancelled}`);
      }
    }
  }
  ```

- TypeScript

  ```ts
  export class YourAgent extends Agent {
    // Example of managing scheduled tasks
    async viewAndManageSchedules() {
      // Get all scheduled tasks
      const allSchedules = this.getSchedules();
      console.log(`Total scheduled tasks: ${allSchedules.length}`);

      // Get tasks scheduled for a specific time range
      const upcomingSchedules = this.getSchedules({
        timeRange: {
          start: new Date(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
      });

      // Get a specific task by ID
      const taskId = "task-123";
      const specificTask = await this.getSchedule(taskId);

      if (specificTask) {
        console.log(
          `Found task: ${specificTask.callback} at ${new Date(specificTask.time)}`
        );

        // Cancel a scheduled task
        const cancelled = await this.cancelSchedule(taskId);
        console.log(`Task cancelled: ${cancelled}`);
      }
    }
  }
  ```

### SQL API

Each Agent instance has an embedded SQLite database that can be accessed using the `this.sql` method within any method on your `Agent` class.

#### SQL queries

Execute SQL queries against the Agent's built-in SQLite database using the `this.sql` method within any method on your `Agent` class.

```ts
// SQL query API for the Agent's embedded database
class Agent<Env, State = unknown> {
  // Execute a SQL query with tagged template literals
  // Returns an array of rows matching the query
  sql<T = Record<string, string | number | boolean | null>>(
    strings: TemplateStringsArray,
    ...values: (string | number | boolean | null)[]
  ): T[];
}
```

- JavaScript

  ```js
  // Example of using SQL in an Agent

  export class YourAgent extends Agent {
    async setupDatabase() {
      // Create a table if it doesn't exist
      this.sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at INTEGER
        )
      `;
    }

    async createUser(id, name, email) {
      // Insert a new user
      this.sql`
        INSERT INTO users (id, name, email, created_at)
        VALUES (${id}, ${name}, ${email}, ${Date.now()})
      `;
    }

    async getUserById(id) {
      // Query a user by ID
      const users = this.sql`
        SELECT * FROM users WHERE id = ${id}
      `;

      return users.length ? users[0] : null;
    }

    async searchUsers(term) {
      // Search users with a wildcard
      return this.sql`
        SELECT * FROM users
        WHERE name LIKE ${"%" + term + "%"} OR email LIKE ${"%" + term + "%"}
        ORDER BY created_at DESC
      `;
    }
  }
  ```

- TypeScript

  ```ts
  // Example of using SQL in an Agent
  interface User {
    id: string;
    name: string;
    email: string;
    created_at: number;
  }

  export class YourAgent extends Agent {
    async setupDatabase() {
      // Create a table if it doesn't exist
      this.sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at INTEGER
        )
      `;
    }

    async createUser(id: string, name: string, email: string) {
      // Insert a new user
      this.sql`
        INSERT INTO users (id, name, email, created_at)
        VALUES (${id}, ${name}, ${email}, ${Date.now()})
      `;
    }

    async getUserById(id: string): Promise<User | null> {
      // Query a user by ID
      const users = this.sql<User>`
        SELECT * FROM users WHERE id = ${id}
      `;

      return users.length ? users[0] : null;
    }

    async searchUsers(term: string): Promise<User[]> {
      // Search users with a wildcard
      return this.sql<User>`
        SELECT * FROM users
        WHERE name LIKE ${"%" + term + "%"} OR email LIKE ${"%" + term + "%"}
        ORDER BY created_at DESC
      `;
    }
  }
  ```

Note

Visit the [state management API documentation](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/) within the Agents SDK, including the native `state` APIs and the built-in `this.sql` API for storing and querying data within your Agents.

### Client API

The Agents SDK provides a set of client APIs for interacting with Agents from client-side JavaScript code, including:

- React hooks, including `useAgent` and `useAgentChat`, for connecting to Agents from client applications.
- Client-side [state syncing](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/) that allows you to subscribe to state updates between the Agent and any connected client(s) when calling `this.setState` within your Agent's code.
- The ability to call remote methods (Remote Procedure Calls; RPC) on the Agent from client-side JavaScript code using the `@callable` method decorator.

#### AgentClient

Client for connecting to an Agent from the browser.

```ts
import { AgentClient } from "agents/client";

// Options for creating an AgentClient
type AgentClientOptions = Omit<PartySocketOptions, "party" | "room"> & {
  // Name of the agent to connect to (class name in kebab-case)
  agent: string;
  // Name of the specific Agent instance (optional, defaults to "default")
  name?: string;
  // Other WebSocket options like host, protocol, etc.
};

// WebSocket client for connecting to an Agent
class AgentClient extends PartySocket {
  static fetch(opts: PartyFetchOptions): Promise<Response>;
  constructor(opts: AgentClientOptions);
}
```

- JavaScript

  ```js
  // Example of using AgentClient in the browser
  import { AgentClient } from "agents/client";

  // Connect to an Agent instance
  const client = new AgentClient({
    agent: "chat-agent", // Name of your Agent class in kebab-case
    name: "support-room-123", // Specific instance name
    host: window.location.host, // Using same host
  });

  client.onopen = () => {
    console.log("Connected to agent");
    // Send an initial message
    client.send(JSON.stringify({ type: "join", user: "user123" }));
  };

  client.onmessage = (event) => {
    // Handle incoming messages
    const data = JSON.parse(event.data);
    console.log("Received:", data);

    if (data.type === "state_update") {
      // Update local UI with new state
      updateUI(data.state);
    }
  };

  client.onclose = () => console.log("Disconnected from agent");

  // Send messages to the Agent
  function sendMessage(text) {
    client.send(
      JSON.stringify({
        type: "message",
        text,
        timestamp: Date.now(),
      })
    );
  }
  ```

- TypeScript

  ```ts
  // Example of using AgentClient in the browser
  import { AgentClient } from "agents/client";

  // Connect to an Agent instance
  const client = new AgentClient({
    agent: "chat-agent", // Name of your Agent class in kebab-case
    name: "support-room-123", // Specific instance name
    host: window.location.host, // Using same host
  });

  client.onopen = () => {
    console.log("Connected to agent");
    // Send an initial message
    client.send(JSON.stringify({ type: "join", user: "user123" }));
  };

  client.onmessage = (event) => {
    // Handle incoming messages
    const data = JSON.parse(event.data);
    console.log("Received:", data);

    if (data.type === "state_update") {
      // Update local UI with new state
      updateUI(data.state);
    }
  };

  client.onclose = () => console.log("Disconnected from agent");

  // Send messages to the Agent
  function sendMessage(text) {
    client.send(
      JSON.stringify({
        type: "message",
        text,
        timestamp: Date.now(),
      })
    );
  }
  ```

#### agentFetch

Make an HTTP request to an Agent.

```ts
import { agentFetch } from "agents/client";

// Options for the agentFetch function
type AgentClientFetchOptions = Omit<PartyFetchOptions, "party" | "room"> & {
  // Name of the agent to connect to
  agent: string;
  // Name of the specific Agent instance (optional)
  name?: string;
};

// Make an HTTP request to an Agent
function agentFetch(
  opts: AgentClientFetchOptions,
  init?: RequestInit
): Promise<Response>;
```

- JavaScript

  ```js
  // Example of using agentFetch in the browser
  import { agentFetch } from "agents/client";

  // Function to get data from an Agent
  async function fetchAgentData() {
    try {
      const response = await agentFetch(
        {
          agent: "task-manager",
          name: "user-123-tasks",
        },
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch from agent:", error);
    }
  }
  ```

- TypeScript

  ```ts
  // Example of using agentFetch in the browser
  import { agentFetch } from "agents/client";

  // Function to get data from an Agent
  async function fetchAgentData() {
    try {
      const response = await agentFetch(
        {
          agent: "task-manager",
          name: "user-123-tasks",
        },
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch from agent:", error);
    }
  }
  ```

### React API

The Agents SDK provides a React API for simplifying connection and routing to Agents from front-end frameworks, including React Router (Remix), Next.js, and Astro.

#### useAgent

React hook for connecting to an Agent.

```ts
import { useAgent } from "agents/react";

// Options for the useAgent hook
type UseAgentOptions<State = unknown> = Omit<
  Parameters<typeof usePartySocket>[0],
  "party" | "room"
> & {
  // Name of the agent to connect to
  agent: string;
  // Name of the specific Agent instance (optional)
  name?: string;
  // Called when the Agent's state is updated
  onStateUpdate?: (state: State, source: "server" | "client") => void;
};

// React hook for connecting to an Agent
// Returns a WebSocket connection with setState method
function useAgent<State = unknown>(
  options: UseAgentOptions<State>
): PartySocket & {
  // Update the Agent's state
  setState: (state: State) => void;
};
```

### Chat Agent

The Agents SDK exposes an `AIChatAgent` class that extends the `Agent` class and exposes an `onChatMessage` method that simplifies building interactive chat agents.

You can combine this with the `useAgentChat` React hook from the `agents/ai-react` package to manage chat state and messages between a user and your Agent(s).

#### AIChatAgent

Extension of the `Agent` class with built-in chat capabilities.

```ts
import { AIChatAgent } from "agents/ai-chat-agent";
import { Message, StreamTextOnFinishCallback, ToolSet } from "ai";

// Base class for chat-specific agents
class AIChatAgent<Env = unknown, State = unknown> extends Agent<Env, State> {
  // Array of chat messages for the current conversation
  messages: Message[];

  // Handle incoming chat messages and generate a response
  // onFinish is called when the response is complete
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>
  ): Promise<Response | undefined>;

  // Persist messages within the Agent's local storage.
  async saveMessages(messages: Message[]): Promise<void>;
}
```

- JavaScript

  ```js
  // Example of extending AIChatAgent
  import { AIChatAgent } from "agents/ai-chat-agent";
  import { Message } from "ai";

  class CustomerSupportAgent extends AIChatAgent {
    // Override the onChatMessage method to customize behavior
    async onChatMessage(onFinish) {
      // Access the AI models using environment bindings
      const { openai } = this.env.AI;

      // Get the current conversation history
      const chatHistory = this.messages;

      // Generate a system prompt based on knowledge base
      const systemPrompt = await this.generateSystemPrompt();

      // Generate a response stream
      const stream = await openai.chat({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
        stream: true,
      });

      // Return the streaming response
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    // Helper method to generate a system prompt
    async generateSystemPrompt() {
      // Query knowledge base or use static prompt
      return `You are a helpful customer support agent.
              Respond to customer inquiries based on the following guidelines:
              - Be friendly and professional
              - If you don't know an answer, say so
              - Current company policies: ...`;
    }
  }
  ```

- TypeScript

  ```ts
  // Example of extending AIChatAgent
  import { AIChatAgent } from "agents/ai-chat-agent";
  import { Message } from "ai";

  interface Env {
    AI: any; // Your AI binding
  }

  class CustomerSupportAgent extends AIChatAgent<Env> {
    // Override the onChatMessage method to customize behavior
    async onChatMessage(onFinish) {
      // Access the AI models using environment bindings
      const { openai } = this.env.AI;

      // Get the current conversation history
      const chatHistory = this.messages;

      // Generate a system prompt based on knowledge base
      const systemPrompt = await this.generateSystemPrompt();

      // Generate a response stream
      const stream = await openai.chat({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
        stream: true,
      });

      // Return the streaming response
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    // Helper method to generate a system prompt
    async generateSystemPrompt() {
      // Query knowledge base or use static prompt
      return `You are a helpful customer support agent.
              Respond to customer inquiries based on the following guidelines:
              - Be friendly and professional
              - If you don't know an answer, say so
              - Current company policies: ...`;
    }
  }
  ```

### Chat Agent React API

#### useAgentChat

React hook for building AI chat interfaces using an Agent.

```ts
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import type { Message } from "ai";

// Options for the useAgentChat hook
type UseAgentChatOptions = Omit<
  Parameters<typeof useChat>[0] & {
    // Agent connection from useAgent
    agent: ReturnType<typeof useAgent>;
  },
  "fetch"
>;

// React hook for building AI chat interfaces using an Agent
function useAgentChat(options: UseAgentChatOptions): {
  // Current chat messages
  messages: Message[];
  // Set messages and synchronize with the Agent
  setMessages: (messages: Message[]) => void;
  // Clear chat history on both client and Agent
  clearHistory: () => void;
  // Append a new message to the conversation
  append: (
    message: Message,
    chatRequestOptions?: any
  ) => Promise<string | null | undefined>;
  // Reload the last user message
  reload: (chatRequestOptions?: any) => Promise<string | null | undefined>;
  // Stop the AI response generation
  stop: () => void;
  // Current input text
  input: string;
  // Set the input text
  setInput: React.Dispatch<React.SetStateAction<string>>;
  // Handle input changes
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  // Submit the current input
  handleSubmit: (
    event?: { preventDefault?: () => void },
    chatRequestOptions?: any
  ) => void;
  // Additional metadata
  metadata?: Object;
  // Whether a response is currently being generated
  isLoading: boolean;
  // Current status of the chat
  status: "submitted" | "streaming" | "ready" | "error";
  // Tool data from the AI response
  data?: any[];
  // Set tool data
  setData: (
    data: any[] | undefined | ((data: any[] | undefined) => any[] | undefined)
  ) => void;
  // Unique ID for the chat
  id: string;
  // Add a tool result for a specific tool call
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: any;
  }) => void;
  // Current error if any
  error: Error | undefined;
};
```

- JavaScript

  ```js
  // Example of using useAgentChat in a React component
  import { useAgentChat } from "agents/ai-react";
  import { useAgent } from "agents/react";
  import { useState } from "react";

  function ChatInterface() {
    // Connect to the chat agent
    const agentConnection = useAgent({
      agent: "customer-support",
      name: "session-12345",
    });

    // Use the useAgentChat hook with the agent connection
    const {
      messages,
      input,
      handleInputChange,
      handleSubmit,
      isLoading,
      error,
      clearHistory,
    } = useAgentChat({
      agent: agentConnection,
      initialMessages: [
        { role: "system", content: "You're chatting with our AI assistant." },
        { role: "assistant", content: "Hello! How can I help you today?" },
      ],
    });

    return (
      <div className="chat-container">
        <div className="message-history">
          {messages.map((message, i) => (
            <div key={i} className={`message ${message.role}`}>
              {message.role === "user" ? "👤" : "🤖"} {message.content}
            </div>
          ))}

          {isLoading && <div className="loading">AI is typing...</div>}
          {error && <div className="error">Error: {error.message}</div>}
        </div>

        <form onSubmit={handleSubmit} className="message-input">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </button>
          <button type="button" onClick={clearHistory}>
            Clear Chat
          </button>
        </form>
      </div>
    );
  }
  ```

- TypeScript

  ```ts
  // Example of using useAgentChat in a React component
  import { useAgentChat } from "agents/ai-react";
  import { useAgent } from "agents/react";
  import { useState } from "react";


  function ChatInterface() {
    // Connect to the chat agent
    const agentConnection = useAgent({
      agent: "customer-support",
      name: "session-12345"
    });


    // Use the useAgentChat hook with the agent connection
    const {
      messages,
      input,
      handleInputChange,
      handleSubmit,
      isLoading,
      error,
      clearHistory
    } = useAgentChat({
      agent: agentConnection,
      initialMessages: [
        { role: "system", content: "You're chatting with our AI assistant." },
        { role: "assistant", content: "Hello! How can I help you today?" }
      ]
    });


    return (
      <div className="chat-container">
        <div className="message-history">
          {messages.map((message, i) => (
            <div key={i} className={`message ${message.role}`}>
              {message.role === 'user' ? '👤' : '🤖'} {message.content}
            </div>
          ))}


          {isLoading && <div className="loading">AI is typing...</div>}
          {error && <div className="error">Error: {error.message}</div>}
        </div>


        <form onSubmit={handleSubmit} className="message-input">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </button>
          <button type="button" onClick={clearHistory}>
            Clear Chat
          </button>
        </form>
      </div>
    );
  }
  ```

### Next steps

- [Build a chat Agent](https://developers.cloudflare.com/agents/getting-started/build-a-chat-agent/) using the Agents SDK and deploy it to Workers.
- Learn more [using WebSockets](https://developers.cloudflare.com/agents/api-reference/websockets/) to build interactive Agents and stream data back from your Agent.
- [Orchestrate asynchronous workflows](https://developers.cloudflare.com/agents/api-reference/run-workflows) from your Agent by combining the Agents SDK and [Workflows](https://developers.cloudflare.com/workflows).
