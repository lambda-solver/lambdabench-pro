import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

export const ClientId = Schema.String.pipe(Schema.brand("ClientId"));

export const ClientStatus = Schema.Literals(["online", "away", "busy"]);
export type ClientStatus = Schema.Schema.Type<typeof ClientStatus>;

export const ClientInfo = Schema.Struct({
  clientId: ClientId,
  connectedAt: Schema.Number,
  status: ClientStatus,
});
export type ClientInfo = Schema.Schema.Type<typeof ClientInfo>;

export const WebSocketEvent = Schema.Union([
  // Initial connection acknowledgment with assigned ClientId
  Schema.TaggedStruct("connected", {
    clientId: ClientId,
    connectedAt: Schema.Number,
  }),
  // Broadcast when a user joins
  Schema.TaggedStruct("user_joined", {
    client: ClientInfo,
  }),
  // Broadcast when a user's status changes
  Schema.TaggedStruct("status_changed", {
    changedAt: Schema.Number,
    clientId: ClientId,
    status: ClientStatus,
  }),
  // Broadcast when a user disconnects
  Schema.TaggedStruct("user_left", {
    clientId: ClientId,
    disconnectedAt: Schema.Number,
  }),
]);
export type WebSocketEvent = Schema.Schema.Type<typeof WebSocketEvent>;

export class WebSocketRpc extends RpcGroup.make(
  // Subscribe to presence events - returns a stream of events
  Rpc.make("subscribe", {
    stream: true, // This makes it a streaming RPC over WebSocket
    success: WebSocketEvent,
  }),
  // Set your presence status (requires clientId from subscribe)
  Rpc.make("setStatus", {
    payload: {
      clientId: ClientId,
      status: ClientStatus,
    },
    success: Schema.Struct({
      success: Schema.Boolean,
    }),
  }),
  // Get current list of connected clients
  Rpc.make("getPresence", {
    success: Schema.Struct({
      clients: Schema.Array(ClientInfo),
    }),
  }),
) {}
