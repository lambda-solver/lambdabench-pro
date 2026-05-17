import { ConfigProvider } from "effect";
import type { Context } from "effect";

type ServiceShape<T> = T extends Context.Service<unknown, infer Shape> ? Shape : never;
export const serviceShape = <T extends Context.Service<unknown, unknown>>(
  shape: unknown,
) => shape as ServiceShape<T>;

export const configLayer = (values: Record<string, unknown>) =>
  ConfigProvider.layer(ConfigProvider.fromUnknown(values));
