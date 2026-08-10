import { CrealityWebSocketClient } from "./websocket-client";

type ManagedConnection = {
  host: string;
  client: CrealityWebSocketClient;
  refCount: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

const RELEASE_DELAY_MS = 100;

let managed: ManagedConnection | null = null;

export function acquirePrinterConnection(
  host: string,
): CrealityWebSocketClient {
  if (managed?.releaseTimer) {
    clearTimeout(managed.releaseTimer);
    managed.releaseTimer = null;
  }

  if (managed && managed.host !== host) {
    managed.client.stop();
    managed = null;
  }

  if (!managed) {
    const client = new CrealityWebSocketClient(host);
    client.start();
    managed = { host, client, refCount: 0, releaseTimer: null };
  }

  managed.refCount += 1;
  return managed.client;
}

export function releasePrinterConnection(host: string): void {
  if (!managed || managed.host !== host) {
    return;
  }

  managed.refCount -= 1;

  if (managed.refCount > 0) {
    return;
  }

  managed.refCount = 0;
  managed.releaseTimer = setTimeout(() => {
    if (!managed || managed.refCount > 0) {
      return;
    }

    managed.client.stop();
    managed = null;
  }, RELEASE_DELAY_MS);
}
