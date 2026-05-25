export type IncomingNodeReq = {
  on?: (ev: string, cb: unknown) => unknown;
  _readableState?: unknown;
  _consumed?: boolean;
  _consuming?: boolean;
  _dumped?: boolean;
  _cachedBody?: string;
} & Record<string, unknown>;

export type MaybeWrappedRequest = {
  request?: unknown;
  runtime?: { node?: { req?: IncomingNodeReq } } | unknown;
  body?: unknown;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
} & Record<string, unknown>;

export type DevReqSnapshot =
  | {
      keys?: string[];
      hasInner?: boolean;
      innerKeys?: string[] | undefined;
    }
  | Record<string, unknown>;

export type LogDevErrorPayload = { error: unknown; req?: DevReqSnapshot | null };
