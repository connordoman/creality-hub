export async function makeRequest<T>(
  path: string,
  options: RequestInit | undefined = undefined,
  onSuccess?: (statusCode: number, data: T) => Promise<void>,
  onError?: (statusCode: number, error: string) => Promise<void>,
): Promise<T | null> {
  let request: Response | undefined;

  try {
    request = await fetch(path, options);

    if (!request.ok) {
      throw new Error("Bad response code");
    }

    const data = (await request.json()) as T;

    if (onSuccess) await onSuccess(request.status, data);

    return data;
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[makeRequest] ${err}`);
    }

    if (onError)
      await onError(
        request?.status ?? 500,
        request?.statusText ?? "Internal server error",
      );

    return null;
  }
}
