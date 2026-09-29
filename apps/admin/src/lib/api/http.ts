import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorisedError,
  ValidationError,
  type AdminApi,
  type PublicationIssue,
} from "@Stratford-city-motorcars-Ltd/core";

/**
 * ============================================================================
 * INTEGRATION POINT — the real API.
 * ============================================================================
 *
 * Implements `AdminApi` over HTTP. Selected with NEXT_PUBLIC_ADMIN_DATA=api.
 * The endpoints, permissions and error shapes are listed in
 * docs/STRATFORD_ADMIN_CONTRACT.md; this file is the client side of that
 * document and should change only if the document does.
 *
 * The session is a cookie on the API's origin, so every request is sent with
 * credentials. The API must allow this origin with credentials (CORS).
 */

type ErrorBody = {
  error?: string;
  fields?: Record<string, string>;
  issues?: PublicationIssue[];
  capability?: string;
  currentUpdatedAt?: string;
};

/**
 * How long to wait for an answer. The API sleeps when idle and takes about a
 * minute to wake, so:
 *  - a read gives up sooner, because React Query asks again and every attempt
 *    keeps the server waking;
 *  - the session check is usually the request that wakes it, and the whole
 *    admin waits on it, so it gets the full minute;
 *  - a write is never repeated for you, and giving up on one leaves its outcome
 *    unknown, so it waits long enough to outlast a wake-up.
 */
const READ_TIMEOUT = 20_000;
const WAKE_TIMEOUT = 60_000;
const WRITE_TIMEOUT = 60_000;
/**
 * A photograph: no progress for this long while sending means the connection
 * has stalled. Once it is sent the API may queue it behind others, and a large
 * HEIC takes about a minute to convert on the small server.
 */
const UPLOAD_STALL_TIMEOUT = 60_000;
const UPLOAD_PROCESSING_TIMEOUT = 5 * 60_000;

/** When there is no telling whether a write was carried out, "nothing was changed" could be untrue. */
const NO_ANSWER_WRITE = "The server did not answer, so this may or may not have gone through. Check before trying again.";
const NO_ANSWER_READ = "The server did not answer in time. Try again in a moment.";
const noAnswer = (write: boolean) => (write ? NO_ANSWER_WRITE : NO_ANSWER_READ);
const NO_ANSWER_UPLOAD = "The server did not answer, so this photograph may or may not have been added. Save any changes and reload the page to check before trying again.";

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function toError(response: Response, write: boolean): Promise<Error> {
  const body = ((await response.json().catch(() => null)) ?? {}) as ErrorBody;
  switch (response.status) {
    case 401:
      return new UnauthorisedError(body.error);
    case 403:
      return new ForbiddenError(body.error, body.capability);
    case 404:
      return new NotFoundError(body.error);
    case 409:
      return new ConflictError(body.error, body.currentUpdatedAt);
    case 422:
      return new ValidationError(body.fields, body.error, body.issues);
    default:
      // The API's own words when it sent some — including a 503 when it is too
      // busy for another photograph. Without them the answer came from
      // something in between, such as a proxy giving up on a sleeping server,
      // and nobody can say whether the request was carried out.
      if (body.error) return new Error(body.error);
      return new Error(response.status >= 500 ? noAnswer(write) : "Something went wrong on the server. Nothing was changed.");
  }
}

/**
 * The caller's signal, if any, plus a time limit. By hand rather than with
 * `AbortSignal.any`, which older iPhones in the showroom may not have.
 */
function limitTime(ms: number, outer?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const forward = () => controller.abort(outer?.reason);
  if (outer?.aborted) forward();
  else outer?.addEventListener("abort", forward, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    done: () => {
      clearTimeout(timer);
      outer?.removeEventListener("abort", forward);
    },
  };
}

type RequestOptions = { signal?: AbortSignal; timeout?: number };

export function createHttpApi(origin: string): AdminApi {
  const base = `${origin.replace(/\/+$/, "")}/api/admin`;

  async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const write = method !== "GET";
    const limit = limitTime(options.timeout ?? (write ? WRITE_TIMEOUT : READ_TIMEOUT), options.signal);
    try {
      let response: Response;
      try {
        response = await fetch(`${base}${path}`, {
          method,
          credentials: "include",
          headers: body === undefined ? undefined : { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: limit.signal,
        });
      } catch (error) {
        // Abandoned by the caller: passed on untouched, so React Query treats
        // it as a cancellation rather than a failure.
        if (options.signal?.aborted) throw error;
        if (limit.timedOut()) throw new Error(noAnswer(write));
        throw new Error("Could not reach the server. Check your connection and try again.");
      }
      if (!response.ok) throw await toError(response, write);
      if (response.status === 204) return undefined as T;
      try {
        return (await response.json()) as T;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        // A reply cut off or garbled is no more certain than no reply at all.
        throw new Error(noAnswer(write));
      }
    } finally {
      limit.done();
    }
  }

  const get = <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options);
  const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {});
  const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
  const put = <T>(path: string, body: unknown) => request<T>("PUT", path, body);

  return {
    session: {
      get: async (options) => {
        try {
          return await get("/session", { signal: options?.signal, timeout: WAKE_TIMEOUT });
        } catch (error) {
          if (error instanceof UnauthorisedError) return null;
          throw error;
        }
      },
      signIn: (input) => post("/session", input),
      signOut: () => request("DELETE", "/session"),
    },

    overview: {
      get: (options) => get("/overview", options),
    },

    stock: {
      list: (options) => get("/vehicles", options),
      get: (id, options) => get(`/vehicles/${id}`, options),
      create: () => post("/vehicles"),
      save: (record, options) => put(`/vehicles/${record.id}`, { record, ...options }),
      publish: (id, options) => post(`/vehicles/${id}/publish`, options),
      unpublish: (id, options) => post(`/vehicles/${id}/unpublish`, options),
      setFeatured: (id, featured, options) => post(`/vehicles/${id}/featured`, { featured, ...options }),
      reserve: (id, input, options) => post(`/vehicles/${id}/reservation`, { ...input, ...options }),
      releaseReservation: (id, options) => request("DELETE", `/vehicles/${id}/reservation`, options),
      markSold: (id, input, options) => post(`/vehicles/${id}/sale`, { ...input, ...options }),
      undoSale: (id, options) => request("DELETE", `/vehicles/${id}/sale`, options),
      archive: (id, options) => post(`/vehicles/${id}/archive`, options),
      restore: (id, options) => post(`/vehicles/${id}/restore`, options),
      duplicate: (id) => post(`/vehicles/${id}/duplicate`),
      discard: (id, options) => request("DELETE", `/vehicles/${id}`, options),
      uploadImage: (id, file, input, onProgress) =>
        new Promise((resolve, reject) => {
          // XMLHttpRequest, not fetch: fetch cannot report upload progress.
          const form = new FormData();
          form.set("file", file);
          form.set("category", input.category);
          form.set("alt", input.alt);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${base}/vehicles/${id}/media`);
          xhr.withCredentials = true;

          // Restarted by every sign of life, so a slow but moving upload is
          // never cut off; only silence is.
          let timer: ReturnType<typeof setTimeout> | undefined;
          const wait = (ms: number) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              xhr.abort();
              reject(new Error(NO_ANSWER_UPLOAD));
            }, ms);
          };
          const finish = () => clearTimeout(timer);

          xhr.upload.onprogress = (event) => {
            wait(UPLOAD_STALL_TIMEOUT);
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
          };
          // Every byte sent: now the server has to convert it, which takes a while.
          xhr.upload.onload = () => wait(UPLOAD_PROCESSING_TIMEOUT);
          xhr.onerror = () => {
            finish();
            reject(new Error("The upload could not reach the server. Try again."));
          };
          xhr.onload = () => {
            finish();
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error(NO_ANSWER_UPLOAD));
              }
              return;
            }
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              headers: { "content-type": "application/json" },
            });
            toError(response, true).then(reject, () => reject(new Error(NO_ANSWER_UPLOAD)));
          };
          wait(UPLOAD_STALL_TIMEOUT);
          xhr.send(form);
        }),
    },

    enquiries: {
      list: (query, options) => get(`/enquiries${toQuery(query)}`, options),
      counts: (query = {}, options) => get(`/enquiries/counts${toQuery(query)}`, options),
      get: (id, options) => get(`/enquiries/${id}`, options),
      updateStatus: (id, input, options) => patch(`/enquiries/${id}/status`, { ...input, ...options }),
      assign: (id, memberId, options) => patch(`/enquiries/${id}/handler`, { memberId, ...options }),
      addNote: (id, body) => post(`/enquiries/${id}/notes`, { body }),
      updateValuation: (id, input, options) => put(`/enquiries/${id}/valuation`, { ...input, ...options }),
      remove: (id, reason) => request("DELETE", `/enquiries/${id}`, { reason }),
    },

    appointments: {
      list: (query, options) => get(`/appointments${toQuery(query)}`, options),
      create: (input) => post("/appointments", input),
      update: (id, input, options) => put(`/appointments/${id}`, { ...input, ...options }),
    },

    customers: {
      list: (query, options) => get(`/customers${toQuery(query)}`, options),
      get: (id, options) => get(`/customers/${id}`, options),
      update: (id, input, options) => put(`/customers/${id}`, { ...input, ...options }),
      erase: (id) => request("DELETE", `/customers/${id}`),
    },

    team: {
      list: (options) => get("/team", options),
      invite: (input) => post("/team", input),
      update: (id, input) => patch(`/team/${id}`, input),
      resendInvite: (id) => post(`/team/${id}/invitation`),
    },

    settings: {
      get: (options) => get("/settings", options),
      updateBusiness: (input, options) => put("/settings/business", { business: input, ...options }),
    },
  };
}
