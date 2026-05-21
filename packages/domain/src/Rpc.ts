import { ChatMessage, ChatStreamPart } from "./Chat";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { UploadChunk, UploadIngestEvent } from "./Upload";

import { Schema } from "effect";

// Define Event RPC

export const TickEvent = Schema.Union([
  Schema.TaggedStruct("starting", {}),
  Schema.TaggedStruct("tick", {}),
  Schema.TaggedStruct("end", {}),
]);

export class EventRpc extends RpcGroup.make(
  Rpc.make("tick", {
    payload: {
      ticks: Schema.Number,
    },
    stream: true,
    success: TickEvent,
  }),
  Rpc.make("chat", {
    payload: {
      messages: Schema.Array(ChatMessage),
    },
    stream: true,
    success: ChatStreamPart,
  }),
  Rpc.make("uploadChunk", {
    payload: UploadChunk,
    stream: true,
    success: UploadIngestEvent,
  }),
) {}
