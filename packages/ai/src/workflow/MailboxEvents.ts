import { Effect, Queue } from "effect";

import type { Cause } from "effect";

import type { ChatStreamPart } from "@repo/domain/Chat";

/**
 * MailboxEvents - Typed event emitter for ChatStreamPart
 * Provides high-level methods for common event patterns to eliminate boilerplate
 */
export const createMailboxEvents = (queue: Queue.Queue<typeof ChatStreamPart.Type, Cause.Done>) =>
  ({
    end: Queue.end(queue),
    error: (message: string, recoverable = false) => Queue.offer(queue, { _tag: "error", message, recoverable }),
    finish: (
      finishReason: string,
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      },
    ) =>
      Queue.offer(queue, {
        _tag: "finish",
        finishReason,
        usage,
      }),
    iterationEnd: (iteration: number) => Queue.offer(queue, { _tag: "iteration-end", iteration }),
    iterationStart: (iteration: number) => Queue.offer(queue, { _tag: "iteration-start", iteration }),
    textComplete: () => Queue.offer(queue, { _tag: "text-complete" }),
    textDelta: (delta: string) => Queue.offer(queue, { _tag: "text-delta", delta }),
    thinking: (message: string) => Queue.offer(queue, { _tag: "thinking", message }),
    toolCallComplete: (
      id: string,
      params: {
        name: string;
        arguments: unknown;
      },
    ) =>
      Queue.offer(queue, {
        _tag: "tool-call-complete",
        arguments: params.arguments,
        id,
        name: params.name,
      }),
    toolCallDelta: (id: string, params: { argumentsDelta: string }) =>
      Queue.offer(queue, {
        _tag: "tool-call-delta",
        argumentsDelta: params.argumentsDelta,
        id,
      }),
    toolCallStart: (
      id: string,
      params: {
        name: string;
        description?: string;
      },
    ) =>
      Queue.offer(queue, {
        _tag: "tool-call-start",
        description: params.description,
        id,
        name: params.name,
      }),
    toolExecution: (
      id: string,
      params: {
        name: string;
        result: string;
        success: boolean;
      },
    ) =>
      Effect.gen(function* () {
        yield* Queue.offer(queue, {
          _tag: "tool-execution-start",
          id,
          name: params.name,
        });

        yield* Queue.offer(queue, {
          _tag: "tool-execution-complete",
          id,
          name: params.name,
          result: params.result,
          success: params.success,
        });
      }),
    toolExecutionComplete: (
      id: string,
      params: {
        name: string;
        result: string;
        success: boolean;
      },
    ) =>
      Queue.offer(queue, {
        _tag: "tool-execution-complete",
        id,
        name: params.name,
        result: params.result,
        success: params.success,
      }),
    toolExecutionStart: (id: string, params: { name: string }) =>
      Queue.offer(queue, {
        _tag: "tool-execution-start",
        id,
        name: params.name,
      }),
  }) as const;
