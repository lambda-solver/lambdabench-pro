import { Schema } from "effect";

// ============================================================================
// Wire Protocol: ChatStreamPart
// ============================================================================

export const ChatStreamPart = Schema.Union([
  // Text generation
  Schema.TaggedStruct("text-delta", {
    delta: Schema.String,
  }),
  Schema.TaggedStruct("text-complete", {}),

  // Agent transparency
  Schema.TaggedStruct("thinking", {
    message: Schema.String,
  }),

  // Iteration tracking
  Schema.TaggedStruct("iteration-start", {
    iteration: Schema.Number,
  }),
  Schema.TaggedStruct("iteration-end", {
    iteration: Schema.Number,
  }),

  // Tool call lifecycle
  Schema.TaggedStruct("tool-call-start", {
    description: Schema.optional(Schema.String),
    id: Schema.String,
    name: Schema.String,
  }),
  Schema.TaggedStruct("tool-call-delta", {
    argumentsDelta: Schema.String,
    id: Schema.String,
  }),
  Schema.TaggedStruct("tool-call-complete", {
    arguments: Schema.Unknown,
    id: Schema.String,
    name: Schema.String,
  }),
  Schema.TaggedStruct("tool-execution-start", {
    id: Schema.String,
    name: Schema.String,
  }),
  Schema.TaggedStruct("tool-execution-complete", {
    id: Schema.String,
    name: Schema.String,
    result: Schema.String,
    success: Schema.Boolean,
  }),

  // Completion
  Schema.TaggedStruct("finish", {
    finishReason: Schema.String,
    usage: Schema.optional(
      Schema.Struct({
        completionTokens: Schema.Number,
        promptTokens: Schema.Number,
        totalTokens: Schema.Number,
      }),
    ),
  }),

  // Error
  Schema.TaggedStruct("error", {
    message: Schema.String,
    recoverable: Schema.Boolean,
  }),
]);

export type ChatStreamPart = Schema.Schema.Type<typeof ChatStreamPart>;

// ============================================================================
// Chat Message (sent from client to server)
// ============================================================================

export const ChatMessage = Schema.Struct({
  content: Schema.String,
  role: Schema.Literals(["user", "assistant", "system"]),
});

export type ChatMessage = Schema.Schema.Type<typeof ChatMessage>;

// ============================================================================
// Client-Side State Machine: ChatResponse
// ============================================================================

export const ToolCall = Schema.Struct({
  arguments: Schema.Unknown,
  argumentsText: Schema.String,
  id: Schema.String,
  name: Schema.String,
  result: Schema.optional(Schema.String),
  status: Schema.Literals(["proposed", "executing", "complete", "failed"]),
  success: Schema.optional(Schema.Boolean),
});

export type ToolCall = Schema.Schema.Type<typeof ToolCall>;

export const MessageSegment = Schema.Union([
  Schema.TaggedStruct("text", {
    content: Schema.String,
    isComplete: Schema.Boolean,
  }),
  Schema.TaggedStruct("tool-call", {
    tool: ToolCall,
  }),
]);

export type MessageSegment = Schema.Schema.Type<typeof MessageSegment>;

export const UsageMetadata = Schema.Struct({
  completionTokens: Schema.Number,
  promptTokens: Schema.Number,
  totalTokens: Schema.Number,
});

export type UsageMetadata = Schema.Schema.Type<typeof UsageMetadata>;

export const ErrorMetadata = Schema.Struct({
  message: Schema.String,
  recoverable: Schema.Boolean,
});

export type ErrorMetadata = Schema.Schema.Type<typeof ErrorMetadata>;

export const ChatResponse = Schema.Union([
  Schema.TaggedStruct("initial", {}),
  Schema.TaggedStruct("streaming", {
    currentIteration: Schema.NullOr(Schema.Number),
    segments: Schema.Array(MessageSegment),
    thinking: Schema.optional(Schema.String),
  }),
  Schema.TaggedStruct("complete", {
    finishReason: Schema.String,
    segments: Schema.Array(MessageSegment),
    usage: Schema.optional(UsageMetadata),
  }),
  Schema.TaggedStruct("error", {
    error: ErrorMetadata,
    segments: Schema.Array(MessageSegment),
  }),
]);

export type ChatResponse = Schema.Schema.Type<typeof ChatResponse>;
