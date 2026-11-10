import{createRequire as __cr}from'module';const require=__cr(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@hono/node-server/dist/index.mjs
import { createServer as createServerHTTP } from "http";
import { Http2ServerRequest as Http2ServerRequest2, constants as h2constants } from "http2";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto2 from "crypto";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var validateRequestTarget = (target) => {
  const backslash = target.indexOf("\\");
  if (backslash !== -1) {
    const query = target.indexOf("?");
    if (query === -1 || backslash < query) {
      throw new RequestError("Backslash in request path");
    }
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request2 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url2, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request2(url2, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = Readable.toWeb(incoming);
    }
  }
  return new Request2(url2, init);
};
var getRequestCache = Symbol("getRequestCache");
var requestCache = Symbol("requestCache");
var incomingKey = Symbol("incomingKey");
var urlKey = Symbol("urlKey");
var headersKey = Symbol("headersKey");
var abortControllerKey = Symbol("abortControllerKey");
var getAbortController = Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.defineProperty(requestPrototype, Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      nativeRequest: this[requestCache]
    };
    return `Request (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(requestPrototype, Request2.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      validateRequestTarget(incomingUrl);
      const url22 = new URL(incomingUrl);
      req[urlKey] = url22.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  validateRequestTarget(incomingUrl);
  const url2 = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url2.hostname.length !== host.length && url2.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url2.href;
  return req;
};
var responseCache = Symbol("responseCache");
var getResponseCache = Symbol("getResponseCache");
var cacheKey = Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      ;
      this[cacheKey] = [init?.status || 200, body, headers || init?.headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(
          cache[2] || { "content-type": "text/plain; charset=UTF-8" }
        );
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.defineProperty(Response2.prototype, Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      status: this.status,
      headers: this.headers,
      ok: this.ok,
      nativeResponse: this[responseCache]
    };
    return `Response (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
if (typeof global.crypto === "undefined") {
  global.crypto = crypto2;
}
var outgoingEnded = Symbol("outgoingEnded");
var incomingDraining = Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
var drainIncoming = (incoming) => {
  const incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) {
    return;
  }
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof Http2ServerRequest2) {
    try {
      ;
      incoming.stream?.close?.(h2constants.NGHTTP2_NO_ERROR);
    } catch {
    }
    return;
  }
  let bytesRead = 0;
  const cleanup = () => {
    clearTimeout(timer2);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  const forceClose = () => {
    cleanup();
    const socket = incoming.socket;
    if (socket && !socket.destroyed) {
      socket.destroySoon();
    }
  };
  const timer2 = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer2.unref?.();
  const onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) {
      forceClose();
    }
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  let hasContentLength = false;
  if (!header) {
    header = { "content-type": "text/plain; charset=UTF-8" };
  } else if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj);
  } else {
    for (const key in header) {
      if (key.length === 14 && key.toLowerCase() === "content-length") {
        hasContentLength = true;
        break;
      }
    }
  }
  if (!hasContentLength) {
    if (typeof body === "string") {
      header["Content-Length"] = Buffer.byteLength(body);
    } else if (body instanceof Uint8Array) {
      header["Content-Length"] = body.byteLength;
    } else if (body instanceof Blob) {
      header["Content-Length"] = body.size;
    }
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values2 = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values2.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values2.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values2.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values2.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request2) {
    Object.defineProperty(global, "Request", {
      value: Request2
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest2) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    drainIncoming(incoming);
                  });
                }
              });
            }
          };
        }
        outgoing.on("finish", () => {
          if (!incomingEnded) {
            drainIncoming(incoming);
          }
        });
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                drainIncoming(incoming);
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const createServer = options.createServer || createServerHTTP;
  const server = createServer(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    const serverInfo = server.address();
    listeningListener && listeningListener(serverInfo);
  });
  return server;
};

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema2, params) => {
  return new ZodArray({
    type: schema2,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema2) {
  if (schema2 instanceof ZodObject) {
    const newShape = {};
    for (const key in schema2.shape) {
      const fieldSchema = schema2.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema2._def,
      shape: () => newShape
    });
  } else if (schema2 instanceof ZodArray) {
    return new ZodArray({
      ...schema2._def,
      type: deepPartialify(schema2.element)
    });
  } else if (schema2 instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema2.unwrap()));
  } else if (schema2 instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema2.unwrap()));
  } else if (schema2 instanceof ZodTuple) {
    return ZodTuple.create(schema2.items.map((item) => deepPartialify(item)));
  } else {
    return schema2;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema2) {
    return this.augment({ [key]: schema2 });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types2, params) => {
  return new ZodUnion({
    options: types2,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b2) {
  const aType = getParsedType(a);
  const bType = getParsedType(b2);
  if (a === b2) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b2);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b2 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b2[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b2.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b2[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b2) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema2 = this._def.items[itemIndex] || this._def.rest;
      if (!schema2)
        return null;
      return schema2._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size2, message) {
    return this.min(size2, message).max(size2, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values2, params) {
  return new ZodEnum({
    values: values2,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values2, newDef = this._def) {
    return _ZodEnum.create(values2, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values2, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values2.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values2, params) => {
  return new ZodNativeEnum({
    values: values2,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema2, params) => {
  return new ZodPromise({
    type: schema2,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema2, effect, params) => {
  return new ZodEffects({
    schema: schema2,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema2, params) => {
  return new ZodEffects({
    schema: schema2,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b2) {
    return new _ZodPipeline({
      in: a,
      out: b2,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// server/config.ts
var schema = external_exports.object({
  NODE_ENV: external_exports.enum(["development", "production", "test"]).default("development"),
  PORT: external_exports.coerce.number().int().min(1).max(65535).default(3e3),
  DATABASE_URL: external_exports.string().min(1, "DATABASE_URL is required"),
  APP_SECRET: external_exports.string().default(""),
  APP_ORIGIN: external_exports.string().default("http://localhost:3000"),
  ADMIN_EMAIL: external_exports.string().email().optional(),
  ADMIN_PASSWORD: external_exports.string().optional(),
  OPENAI_API_KEY: external_exports.string().optional(),
  ANTHROPIC_API_KEY: external_exports.string().optional(),
  STATIC_DIR: external_exports.string().default("dist"),
  ORDER_PAYMENT_TTL_MINUTES: external_exports.coerce.number().int().min(5).max(1440).default(30),
  /** Only honoured outside production — lets tests point gateways at a mock server. */
  PAYMENT_TEST_BASE_URL: external_exports.string().url().optional()
});
var parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("\u274C Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
var env = parsed.data;
var production = env.NODE_ENV === "production";
var problems = [];
if (production) {
  if (env.APP_SECRET.length < 32) problems.push("APP_SECRET must be at least 32 random characters");
  if (!env.APP_ORIGIN.startsWith("https://")) problems.push("APP_ORIGIN must be an https:// origin (e.g. https://50500.shop)");
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 12) problems.push("ADMIN_PASSWORD must be at least 12 characters");
}
if (problems.length) {
  console.error("\u274C Refusing to start in production:\n - " + problems.join("\n - "));
  process.exit(1);
}
var origin;
try {
  origin = new URL(env.APP_ORIGIN);
} catch {
  console.error("\u274C APP_ORIGIN is not a valid URL");
  process.exit(1);
}
var config = {
  production,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  // Development gets a stable per-process fallback so local runs work; production requires a real secret.
  appSecret: env.APP_SECRET || "development-only-secret-change-me-0123456789",
  appOrigin: origin.origin,
  appHost: origin.host,
  adminEmail: env.ADMIN_EMAIL?.toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD,
  openaiKey: env.OPENAI_API_KEY,
  anthropicKey: env.ANTHROPIC_API_KEY,
  staticDir: env.STATIC_DIR,
  orderTtlMinutes: env.ORDER_PAYMENT_TTL_MINUTES,
  paymentTestBase: production ? void 0 : env.PAYMENT_TEST_BASE_URL
};

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  res;
  status;
  /**
  * Creates an instance of `HTTPException`.
  * @param status - HTTP status code for the exception. Defaults to 500.
  * @param options - Additional options for the exception.
  */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
  * Returns the response object associated with the exception.
  * If a response object is not provided, a new response is created with the error message and status code.
  * @returns The response object.
  */
  getResponse() {
    if (this.res) return new Response(this.res.body, {
      status: this.status,
      headers: this.res.headers
    });
    return new Response(this.message, { status: this.status });
  }
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey2,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey2] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str2, decoder) => {
  try {
    return decoder(str2);
  } catch {
    return str2.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str2) => tryDecode(str2, decodeURI);
var getPath = (request) => {
  const url2 = request.url;
  const start = url2.indexOf("/", url2.indexOf(":") + 4);
  let i = start;
  for (; i < url2.length; i++) {
    const charCode = url2.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url2.indexOf("?", i);
      const hashIndex = url2.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url2.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url2.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var stripPathPrefix = (rawPath, decodedPath, prefixLength) => {
  if (rawPath.at(-1) === "/" && decodedPath.at(-1) !== "/") rawPath = rawPath.slice(0, -1);
  let index = 0;
  for (let i = decodedPath.indexOf("/"); i !== -1 && i < prefixLength; i = decodedPath.indexOf("/", i + 1)) {
    index = rawPath.indexOf("/", index + 1);
    if (index === -1) return "/";
  }
  return rawPath.slice(index) || "/";
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str2) => str2.indexOf("%") !== -1 ? tryDecode(str2, decodeURIComponent_) : str2;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url2, key, multiple) => {
  const hashIndex = url2.indexOf("#", 8);
  if (hashIndex !== -1) url2 = url2.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    const queryIndex = url2.indexOf("?", 8);
    let keyIndex2 = queryIndex;
    if (keyIndex2 === -1) return;
    if (!url2.startsWith(key, keyIndex2 + 1)) keyIndex2 = url2.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url2.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
        if (keyIndex2 > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url2.slice(queryIndex + 1, keyIndex2))) break;
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url2.indexOf("&", valueIndex);
          return _decodeURI(url2.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        }
        return "";
      }
      keyIndex2 = url2.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url2);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url2);
  let keyIndex = url2.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url2.indexOf("&", keyIndex + 1);
    let valueIndex = url2.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url2.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url2.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url2, key) => {
  return _getQueryParam(url2, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer2) => new Uint8Array(buffer2));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str2, phase, preserveCallbacks, context, buffer2) => {
  if (typeof str2 === "object" && !(str2 instanceof String)) {
    if (!(str2 instanceof Promise)) str2 = str2.toString();
    if (str2 instanceof Promise) str2 = await str2;
  }
  const callbacks = str2.callbacks;
  if (!callbacks?.length) return Promise.resolve(str2);
  if (buffer2) buffer2[0] += str2;
  else buffer2 = [str2];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer: buffer2,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str3) => resolveCallback(str3, phase, false, context, buffer2))).then(() => buffer2[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized && !this.#res.bodyUsed) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/utils/mount.js
var getPathPrefixLength = (c, pathPrefix, routePath) => {
  if (!/[:*]/.test(pathPrefix)) return pathPrefix.length;
  const path = c.req.path;
  const matchResult = c.req[GET_MATCH_RESULT];
  const paramNames = /* @__PURE__ */ new Set();
  let length = 0;
  for (const part of splitRoutingPath(pathPrefix)) {
    const pattern = getPattern(part);
    if (pattern && pattern !== "*") {
      const name = pattern[1];
      if (paramNames.has(name)) throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath}".`);
      paramNames.add(name);
    }
    if (pattern && pattern !== "*" && pattern[2] !== true) {
      const value = matchResult.length === 2 ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]] : matchResult[0][c.req.routeIndex][1][pattern[1]];
      length += value.length + 1;
    } else if (pattern || part.endsWith("*")) {
      const end = path.indexOf("/", length + 1);
      length = end === -1 ? path.length : end;
    } else length += part.length + 1;
  }
  return length;
};
var createMountedRequest = (c, pathPrefix, routePath) => {
  if (/[^/]\*$/.test(routePath)) throw new Error(`mount(): Wildcard must follow "/" in "${routePath}".`);
  const url2 = new URL(c.req.raw.url);
  url2.pathname = stripPathPrefix(url2.pathname, c.req.path, getPathPrefixLength(c, pathPrefix, routePath));
  return new Request(url2, c.req.raw);
};

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    const mergedPath = mergePath(this._basePath, path);
    const defaultReplaceRequest = (c) => createMountedRequest(c, mergedPath.replace(/\/$/, ""), mergePath(mergedPath, "*"));
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = "[^]*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/[^]*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b2) {
  if (a.length === 1) return b2.length === 1 ? a < b2 ? -1 : 1 : -1;
  if (b2.length === 1) return 1;
  if (a === "[^]*" || a === "(?:|/[^]*)") return b2 === "[^]*" ? -1 : 1;
  else if (b2 === "[^]*" || b2 === "(?:|/[^]*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b2 === "[^/]+") return -1;
  return a.length === b2.length ? a < b2 ? -1 : 1 : b2.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, keys) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ONLY_WILDCARD_REG_EXP_STR
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (new RegExp(regexpStr).test("")) throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        keys.push(regexpStr);
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== "[^]*" && regexpStr !== "(?:|/[^]*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        keys.push(token);
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    const keys = [];
    if (isStatic) {
      this.#root.insert(path.split(""), -1, [], this.#context, keys);
      this.paths[path] = [
        -1,
        [],
        keys
      ];
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./gs) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, keys);
    this.paths[path] = [
      this.#index++,
      paramAssoc,
      keys
    ];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
function endsWithWildcard(keys) {
  const tail = keys[keys.length - 1];
  return tail === "[^]*" || tail === "(?:|/[^]*)";
}
function covers(wildcard, target) {
  const last = wildcard.length - 1;
  for (let i = 0; i < last; i++) if (wildcard[i] !== target[i]) return false;
  return wildcard[last] === "[^]*" || target.length === last || target[last] === "/";
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #handlers;
  #tries;
  constructor() {
    this.#handlers = { ["ALL"]: [] };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const handlers = this.#handlers;
    if (!handlers) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    const tries = this.#tries;
    if (!handlers[method]) {
      tries[method] = new Trie();
      handlers[method] = [...handlers["ALL"]];
      for (const p in tries["ALL"].paths) this.#insertPath(method, p);
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(handlers) : [method];
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!tries[m].paths[path2]) this.#insertPath(m, path2);
      handlers[m].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#handlers)) matchers[method] = this.#buildMatcher(method);
    this.#handlers = this.#tries = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const handlers = this.#handlers[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    const own = createNullObject();
    const entries = handlers.map(([h, p], i) => {
      (own[p] ??= []).push(i);
      return [h, trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
        map[key] = paramReplacementMap[varIndex];
        return map;
      }, createNullObject())];
    });
    const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]));
    for (const path in trie.paths) {
      const [index, , keys] = trie.paths[path];
      const indexes = [...own[path]];
      for (const p of wildcards) if (p !== path && covers(trie.paths[p][2], keys)) indexes.push(...own[p]);
      const data = indexes.sort((a, b2) => a - b2).map((i) => entries[i]);
      if (index === -1) {
        const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)));
        staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp).slice(0, last + 1)];
      } else handlerData[index] = data;
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              if (!Object.hasOwn(params, name)) params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            if (!Object.hasOwn(params, name)) params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b2) => {
      return a.score - b2.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = (value) => {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const charCode = value.charCodeAt(start);
    if (charCode !== 32 && charCode !== 9) break;
    start++;
  }
  while (end > start) {
    const charCode = value.charCodeAt(end - 1);
    if (charCode !== 32 && charCode !== 9) break;
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
};
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) return {};
  const pairs = cookie.split(";");
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) continue;
    const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
    if (name && name !== cookieName || !relaxedCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) continue;
    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) cookieValue = cookieValue.slice(1, -1);
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = tryDecodeURIComponent(cookieValue);
      if (name) break;
    }
  }
  return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
  if (!validCookieNameRegEx.test(name)) throw new Error("Invalid cookie name");
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) throw new Error("__Secure- Cookie must have Secure attributes");
  if (name.startsWith("__Host-")) {
    if (!opt.secure) throw new Error("__Host- Cookie must have Secure attributes");
    if (opt.path !== "/") throw new Error('__Host- Cookie must have Path attributes with "/"');
    if (opt.domain) throw new Error("__Host- Cookie must not have Domain attributes");
  }
  for (const key of [
    "domain",
    "path",
    "sameSite",
    "priority"
  ]) if (opt[key] && /[;\r\n]/.test(opt[key])) throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") cookie += `; Domain=${opt.domain}`;
  if (opt.path) cookie += `; Path=${opt.path}`;
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) cookie += "; HttpOnly";
  if (opt.secure) cookie += "; Secure";
  if (opt.sameSite) cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  if (opt.priority) cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  if (opt.partitioned) {
    if (!opt.secure) throw new Error("Partitioned Cookie must have Secure attributes");
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) return;
    let finalKey = key;
    if (prefix === "secure") finalKey = "__Secure-" + key;
    else if (prefix === "host") finalKey = "__Host-" + key;
    return parse(cookie, finalKey)[finalKey];
  }
  if (!cookie) return {};
  return parse(cookie);
};
var generateCookie = (name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") cookie = serialize("__Secure-" + name, value, {
    path: "/",
    ...opt,
    secure: true
  });
  else if (opt?.prefix === "host") cookie = serialize("__Host-" + name, value, {
    ...opt,
    path: "/",
    secure: true,
    domain: void 0
  });
  else cookie = serialize(name, value, {
    path: "/",
    ...opt
  });
  return cookie;
};
var setCookie = (c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", {
    ...opt,
    maxAge: 0
  });
  return deletedCookie;
};

// node_modules/hono/dist/middleware/body-limit/index.js
var ERROR_MESSAGE = "Payload Too Large";
var bodyLimit = (options) => {
  const onError = options.onError || (() => {
    const res = new Response(ERROR_MESSAGE, { status: 413 });
    throw new HTTPException(413, { res });
  });
  const maxSize = options.maxSize;
  return async function bodyLimit2(c, next) {
    if (!c.req.raw.body) return next();
    const hasTransferEncoding = c.req.raw.headers.has("transfer-encoding");
    if (c.req.raw.headers.has("content-length") && !hasTransferEncoding) return parseInt(c.req.raw.headers.get("content-length") || "0", 10) > maxSize ? onError(c) : next();
    let size2 = 0;
    const chunks = [];
    const rawReader = c.req.raw.body.getReader();
    for (; ; ) {
      const { done, value } = await rawReader.read();
      if (done) break;
      size2 += value.length;
      if (size2 > maxSize) return onError(c);
      chunks.push(value);
    }
    const requestInit = {
      body: new ReadableStream({ start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      } }),
      duplex: "half"
    };
    c.req.raw = new Request(c.req.raw, requestInit);
    return next();
  };
};

// server/app.ts
import sharp from "sharp";

// node_modules/postgres/src/index.js
import os from "os";
import fs from "fs";

// node_modules/postgres/src/query.js
var originCache = /* @__PURE__ */ new Map();
var originStackCache = /* @__PURE__ */ new Map();
var originError = Symbol("OriginError");
var CLOSE = {};
var Query = class extends Promise {
  constructor(strings, args, handler, canceller, options = {}) {
    let resolve, reject;
    super((a, b2) => {
      resolve = a;
      reject = b2;
    });
    this.tagged = Array.isArray(strings.raw);
    this.strings = strings;
    this.args = args;
    this.handler = handler;
    this.canceller = canceller;
    this.options = options;
    this.state = null;
    this.statement = null;
    this.resolve = (x) => (this.active = false, resolve(x));
    this.reject = (x) => (this.active = false, reject(x));
    this.active = false;
    this.cancelled = null;
    this.executed = false;
    this.signature = "";
    this[originError] = this.handler.debug ? new Error() : this.tagged && cachedError(this.strings);
  }
  get origin() {
    return (this.handler.debug ? this[originError].stack : this.tagged && originStackCache.has(this.strings) ? originStackCache.get(this.strings) : originStackCache.set(this.strings, this[originError].stack).get(this.strings)) || "";
  }
  static get [Symbol.species]() {
    return Promise;
  }
  cancel() {
    return this.canceller && (this.canceller(this), this.canceller = null);
  }
  simple() {
    this.options.simple = true;
    this.options.prepare = false;
    return this;
  }
  async readable() {
    this.simple();
    this.streaming = true;
    return this;
  }
  async writable() {
    this.simple();
    this.streaming = true;
    return this;
  }
  cursor(rows = 1, fn) {
    this.options.simple = false;
    if (typeof rows === "function") {
      fn = rows;
      rows = 1;
    }
    this.cursorRows = rows;
    if (typeof fn === "function")
      return this.cursorFn = fn, this;
    let prev;
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          if (this.executed && !this.active)
            return { done: true };
          prev && prev();
          const promise = new Promise((resolve, reject) => {
            this.cursorFn = (value) => {
              resolve({ value, done: false });
              return new Promise((r) => prev = r);
            };
            this.resolve = () => (this.active = false, resolve({ done: true }));
            this.reject = (x) => (this.active = false, reject(x));
          });
          this.execute();
          return promise;
        },
        return() {
          prev && prev(CLOSE);
          return { done: true };
        }
      })
    };
  }
  describe() {
    this.options.simple = false;
    this.onlyDescribe = this.options.prepare = true;
    return this;
  }
  stream() {
    throw new Error(".stream has been renamed to .forEach");
  }
  forEach(fn) {
    this.forEachFn = fn;
    this.handle();
    return this;
  }
  raw() {
    this.isRaw = true;
    return this;
  }
  values() {
    this.isRaw = "values";
    return this;
  }
  async handle() {
    !this.executed && (this.executed = true) && await 1 && this.handler(this);
  }
  execute() {
    this.handle();
    return this;
  }
  then() {
    this.handle();
    return super.then.apply(this, arguments);
  }
  catch() {
    this.handle();
    return super.catch.apply(this, arguments);
  }
  finally() {
    this.handle();
    return super.finally.apply(this, arguments);
  }
};
function cachedError(xs) {
  if (originCache.has(xs))
    return originCache.get(xs);
  const x = Error.stackTraceLimit;
  Error.stackTraceLimit = 4;
  originCache.set(xs, new Error());
  Error.stackTraceLimit = x;
  return originCache.get(xs);
}

// node_modules/postgres/src/errors.js
var PostgresError = class extends Error {
  constructor(x) {
    super(x.message);
    this.name = this.constructor.name;
    Object.assign(this, x);
  }
};
var Errors = {
  connection,
  postgres,
  generic,
  notSupported
};
function connection(x, options, socket) {
  const { host, port } = socket || options;
  const error = Object.assign(
    new Error("write " + x + " " + (options.path || host + ":" + port)),
    {
      code: x,
      errno: x,
      address: options.path || host
    },
    options.path ? {} : { port }
  );
  Error.captureStackTrace(error, connection);
  return error;
}
function postgres(x) {
  const error = new PostgresError(x);
  Error.captureStackTrace(error, postgres);
  return error;
}
function generic(code, message) {
  const error = Object.assign(new Error(code + ": " + message), { code });
  Error.captureStackTrace(error, generic);
  return error;
}
function notSupported(x) {
  const error = Object.assign(
    new Error(x + " (B) is not supported"),
    {
      code: "MESSAGE_NOT_SUPPORTED",
      name: x
    }
  );
  Error.captureStackTrace(error, notSupported);
  return error;
}

// node_modules/postgres/src/types.js
var types = {
  string: {
    to: 25,
    from: null,
    // defaults to string
    serialize: (x) => "" + x
  },
  number: {
    to: 0,
    from: [21, 23, 26, 700, 701],
    serialize: (x) => "" + x,
    parse: (x) => +x
  },
  json: {
    to: 114,
    from: [114, 3802],
    serialize: (x) => JSON.stringify(x),
    parse: (x) => JSON.parse(x)
  },
  boolean: {
    to: 16,
    from: 16,
    serialize: (x) => x === true ? "t" : "f",
    parse: (x) => x === "t"
  },
  date: {
    to: 1184,
    from: [1082, 1114, 1184],
    serialize: (x) => (x instanceof Date ? x : new Date(x)).toISOString(),
    parse: (x) => new Date(x)
  },
  bytea: {
    to: 17,
    from: 17,
    serialize: (x) => "\\x" + Buffer.from(x).toString("hex"),
    parse: (x) => Buffer.from(x.slice(2), "hex")
  }
};
var NotTagged = class {
  then() {
    notTagged();
  }
  catch() {
    notTagged();
  }
  finally() {
    notTagged();
  }
};
var Identifier = class extends NotTagged {
  constructor(value) {
    super();
    this.value = escapeIdentifier(value);
  }
};
var Parameter = class extends NotTagged {
  constructor(value, type, array) {
    super();
    this.value = value;
    this.type = type;
    this.array = array;
  }
};
var Builder = class extends NotTagged {
  constructor(first, rest) {
    super();
    this.first = first;
    this.rest = rest;
  }
  build(before, parameters, types2, options) {
    const keyword = builders.map(([x, fn]) => ({ fn, i: before.search(x) })).sort((a, b2) => a.i - b2.i).pop();
    return keyword.i === -1 ? escapeIdentifiers(this.first, options) : keyword.fn(this.first, this.rest, parameters, types2, options);
  }
};
function handleValue(x, parameters, types2, options) {
  let value = x instanceof Parameter ? x.value : x;
  if (value === void 0) {
    x instanceof Parameter ? x.value = options.transform.undefined : value = x = options.transform.undefined;
    if (value === void 0)
      throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
  }
  return "$" + types2.push(
    x instanceof Parameter ? (parameters.push(x.value), x.array ? x.array[x.type || inferType(x.value)] || x.type || firstIsString(x.value) : x.type) : (parameters.push(x), inferType(x))
  );
}
var defaultHandlers = typeHandlers(types);
function stringify(q, string, value, parameters, types2, options) {
  for (let i = 1; i < q.strings.length; i++) {
    string += stringifyValue(string, value, parameters, types2, options) + q.strings[i];
    value = q.args[i];
  }
  return string;
}
function stringifyValue(string, value, parameters, types2, o) {
  return value instanceof Builder ? value.build(string, parameters, types2, o) : value instanceof Query ? fragment(value, parameters, types2, o) : value instanceof Identifier ? value.value : value && value[0] instanceof Query ? value.reduce((acc, x) => acc + " " + fragment(x, parameters, types2, o), "") : handleValue(value, parameters, types2, o);
}
function fragment(q, parameters, types2, options) {
  q.fragment = true;
  return stringify(q, q.strings[0], q.args[0], parameters, types2, options);
}
function valuesBuilder(first, parameters, types2, columns, options) {
  return first.map(
    (row) => "(" + columns.map(
      (column) => stringifyValue("values", row[column], parameters, types2, options)
    ).join(",") + ")"
  ).join(",");
}
function values(first, rest, parameters, types2, options) {
  const multi = Array.isArray(first[0]);
  const columns = rest.length ? rest.flat() : Object.keys(multi ? first[0] : first);
  return valuesBuilder(multi ? first : [first], parameters, types2, columns, options);
}
function select(first, rest, parameters, types2, options) {
  typeof first === "string" && (first = [first].concat(rest));
  if (Array.isArray(first))
    return escapeIdentifiers(first, options);
  let value;
  const columns = rest.length ? rest.flat() : Object.keys(first);
  return columns.map((x) => {
    value = first[x];
    return (value instanceof Query ? fragment(value, parameters, types2, options) : value instanceof Identifier ? value.value : handleValue(value, parameters, types2, options)) + " as " + escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x);
  }).join(",");
}
var builders = Object.entries({
  values,
  in: (...xs) => {
    const x = values(...xs);
    return x === "()" ? "(null)" : x;
  },
  select,
  as: select,
  returning: select,
  "\\(": select,
  update(first, rest, parameters, types2, options) {
    return (rest.length ? rest.flat() : Object.keys(first)).map(
      (x) => escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x) + "=" + stringifyValue("values", first[x], parameters, types2, options)
    );
  },
  insert(first, rest, parameters, types2, options) {
    const columns = rest.length ? rest.flat() : Object.keys(Array.isArray(first) ? first[0] : first);
    return "(" + escapeIdentifiers(columns, options) + ")values" + valuesBuilder(Array.isArray(first) ? first : [first], parameters, types2, columns, options);
  }
}).map(([x, fn]) => [new RegExp("((?:^|[\\s(])" + x + "(?:$|[\\s(]))(?![\\s\\S]*\\1)", "i"), fn]);
function notTagged() {
  throw Errors.generic("NOT_TAGGED_CALL", "Query not called as a tagged template literal");
}
var serializers = defaultHandlers.serializers;
var parsers = defaultHandlers.parsers;
function firstIsString(x) {
  if (Array.isArray(x))
    return firstIsString(x[0]);
  return typeof x === "string" ? 1009 : 0;
}
var mergeUserTypes = function(types2) {
  const user = typeHandlers(types2 || {});
  return {
    serializers: Object.assign({}, serializers, user.serializers),
    parsers: Object.assign({}, parsers, user.parsers)
  };
};
function typeHandlers(types2) {
  return Object.keys(types2).reduce((acc, k) => {
    types2[k].from && [].concat(types2[k].from).forEach((x) => acc.parsers[x] = types2[k].parse);
    if (types2[k].serialize) {
      acc.serializers[types2[k].to] = types2[k].serialize;
      types2[k].from && [].concat(types2[k].from).forEach((x) => acc.serializers[x] = types2[k].serialize);
    }
    return acc;
  }, { parsers: {}, serializers: {} });
}
function escapeIdentifiers(xs, { transform: { column } }) {
  return xs.map((x) => escapeIdentifier(column.to ? column.to(x) : x)).join(",");
}
var escapeIdentifier = function escape(str2) {
  return '"' + str2.replace(/"/g, '""').replace(/\./g, '"."') + '"';
};
var inferType = function inferType2(x) {
  return x instanceof Parameter ? x.type : x instanceof Date ? 1184 : x instanceof Uint8Array ? 17 : x === true || x === false ? 16 : typeof x === "bigint" ? 20 : Array.isArray(x) ? inferType2(x[0]) : 0;
};
var escapeBackslash = /\\/g;
var escapeQuote = /"/g;
function arrayEscape(x) {
  return x.replace(escapeBackslash, "\\\\").replace(escapeQuote, '\\"');
}
var arraySerializer = function arraySerializer2(xs, serializer, options, typarray) {
  if (Array.isArray(xs) === false)
    return xs;
  if (!xs.length)
    return "{}";
  const first = xs[0];
  const delimiter = typarray === 1020 ? ";" : ",";
  if (Array.isArray(first) && !first.type)
    return "{" + xs.map((x) => arraySerializer2(x, serializer, options, typarray)).join(delimiter) + "}";
  return "{" + xs.map((x) => {
    if (x === void 0) {
      x = options.transform.undefined;
      if (x === void 0)
        throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
    }
    return x === null ? "null" : '"' + arrayEscape(serializer ? serializer(x.type ? x.value : x) : "" + x) + '"';
  }).join(delimiter) + "}";
};
var arrayParserState = {
  i: 0,
  char: null,
  str: "",
  quoted: false,
  last: 0
};
var arrayParser = function arrayParser2(x, parser, typarray) {
  arrayParserState.i = arrayParserState.last = 0;
  return arrayParserLoop(arrayParserState, x, parser, typarray);
};
function arrayParserLoop(s, x, parser, typarray) {
  const xs = [];
  const delimiter = typarray === 1020 ? ";" : ",";
  for (; s.i < x.length; s.i++) {
    s.char = x[s.i];
    if (s.quoted) {
      if (s.char === "\\") {
        s.str += x[++s.i];
      } else if (s.char === '"') {
        xs.push(parser ? parser(s.str) : s.str);
        s.str = "";
        s.quoted = x[s.i + 1] === '"';
        s.last = s.i + 2;
      } else {
        s.str += s.char;
      }
    } else if (s.char === '"') {
      s.quoted = true;
    } else if (s.char === "{") {
      s.last = ++s.i;
      xs.push(arrayParserLoop(s, x, parser, typarray));
    } else if (s.char === "}") {
      s.quoted = false;
      s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
      break;
    } else if (s.char === delimiter && s.p !== "}" && s.p !== '"') {
      xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
    }
    s.p = s.char;
  }
  s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i + 1)) : x.slice(s.last, s.i + 1));
  return xs;
}
var toCamel = (x) => {
  let str2 = x[0];
  for (let i = 1; i < x.length; i++)
    str2 += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str2;
};
var toPascal = (x) => {
  let str2 = x[0].toUpperCase();
  for (let i = 1; i < x.length; i++)
    str2 += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str2;
};
var toKebab = (x) => x.replace(/_/g, "-");
var fromCamel = (x) => x.replace(/([A-Z])/g, "_$1").toLowerCase();
var fromPascal = (x) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase();
var fromKebab = (x) => x.replace(/-/g, "_");
function createJsonTransform(fn) {
  return function jsonTransform(x, column) {
    return typeof x === "object" && x !== null && (column.type === 114 || column.type === 3802) ? Array.isArray(x) ? x.map((x2) => jsonTransform(x2, column)) : Object.entries(x).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: jsonTransform(v, column) }), {}) : x;
  };
}
toCamel.column = { from: toCamel };
toCamel.value = { from: createJsonTransform(toCamel) };
fromCamel.column = { to: fromCamel };
var camel = { ...toCamel };
camel.column.to = fromCamel;
toPascal.column = { from: toPascal };
toPascal.value = { from: createJsonTransform(toPascal) };
fromPascal.column = { to: fromPascal };
var pascal = { ...toPascal };
pascal.column.to = fromPascal;
toKebab.column = { from: toKebab };
toKebab.value = { from: createJsonTransform(toKebab) };
fromKebab.column = { to: fromKebab };
var kebab = { ...toKebab };
kebab.column.to = fromKebab;

// node_modules/postgres/src/connection.js
import net from "net";
import tls from "tls";
import crypto3 from "crypto";
import Stream from "stream";
import { performance } from "perf_hooks";

// node_modules/postgres/src/result.js
var Result = class extends Array {
  constructor() {
    super();
    Object.defineProperties(this, {
      count: { value: null, writable: true },
      state: { value: null, writable: true },
      command: { value: null, writable: true },
      columns: { value: null, writable: true },
      statement: { value: null, writable: true }
    });
  }
  static get [Symbol.species]() {
    return Array;
  }
};

// node_modules/postgres/src/queue.js
var queue_default = Queue;
function Queue(initial = []) {
  let xs = initial.slice();
  let index = 0;
  return {
    get length() {
      return xs.length - index;
    },
    remove: (x) => {
      const index2 = xs.indexOf(x);
      return index2 === -1 ? null : (xs.splice(index2, 1), x);
    },
    push: (x) => (xs.push(x), x),
    shift: () => {
      const out = xs[index++];
      if (index === xs.length) {
        index = 0;
        xs = [];
      } else {
        xs[index - 1] = void 0;
      }
      return out;
    }
  };
}

// node_modules/postgres/src/bytes.js
var size = 256;
var buffer = Buffer.allocUnsafe(size);
var messages = "BCcDdEFfHPpQSX".split("").reduce((acc, x) => {
  const v = x.charCodeAt(0);
  acc[x] = () => {
    buffer[0] = v;
    b.i = 5;
    return b;
  };
  return acc;
}, {});
var b = Object.assign(reset, messages, {
  N: String.fromCharCode(0),
  i: 0,
  inc(x) {
    b.i += x;
    return b;
  },
  str(x) {
    const length = Buffer.byteLength(x);
    fit(length);
    b.i += buffer.write(x, b.i, length, "utf8");
    return b;
  },
  i16(x) {
    fit(2);
    buffer.writeUInt16BE(x, b.i);
    b.i += 2;
    return b;
  },
  i32(x, i) {
    if (i || i === 0) {
      buffer.writeUInt32BE(x, i);
      return b;
    }
    fit(4);
    buffer.writeUInt32BE(x, b.i);
    b.i += 4;
    return b;
  },
  z(x) {
    fit(x);
    buffer.fill(0, b.i, b.i + x);
    b.i += x;
    return b;
  },
  raw(x) {
    buffer = Buffer.concat([buffer.subarray(0, b.i), x]);
    b.i = buffer.length;
    return b;
  },
  end(at = 1) {
    buffer.writeUInt32BE(b.i - at, at);
    const out = buffer.subarray(0, b.i);
    b.i = 0;
    buffer = Buffer.allocUnsafe(size);
    return out;
  }
});
var bytes_default = b;
function fit(x) {
  if (buffer.length - b.i < x) {
    const prev = buffer, length = prev.length;
    buffer = Buffer.allocUnsafe(length + (length >> 1) + x);
    prev.copy(buffer);
  }
}
function reset() {
  b.i = 0;
  return b;
}

// node_modules/postgres/src/connection.js
var connection_default = Connection;
var uid = 1;
var Sync = bytes_default().S().end();
var Flush = bytes_default().H().end();
var SSLRequest = bytes_default().i32(8).i32(80877103).end(8);
var ExecuteUnnamed = Buffer.concat([bytes_default().E().str(bytes_default.N).i32(0).end(), Sync]);
var DescribeUnnamed = bytes_default().D().str("S").str(bytes_default.N).end();
var noop = () => {
};
var retryRoutines = /* @__PURE__ */ new Set([
  "FetchPreparedStatement",
  "RevalidateCachedQuery",
  "transformAssignedExpr"
]);
var errorFields = {
  83: "severity_local",
  // S
  86: "severity",
  // V
  67: "code",
  // C
  77: "message",
  // M
  68: "detail",
  // D
  72: "hint",
  // H
  80: "position",
  // P
  112: "internal_position",
  // p
  113: "internal_query",
  // q
  87: "where",
  // W
  115: "schema_name",
  // s
  116: "table_name",
  // t
  99: "column_name",
  // c
  100: "data type_name",
  // d
  110: "constraint_name",
  // n
  70: "file",
  // F
  76: "line",
  // L
  82: "routine"
  // R
};
function Connection(options, queues = {}, { onopen = noop, onend = noop, onclose = noop } = {}) {
  const {
    sslnegotiation,
    ssl,
    max,
    user,
    host,
    port,
    database,
    parsers: parsers2,
    transform,
    onnotice,
    onnotify,
    onparameter,
    max_pipeline,
    keep_alive,
    backoff: backoff2,
    target_session_attrs
  } = options;
  const sent = queue_default(), id = uid++, backend = { pid: null, secret: null }, idleTimer = timer(end, options.idle_timeout), lifeTimer = timer(end, options.max_lifetime), connectTimer = timer(connectTimedOut, options.connect_timeout);
  let socket = null, cancelMessage, errorResponse = null, result = new Result(), incoming = Buffer.alloc(0), needsTypes = options.fetch_types, backendParameters = {}, statements = {}, statementId = Math.random().toString(36).slice(2), statementCount = 1, closedTime = 0, remaining = 0, hostIndex = 0, retries = 0, length = 0, delay = 0, rows = 0, serverSignature = null, nextWriteTimer = null, terminated = false, incomings = null, results = null, initial = null, ending = null, stream = null, chunk = null, ended = null, nonce = null, query = null, final = null;
  const connection2 = {
    queue: queues.closed,
    idleTimer,
    connect(query2) {
      initial = query2;
      reconnect();
    },
    terminate,
    execute,
    cancel,
    end,
    count: 0,
    id
  };
  queues.closed && queues.closed.push(connection2);
  return connection2;
  async function createSocket() {
    let x;
    try {
      x = options.socket ? await Promise.resolve(options.socket(options)) : new net.Socket();
    } catch (e) {
      error(e);
      return;
    }
    x.on("error", error);
    x.on("close", closed);
    x.on("drain", drain);
    return x;
  }
  async function cancel({ pid, secret }, resolve, reject) {
    try {
      cancelMessage = bytes_default().i32(16).i32(80877102).i32(pid).i32(secret).end(16);
      await connect();
      socket.once("error", reject);
      socket.once("close", resolve);
    } catch (error2) {
      reject(error2);
    }
  }
  function execute(q) {
    if (terminated)
      return queryError(q, Errors.connection("CONNECTION_DESTROYED", options));
    if (stream)
      return queryError(q, Errors.generic("COPY_IN_PROGRESS", "You cannot execute queries during copy"));
    if (q.cancelled)
      return;
    try {
      q.state = backend;
      query ? sent.push(q) : (query = q, query.active = true);
      build(q);
      return write(toBuffer(q)) && !q.describeFirst && !q.cursorFn && sent.length < max_pipeline && (!q.options.onexecute || q.options.onexecute(connection2));
    } catch (error2) {
      sent.length === 0 && write(Sync);
      errored(error2);
      return true;
    }
  }
  function toBuffer(q) {
    if (q.parameters.length >= 65534)
      throw Errors.generic("MAX_PARAMETERS_EXCEEDED", "Max number of parameters (65534) exceeded");
    return q.options.simple ? bytes_default().Q().str(q.statement.string + bytes_default.N).end() : q.describeFirst ? Buffer.concat([describe(q), Flush]) : q.prepare ? q.prepared ? prepared(q) : Buffer.concat([describe(q), prepared(q)]) : unnamed(q);
  }
  function describe(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types, q.statement.name),
      Describe("S", q.statement.name)
    ]);
  }
  function prepared(q) {
    return Buffer.concat([
      Bind(q.parameters, q.statement.types, q.statement.name, q.cursorName),
      q.cursorFn ? Execute("", q.cursorRows) : ExecuteUnnamed
    ]);
  }
  function unnamed(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types),
      DescribeUnnamed,
      prepared(q)
    ]);
  }
  function build(q) {
    const parameters = [], types2 = [];
    const string = stringify(q, q.strings[0], q.args[0], parameters, types2, options);
    !q.tagged && q.args.forEach((x) => handleValue(x, parameters, types2, options));
    q.prepare = options.prepare && ("prepare" in q.options ? q.options.prepare : true);
    q.string = string;
    q.signature = q.prepare && types2 + string;
    q.onlyDescribe && delete statements[q.signature];
    q.parameters = q.parameters || parameters;
    q.prepared = q.prepare && q.signature in statements;
    q.describeFirst = q.onlyDescribe || parameters.length && !q.prepared;
    q.statement = q.prepared ? statements[q.signature] : { string, types: types2, name: q.prepare ? statementId + statementCount++ : "" };
    typeof options.debug === "function" && options.debug(id, string, parameters, types2);
  }
  function write(x, fn) {
    chunk = chunk ? Buffer.concat([chunk, x]) : Buffer.from(x);
    if (fn || chunk.length >= 1024)
      return nextWrite(fn);
    nextWriteTimer === null && (nextWriteTimer = setImmediate(nextWrite));
    return true;
  }
  function nextWrite(fn) {
    const x = socket.write(chunk, fn);
    nextWriteTimer !== null && clearImmediate(nextWriteTimer);
    chunk = nextWriteTimer = null;
    return x;
  }
  function connectTimedOut() {
    errored(Errors.connection("CONNECT_TIMEOUT", options, socket));
    socket.destroy();
  }
  async function secure() {
    if (sslnegotiation !== "direct") {
      write(SSLRequest);
      const canSSL = await new Promise((r) => socket.once("data", (x) => r(x[0] === 83)));
      if (!canSSL && ssl === "prefer")
        return connected();
    }
    const options2 = {
      socket,
      servername: net.isIP(socket.host) ? void 0 : socket.host
    };
    if (sslnegotiation === "direct")
      options2.ALPNProtocols = ["postgresql"];
    if (ssl === "require" || ssl === "allow" || ssl === "prefer")
      options2.rejectUnauthorized = false;
    else if (typeof ssl === "object")
      Object.assign(options2, ssl);
    socket.removeAllListeners();
    socket = tls.connect(options2);
    socket.on("secureConnect", connected);
    socket.on("error", error);
    socket.on("close", closed);
    socket.on("drain", drain);
  }
  function drain() {
    !query && onopen(connection2);
  }
  function data(x) {
    if (incomings) {
      incomings.push(x);
      remaining -= x.length;
      if (remaining > 0)
        return;
    }
    incoming = incomings ? Buffer.concat(incomings, length - remaining) : incoming.length === 0 ? x : Buffer.concat([incoming, x], incoming.length + x.length);
    while (incoming.length > 4) {
      length = incoming.readUInt32BE(1);
      if (length >= incoming.length) {
        remaining = length - incoming.length;
        incomings = [incoming];
        break;
      }
      try {
        handle(incoming.subarray(0, length + 1));
      } catch (e) {
        query && (query.cursorFn || query.describeFirst) && write(Sync);
        errored(e);
      }
      incoming = incoming.subarray(length + 1);
      remaining = 0;
      incomings = null;
    }
  }
  async function connect() {
    terminated = false;
    backendParameters = {};
    socket || (socket = await createSocket());
    if (!socket)
      return;
    connectTimer.start();
    if (options.socket)
      return ssl ? secure() : connected();
    socket.on("connect", ssl ? secure : connected);
    if (options.path)
      return socket.connect(options.path);
    socket.ssl = ssl;
    socket.connect(port[hostIndex], host[hostIndex]);
    socket.host = host[hostIndex];
    socket.port = port[hostIndex];
    hostIndex = (hostIndex + 1) % port.length;
  }
  function reconnect() {
    setTimeout(connect, closedTime ? Math.max(0, closedTime + delay - performance.now()) : 0);
  }
  function connected() {
    try {
      statements = {};
      needsTypes = options.fetch_types;
      statementId = Math.random().toString(36).slice(2);
      statementCount = 1;
      lifeTimer.start();
      socket.on("data", data);
      keep_alive && socket.setKeepAlive && socket.setKeepAlive(true, 1e3 * keep_alive);
      const s = StartupMessage();
      write(s);
    } catch (err) {
      error(err);
    }
  }
  function error(err) {
    if (connection2.queue === queues.connecting && options.host[retries + 1])
      return;
    errored(err);
    while (sent.length)
      queryError(sent.shift(), err);
  }
  function errored(err) {
    stream && (stream.destroy(err), stream = null);
    query && queryError(query, err);
    initial && (queryError(initial, err), initial = null);
  }
  function queryError(query2, err) {
    if (query2.reserve)
      return query2.reject(err);
    if (!err || typeof err !== "object")
      err = new Error(err);
    "query" in err || "parameters" in err || Object.defineProperties(err, {
      stack: { value: err.stack + query2.origin.replace(/.*\n/, "\n"), enumerable: options.debug },
      query: { value: query2.string, enumerable: options.debug },
      parameters: { value: query2.parameters, enumerable: options.debug },
      args: { value: query2.args, enumerable: options.debug },
      types: { value: query2.statement && query2.statement.types, enumerable: options.debug }
    });
    query2.reject(err);
  }
  function end() {
    return ending || (!connection2.reserved && onend(connection2), !connection2.reserved && !initial && !query && sent.length === 0 ? (terminate(), new Promise((r) => socket && socket.readyState !== "closed" ? socket.once("close", r) : r())) : ending = new Promise((r) => ended = r));
  }
  function terminate() {
    terminated = true;
    if (stream || query || initial || sent.length)
      error(Errors.connection("CONNECTION_DESTROYED", options));
    clearImmediate(nextWriteTimer);
    if (socket) {
      socket.removeListener("data", data);
      socket.removeListener("connect", connected);
      socket.readyState === "open" && socket.end(bytes_default().X().end());
    }
    ended && (ended(), ending = ended = null);
  }
  async function closed(hadError) {
    incoming = Buffer.alloc(0);
    remaining = 0;
    incomings = null;
    clearImmediate(nextWriteTimer);
    socket.removeListener("data", data);
    socket.removeListener("connect", connected);
    idleTimer.cancel();
    lifeTimer.cancel();
    connectTimer.cancel();
    socket.removeAllListeners();
    socket = null;
    if (initial)
      return reconnect();
    !hadError && (query || sent.length) && error(Errors.connection("CONNECTION_CLOSED", options, socket));
    closedTime = performance.now();
    hadError && options.shared.retries++;
    delay = (typeof backoff2 === "function" ? backoff2(options.shared.retries) : backoff2) * 1e3;
    onclose(connection2, Errors.connection("CONNECTION_CLOSED", options, socket));
  }
  function handle(xs, x = xs[0]) {
    (x === 68 ? DataRow : (
      // D
      x === 100 ? CopyData : (
        // d
        x === 65 ? NotificationResponse : (
          // A
          x === 83 ? ParameterStatus : (
            // S
            x === 90 ? ReadyForQuery : (
              // Z
              x === 67 ? CommandComplete : (
                // C
                x === 50 ? BindComplete : (
                  // 2
                  x === 49 ? ParseComplete : (
                    // 1
                    x === 116 ? ParameterDescription : (
                      // t
                      x === 84 ? RowDescription : (
                        // T
                        x === 82 ? Authentication : (
                          // R
                          x === 110 ? NoData : (
                            // n
                            x === 75 ? BackendKeyData : (
                              // K
                              x === 69 ? ErrorResponse : (
                                // E
                                x === 115 ? PortalSuspended : (
                                  // s
                                  x === 51 ? CloseComplete : (
                                    // 3
                                    x === 71 ? CopyInResponse : (
                                      // G
                                      x === 78 ? NoticeResponse : (
                                        // N
                                        x === 72 ? CopyOutResponse : (
                                          // H
                                          x === 99 ? CopyDone : (
                                            // c
                                            x === 73 ? EmptyQueryResponse : (
                                              // I
                                              x === 86 ? FunctionCallResponse : (
                                                // V
                                                x === 118 ? NegotiateProtocolVersion : (
                                                  // v
                                                  x === 87 ? CopyBothResponse : (
                                                    // W
                                                    /* c8 ignore next */
                                                    UnknownMessage
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ))(xs);
  }
  function DataRow(x) {
    let index = 7;
    let length2;
    let column;
    let value;
    const row = query.isRaw ? new Array(query.statement.columns.length) : {};
    for (let i = 0; i < query.statement.columns.length; i++) {
      column = query.statement.columns[i];
      length2 = x.readInt32BE(index);
      index += 4;
      value = length2 === -1 ? null : query.isRaw === true ? x.subarray(index, index += length2) : column.parser === void 0 ? x.toString("utf8", index, index += length2) : column.parser.array === true ? column.parser(x.toString("utf8", index + 1, index += length2)) : column.parser(x.toString("utf8", index, index += length2));
      query.isRaw ? row[i] = query.isRaw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
    }
    query.forEachFn ? query.forEachFn(transform.row.from ? transform.row.from(row) : row, result) : result[rows++] = transform.row.from ? transform.row.from(row) : row;
  }
  function ParameterStatus(x) {
    const [k, v] = x.toString("utf8", 5, x.length - 1).split(bytes_default.N);
    backendParameters[k] = v;
    if (options.parameters[k] !== v) {
      options.parameters[k] = v;
      onparameter && onparameter(k, v);
    }
  }
  function ReadyForQuery(x) {
    if (query) {
      if (errorResponse) {
        query.retried ? errored(query.retried) : query.prepared && retryRoutines.has(errorResponse.routine) ? retry(query, errorResponse) : errored(errorResponse);
      } else {
        query.resolve(results || result);
      }
    } else if (errorResponse) {
      errored(errorResponse);
    }
    query = results = errorResponse = null;
    result = new Result();
    connectTimer.cancel();
    if (initial) {
      if (target_session_attrs) {
        if (!backendParameters.in_hot_standby || !backendParameters.default_transaction_read_only)
          return fetchState();
        else if (tryNext(target_session_attrs, backendParameters))
          return terminate();
      }
      if (needsTypes) {
        initial.reserve && (initial = null);
        return fetchArrayTypes();
      }
      initial && !initial.reserve && execute(initial);
      options.shared.retries = retries = 0;
      initial = null;
      return;
    }
    while (sent.length && (query = sent.shift()) && (query.active = true, query.cancelled))
      Connection(options).cancel(query.state, query.cancelled.resolve, query.cancelled.reject);
    if (query)
      return;
    connection2.reserved ? !connection2.reserved.release && x[5] === 73 ? ending ? terminate() : (connection2.reserved = null, onopen(connection2)) : connection2.reserved() : ending ? terminate() : onopen(connection2);
  }
  function CommandComplete(x) {
    rows = 0;
    for (let i = x.length - 1; i > 0; i--) {
      if (x[i] === 32 && x[i + 1] < 58 && result.count === null)
        result.count = +x.toString("utf8", i + 1, x.length - 1);
      if (x[i - 1] >= 65) {
        result.command = x.toString("utf8", 5, i);
        result.state = backend;
        break;
      }
    }
    final && (final(), final = null);
    if (result.command === "BEGIN" && max !== 1 && !connection2.reserved)
      return errored(Errors.generic("UNSAFE_TRANSACTION", "Only use sql.begin, sql.reserved or max: 1"));
    if (query.options.simple)
      return BindComplete();
    if (query.cursorFn) {
      result.count && query.cursorFn(result);
      write(Sync);
    }
  }
  function ParseComplete() {
    query.parsing = false;
  }
  function BindComplete() {
    !result.statement && (result.statement = query.statement);
    result.columns = query.statement.columns;
  }
  function ParameterDescription(x) {
    const length2 = x.readUInt16BE(5);
    for (let i = 0; i < length2; ++i)
      !query.statement.types[i] && (query.statement.types[i] = x.readUInt32BE(7 + i * 4));
    query.prepare && (statements[query.signature] = query.statement);
    query.describeFirst && !query.onlyDescribe && (write(prepared(query)), query.describeFirst = false);
  }
  function RowDescription(x) {
    if (result.command) {
      results = results || [result];
      results.push(result = new Result());
      result.count = null;
      query.statement.columns = null;
    }
    const length2 = x.readUInt16BE(5);
    let index = 7;
    let start;
    query.statement.columns = Array(length2);
    for (let i = 0; i < length2; ++i) {
      start = index;
      while (x[index++] !== 0) ;
      const table = x.readUInt32BE(index);
      const number = x.readUInt16BE(index + 4);
      const type = x.readUInt32BE(index + 6);
      query.statement.columns[i] = {
        name: transform.column.from ? transform.column.from(x.toString("utf8", start, index - 1)) : x.toString("utf8", start, index - 1),
        parser: parsers2[type],
        table,
        number,
        type
      };
      index += 18;
    }
    result.statement = query.statement;
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  async function Authentication(x, type = x.readUInt32BE(5)) {
    (type === 3 ? AuthenticationCleartextPassword : type === 5 ? AuthenticationMD5Password : type === 10 ? SASL : type === 11 ? SASLContinue : type === 12 ? SASLFinal : type !== 0 ? UnknownAuth : noop)(x, type);
  }
  async function AuthenticationCleartextPassword() {
    const payload = await Pass();
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  async function AuthenticationMD5Password(x) {
    const payload = "md5" + await md5(
      Buffer.concat([
        Buffer.from(await md5(await Pass() + user)),
        x.subarray(9)
      ])
    );
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  async function SASL() {
    nonce = (await crypto3.randomBytes(18)).toString("base64");
    bytes_default().p().str("SCRAM-SHA-256" + bytes_default.N);
    const i = bytes_default.i;
    write(bytes_default.inc(4).str("n,,n=*,r=" + nonce).i32(bytes_default.i - i - 4, i).end());
  }
  async function SASLContinue(x) {
    const res = x.toString("utf8", 9).split(",").reduce((acc, x2) => (acc[x2[0]] = x2.slice(2), acc), {});
    const saltedPassword = await crypto3.pbkdf2Sync(
      await Pass(),
      Buffer.from(res.s, "base64"),
      parseInt(res.i),
      32,
      "sha256"
    );
    const clientKey = await hmac(saltedPassword, "Client Key");
    const auth = "n=*,r=" + nonce + ",r=" + res.r + ",s=" + res.s + ",i=" + res.i + ",c=biws,r=" + res.r;
    serverSignature = (await hmac(await hmac(saltedPassword, "Server Key"), auth)).toString("base64");
    const payload = "c=biws,r=" + res.r + ",p=" + xor(
      clientKey,
      Buffer.from(await hmac(await sha2562(clientKey), auth))
    ).toString("base64");
    write(
      bytes_default().p().str(payload).end()
    );
  }
  function SASLFinal(x) {
    if (x.toString("utf8", 9).split(bytes_default.N, 1)[0].slice(2) === serverSignature)
      return;
    errored(Errors.generic("SASL_SIGNATURE_MISMATCH", "The server did not return the correct signature"));
    socket.destroy();
  }
  function Pass() {
    return Promise.resolve(
      typeof options.pass === "function" ? options.pass() : options.pass
    );
  }
  function NoData() {
    result.statement = query.statement;
    result.statement.columns = [];
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  function BackendKeyData(x) {
    backend.pid = x.readUInt32BE(5);
    backend.secret = x.readUInt32BE(9);
  }
  async function fetchArrayTypes() {
    needsTypes = false;
    const types2 = await new Query([`
      select b.oid, b.typarray
      from pg_catalog.pg_type a
      left join pg_catalog.pg_type b on b.oid = a.typelem
      where a.typcategory = 'A'
      group by b.oid, b.typarray
      order by b.oid
    `], [], execute);
    types2.forEach(({ oid, typarray }) => addArrayType(oid, typarray));
  }
  function addArrayType(oid, typarray) {
    if (!!options.parsers[typarray] && !!options.serializers[typarray]) return;
    const parser = options.parsers[oid];
    options.shared.typeArrayMap[oid] = typarray;
    options.parsers[typarray] = (xs) => arrayParser(xs, parser, typarray);
    options.parsers[typarray].array = true;
    options.serializers[typarray] = (xs) => arraySerializer(xs, options.serializers[oid], options, typarray);
  }
  function tryNext(x, xs) {
    return x === "read-write" && xs.default_transaction_read_only === "on" || x === "read-only" && xs.default_transaction_read_only === "off" || x === "primary" && xs.in_hot_standby === "on" || x === "standby" && xs.in_hot_standby === "off" || x === "prefer-standby" && xs.in_hot_standby === "off" && options.host[retries];
  }
  function fetchState() {
    const query2 = new Query([`
      show transaction_read_only;
      select pg_catalog.pg_is_in_recovery()
    `], [], execute, null, { simple: true });
    query2.resolve = ([[a], [b2]]) => {
      backendParameters.default_transaction_read_only = a.transaction_read_only;
      backendParameters.in_hot_standby = b2.pg_is_in_recovery ? "on" : "off";
    };
    query2.execute();
  }
  function ErrorResponse(x) {
    if (query) {
      (query.cursorFn || query.describeFirst) && write(Sync);
      errorResponse = Errors.postgres(parseError(x));
    } else {
      errored(Errors.postgres(parseError(x)));
    }
  }
  function retry(q, error2) {
    delete statements[q.signature];
    q.retried = error2;
    execute(q);
  }
  function NotificationResponse(x) {
    if (!onnotify)
      return;
    let index = 9;
    while (x[index++] !== 0) ;
    onnotify(
      x.toString("utf8", 9, index - 1),
      x.toString("utf8", index, x.length - 1)
    );
  }
  async function PortalSuspended() {
    try {
      const x = await Promise.resolve(query.cursorFn(result));
      rows = 0;
      x === CLOSE ? write(Close(query.portal)) : (result = new Result(), write(Execute("", query.cursorRows)));
    } catch (err) {
      write(Sync);
      query.reject(err);
    }
  }
  function CloseComplete() {
    result.count && query.cursorFn(result);
    query.resolve(result);
  }
  function CopyInResponse() {
    stream = new Stream.Writable({
      autoDestroy: true,
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
        stream = null;
      }
    });
    query.resolve(stream);
  }
  function CopyOutResponse() {
    stream = new Stream.Readable({
      read() {
        socket.resume();
      }
    });
    query.resolve(stream);
  }
  function CopyBothResponse() {
    stream = new Stream.Duplex({
      autoDestroy: true,
      read() {
        socket.resume();
      },
      /* c8 ignore next 11 */
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream);
  }
  function CopyData(x) {
    stream && (stream.push(x.subarray(5)) || socket.pause());
  }
  function CopyDone() {
    stream && stream.push(null);
    stream = null;
  }
  function NoticeResponse(x) {
    onnotice ? onnotice(parseError(x)) : console.log(parseError(x));
  }
  function EmptyQueryResponse() {
  }
  function FunctionCallResponse() {
    errored(Errors.notSupported("FunctionCallResponse"));
  }
  function NegotiateProtocolVersion() {
    errored(Errors.notSupported("NegotiateProtocolVersion"));
  }
  function UnknownMessage(x) {
    console.error("Postgres.js : Unknown Message:", x[0]);
  }
  function UnknownAuth(x, type) {
    console.error("Postgres.js : Unknown Auth:", type);
  }
  function Bind(parameters, types2, statement = "", portal = "") {
    let prev, type;
    bytes_default().B().str(portal + bytes_default.N).str(statement + bytes_default.N).i16(0).i16(parameters.length);
    parameters.forEach((x, i) => {
      if (x === null)
        return bytes_default.i32(4294967295);
      type = types2[i];
      parameters[i] = x = type in options.serializers ? options.serializers[type](x) : "" + x;
      prev = bytes_default.i;
      bytes_default.inc(4).str(x).i32(bytes_default.i - prev - 4, prev);
    });
    bytes_default.i16(0);
    return bytes_default.end();
  }
  function Parse(str2, parameters, types2, name = "") {
    bytes_default().P().str(name + bytes_default.N).str(str2 + bytes_default.N).i16(parameters.length);
    parameters.forEach((x, i) => bytes_default.i32(types2[i] || 0));
    return bytes_default.end();
  }
  function Describe(x, name = "") {
    return bytes_default().D().str(x).str(name + bytes_default.N).end();
  }
  function Execute(portal = "", rows2 = 0) {
    return Buffer.concat([
      bytes_default().E().str(portal + bytes_default.N).i32(rows2).end(),
      Flush
    ]);
  }
  function Close(portal = "") {
    return Buffer.concat([
      bytes_default().C().str("P").str(portal + bytes_default.N).end(),
      bytes_default().S().end()
    ]);
  }
  function StartupMessage() {
    return cancelMessage || bytes_default().inc(4).i16(3).z(2).str(
      Object.entries(Object.assign(
        {
          user,
          database,
          client_encoding: "UTF8"
        },
        options.connection
      )).filter(([, v]) => v).map(([k, v]) => k + bytes_default.N + v).join(bytes_default.N)
    ).z(2).end(0);
  }
}
function parseError(x) {
  const error = {};
  let start = 5;
  for (let i = 5; i < x.length - 1; i++) {
    if (x[i] === 0) {
      error[errorFields[x[start]]] = x.toString("utf8", start + 1, i);
      start = i + 1;
    }
  }
  return error;
}
function md5(x) {
  return crypto3.createHash("md5").update(x).digest("hex");
}
function hmac(key, x) {
  return crypto3.createHmac("sha256", key).update(x).digest();
}
function sha2562(x) {
  return crypto3.createHash("sha256").update(x).digest();
}
function xor(a, b2) {
  const length = Math.max(a.length, b2.length);
  const buffer2 = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++)
    buffer2[i] = a[i] ^ b2[i];
  return buffer2;
}
function timer(fn, seconds) {
  seconds = typeof seconds === "function" ? seconds() : seconds;
  if (!seconds)
    return { cancel: noop, start: noop };
  let timer2;
  return {
    cancel() {
      timer2 && (clearTimeout(timer2), timer2 = null);
    },
    start() {
      timer2 && clearTimeout(timer2);
      timer2 = setTimeout(done, seconds * 1e3, arguments);
    }
  };
  function done(args) {
    fn.apply(null, args);
    timer2 = null;
  }
}

// node_modules/postgres/src/subscribe.js
var noop2 = () => {
};
function Subscribe(postgres2, options) {
  const subscribers = /* @__PURE__ */ new Map(), slot = "postgresjs_" + Math.random().toString(36).slice(2), state = {};
  let connection2, stream, ended = false;
  const sql2 = subscribe.sql = postgres2({
    ...options,
    transform: { column: {}, value: {}, row: {} },
    max: 1,
    fetch_types: false,
    idle_timeout: null,
    max_lifetime: null,
    connection: {
      ...options.connection,
      replication: "database"
    },
    onclose: async function() {
      if (ended)
        return;
      stream = null;
      state.pid = state.secret = void 0;
      connected(await init(sql2, slot, options.publications));
      subscribers.forEach((event) => event.forEach(({ onsubscribe }) => onsubscribe()));
    },
    no_subscribe: true
  });
  const end = sql2.end, close = sql2.close;
  sql2.end = async () => {
    ended = true;
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return end();
  };
  sql2.close = async () => {
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return close();
  };
  return subscribe;
  async function subscribe(event, fn, onsubscribe = noop2, onerror = noop2) {
    event = parseEvent(event);
    if (!connection2)
      connection2 = init(sql2, slot, options.publications);
    const subscriber = { fn, onsubscribe };
    const fns = subscribers.has(event) ? subscribers.get(event).add(subscriber) : subscribers.set(event, /* @__PURE__ */ new Set([subscriber])).get(event);
    const unsubscribe = () => {
      fns.delete(subscriber);
      fns.size === 0 && subscribers.delete(event);
    };
    return connection2.then((x) => {
      connected(x);
      onsubscribe();
      stream && stream.on("error", onerror);
      return { unsubscribe, state, sql: sql2 };
    });
  }
  function connected(x) {
    stream = x.stream;
    state.pid = x.state.pid;
    state.secret = x.state.secret;
  }
  async function init(sql3, slot2, publications) {
    if (!publications)
      throw new Error("Missing publication names");
    const xs = await sql3.unsafe(
      `CREATE_REPLICATION_SLOT ${slot2} TEMPORARY LOGICAL pgoutput NOEXPORT_SNAPSHOT`
    );
    const [x] = xs;
    const stream2 = await sql3.unsafe(
      `START_REPLICATION SLOT ${slot2} LOGICAL ${x.consistent_point} (proto_version '1', publication_names '${publications}')`
    ).writable();
    const state2 = {
      lsn: Buffer.concat(x.consistent_point.split("/").map((x2) => Buffer.from(("00000000" + x2).slice(-8), "hex")))
    };
    stream2.on("data", data);
    stream2.on("error", error);
    stream2.on("close", sql3.close);
    return { stream: stream2, state: xs.state };
    function error(e) {
      console.error("Unexpected error during logical streaming - reconnecting", e);
    }
    function data(x2) {
      if (x2[0] === 119) {
        parse2(x2.subarray(25), state2, sql3.options.parsers, handle, options.transform);
      } else if (x2[0] === 107 && x2[17]) {
        state2.lsn = x2.subarray(1, 9);
        pong();
      }
    }
    function handle(a, b2) {
      const path = b2.relation.schema + "." + b2.relation.table;
      call("*", a, b2);
      call("*:" + path, a, b2);
      b2.relation.keys.length && call("*:" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
      call(b2.command, a, b2);
      call(b2.command + ":" + path, a, b2);
      b2.relation.keys.length && call(b2.command + ":" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
    }
    function pong() {
      const x2 = Buffer.alloc(34);
      x2[0] = "r".charCodeAt(0);
      x2.fill(state2.lsn, 1);
      x2.writeBigInt64BE(BigInt(Date.now() - Date.UTC(2e3, 0, 1)) * BigInt(1e3), 25);
      stream2.write(x2);
    }
  }
  function call(x, a, b2) {
    subscribers.has(x) && subscribers.get(x).forEach(({ fn }) => fn(a, b2, x));
  }
}
function Time(x) {
  return new Date(Date.UTC(2e3, 0, 1) + Number(x / BigInt(1e3)));
}
function parse2(x, state, parsers2, handle, transform) {
  const char = (acc, [k, v]) => (acc[k.charCodeAt(0)] = v, acc);
  Object.entries({
    R: (x2) => {
      let i = 1;
      const r = state[x2.readUInt32BE(i)] = {
        schema: x2.toString("utf8", i += 4, i = x2.indexOf(0, i)) || "pg_catalog",
        table: x2.toString("utf8", i + 1, i = x2.indexOf(0, i + 1)),
        columns: Array(x2.readUInt16BE(i += 2)),
        keys: []
      };
      i += 2;
      let columnIndex = 0, column;
      while (i < x2.length) {
        column = r.columns[columnIndex++] = {
          key: x2[i++],
          name: transform.column.from ? transform.column.from(x2.toString("utf8", i, i = x2.indexOf(0, i))) : x2.toString("utf8", i, i = x2.indexOf(0, i)),
          type: x2.readUInt32BE(i += 1),
          parser: parsers2[x2.readUInt32BE(i)],
          atttypmod: x2.readUInt32BE(i += 4)
        };
        column.key && r.keys.push(column);
        i += 4;
      }
    },
    Y: () => {
    },
    // Type
    O: () => {
    },
    // Origin
    B: (x2) => {
      state.date = Time(x2.readBigInt64BE(9));
      state.lsn = x2.subarray(1, 9);
    },
    I: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      const { row } = tuples(x2, relation.columns, i += 7, transform);
      handle(row, {
        command: "insert",
        relation
      });
    },
    D: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      handle(
        key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform).row : null,
        {
          command: "delete",
          relation,
          key
        }
      );
    },
    U: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      const xs = key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform) : null;
      xs && (i = xs.i);
      const { row } = tuples(x2, relation.columns, i + 3, transform);
      handle(row, {
        command: "update",
        relation,
        key,
        old: xs && xs.row
      });
    },
    T: () => {
    },
    // Truncate,
    C: () => {
    }
    // Commit
  }).reduce(char, {})[x[0]](x);
}
function tuples(x, columns, xi, transform) {
  let type, column, value;
  const row = transform.raw ? new Array(columns.length) : {};
  for (let i = 0; i < columns.length; i++) {
    type = x[xi++];
    column = columns[i];
    value = type === 110 ? null : type === 117 ? void 0 : column.parser === void 0 ? x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)) : column.parser.array === true ? column.parser(x.toString("utf8", xi + 5, xi += 4 + x.readUInt32BE(xi))) : column.parser(x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)));
    transform.raw ? row[i] = transform.raw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
  }
  return { i: xi, row: transform.row.from ? transform.row.from(row) : row };
}
function parseEvent(x) {
  const xs = x.match(/^(\*|insert|update|delete)?:?([^.]+?\.?[^=]+)?=?(.+)?/i) || [];
  if (!xs)
    throw new Error("Malformed subscribe pattern: " + x);
  const [, command, path, key] = xs;
  return (command || "*") + (path ? ":" + (path.indexOf(".") === -1 ? "public." + path : path) : "") + (key ? "=" + key : "");
}

// node_modules/postgres/src/large.js
import Stream2 from "stream";
function largeObject(sql2, oid, mode = 131072 | 262144) {
  return new Promise(async (resolve, reject) => {
    await sql2.begin(async (sql3) => {
      let finish;
      !oid && ([{ oid }] = await sql3`select lo_creat(-1) as oid`);
      const [{ fd }] = await sql3`select lo_open(${oid}, ${mode}) as fd`;
      const lo = {
        writable,
        readable,
        close: () => sql3`select lo_close(${fd})`.then(finish),
        tell: () => sql3`select lo_tell64(${fd})`,
        read: (x) => sql3`select loread(${fd}, ${x}) as data`,
        write: (x) => sql3`select lowrite(${fd}, ${x})`,
        truncate: (x) => sql3`select lo_truncate64(${fd}, ${x})`,
        seek: (x, whence = 0) => sql3`select lo_lseek64(${fd}, ${x}, ${whence})`,
        size: () => sql3`
          select
            lo_lseek64(${fd}, location, 0) as position,
            seek.size
          from (
            select
              lo_lseek64($1, 0, 2) as size,
              tell.location
            from (select lo_tell64($1) as location) tell
          ) seek
        `
      };
      resolve(lo);
      return new Promise(async (r) => finish = r);
      async function readable({
        highWaterMark = 2048 * 8,
        start = 0,
        end = Infinity
      } = {}) {
        let max = end - start;
        start && await lo.seek(start);
        return new Stream2.Readable({
          highWaterMark,
          async read(size2) {
            const l = size2 > max ? size2 - max : size2;
            max -= size2;
            const [{ data }] = await lo.read(l);
            this.push(data);
            if (data.length < size2)
              this.push(null);
          }
        });
      }
      async function writable({
        highWaterMark = 2048 * 8,
        start = 0
      } = {}) {
        start && await lo.seek(start);
        return new Stream2.Writable({
          highWaterMark,
          write(chunk, encoding, callback) {
            lo.write(chunk).then(() => callback(), callback);
          }
        });
      }
    }).catch(reject);
  });
}

// node_modules/postgres/src/index.js
Object.assign(Postgres, {
  PostgresError,
  toPascal,
  pascal,
  toCamel,
  camel,
  toKebab,
  kebab,
  fromPascal,
  fromCamel,
  fromKebab,
  BigInt: {
    to: 20,
    from: [20],
    parse: (x) => BigInt(x),
    // eslint-disable-line
    serialize: (x) => x.toString()
  }
});
var src_default = Postgres;
function Postgres(a, b2) {
  const options = parseOptions(a, b2), subscribe = options.no_subscribe || Subscribe(Postgres, { ...options });
  let ending = false;
  const queries = queue_default(), connecting = queue_default(), reserved = queue_default(), closed = queue_default(), ended = queue_default(), open = queue_default(), busy = queue_default(), full = queue_default(), queues = { connecting, reserved, closed, ended, open, busy, full };
  const connections = [...Array(options.max)].map(() => connection_default(options, queues, { onopen, onend, onclose }));
  const sql2 = Sql(handler);
  Object.assign(sql2, {
    get parameters() {
      return options.parameters;
    },
    largeObject: largeObject.bind(null, sql2),
    subscribe,
    CLOSE,
    END: CLOSE,
    PostgresError,
    options,
    reserve,
    listen,
    begin,
    close,
    end
  });
  return sql2;
  function Sql(handler2) {
    handler2.debug = options.debug;
    Object.entries(options.types).reduce((acc, [name, type]) => {
      acc[name] = (x) => new Parameter(x, type.to);
      return acc;
    }, typed);
    Object.assign(sql3, {
      types: typed,
      typed,
      unsafe,
      notify,
      array,
      json,
      file
    });
    return sql3;
    function typed(value, type) {
      return new Parameter(value, type);
    }
    function sql3(strings, ...args) {
      const query = strings && Array.isArray(strings.raw) ? new Query(strings, args, handler2, cancel) : typeof strings === "string" && !args.length ? new Identifier(options.transform.column.to ? options.transform.column.to(strings) : strings) : new Builder(strings, args);
      return query;
    }
    function unsafe(string, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([string], args, handler2, cancel, {
        prepare: false,
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
    function file(path, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([], args, (query2) => {
        fs.readFile(path, "utf8", (err, string) => {
          if (err)
            return query2.reject(err);
          query2.strings = [string];
          handler2(query2);
        });
      }, cancel, {
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
  }
  async function listen(name, fn, onlisten) {
    const listener = { fn, onlisten };
    const sql3 = listen.sql || (listen.sql = Postgres({
      ...options,
      max: 1,
      idle_timeout: null,
      max_lifetime: null,
      fetch_types: false,
      onclose() {
        Object.entries(listen.channels).forEach(([name2, { listeners }]) => {
          delete listen.channels[name2];
          Promise.all(listeners.map((l) => listen(name2, l.fn, l.onlisten).catch(() => {
          })));
        });
      },
      onnotify(c, x) {
        c in listen.channels && listen.channels[c].listeners.forEach((l) => l.fn(x));
      }
    }));
    const channels = listen.channels || (listen.channels = {}), exists = name in channels;
    if (exists) {
      channels[name].listeners.push(listener);
      const result2 = await channels[name].result;
      listener.onlisten && listener.onlisten();
      return { state: result2.state, unlisten };
    }
    channels[name] = { result: sql3`listen ${sql3.unsafe('"' + name.replace(/"/g, '""') + '"')}`, listeners: [listener] };
    const result = await channels[name].result;
    listener.onlisten && listener.onlisten();
    return { state: result.state, unlisten };
    async function unlisten() {
      if (name in channels === false)
        return;
      channels[name].listeners = channels[name].listeners.filter((x) => x !== listener);
      if (channels[name].listeners.length)
        return;
      delete channels[name];
      return sql3`unlisten ${sql3.unsafe('"' + name.replace(/"/g, '""') + '"')}`;
    }
  }
  async function notify(channel, payload) {
    return await sql2`select pg_notify(${channel}, ${"" + payload})`;
  }
  async function reserve() {
    const queue = queue_default();
    const c = open.length ? open.shift() : await new Promise((resolve, reject) => {
      const query = { reserve: resolve, reject };
      queries.push(query);
      closed.length && connect(closed.shift(), query);
    });
    move(c, reserved);
    c.reserved = () => queue.length ? c.execute(queue.shift()) : move(c, reserved);
    c.reserved.release = true;
    const sql3 = Sql(handler2);
    sql3.release = () => {
      c.reserved = null;
      onopen(c);
    };
    return sql3;
    function handler2(q) {
      c.queue === full ? queue.push(q) : c.execute(q) || move(c, full);
    }
  }
  async function begin(options2, fn) {
    !fn && (fn = options2, options2 = "");
    const queries2 = queue_default();
    let savepoints = 0, connection2, prepare = null;
    try {
      await sql2.unsafe("begin " + options2.replace(/[^a-z ]/ig, ""), [], { onexecute }).execute();
      return await Promise.race([
        scope(connection2, fn),
        new Promise((_, reject) => connection2.onclose = reject)
      ]);
    } catch (error) {
      throw error;
    }
    async function scope(c, fn2, name) {
      const sql3 = Sql(handler2);
      sql3.savepoint = savepoint;
      sql3.prepare = (x) => prepare = x.replace(/[^a-z0-9$-_. ]/gi);
      let uncaughtError, result;
      name && await sql3`savepoint ${sql3(name)}`;
      try {
        result = await new Promise((resolve, reject) => {
          const x = fn2(sql3);
          Promise.resolve(Array.isArray(x) ? Promise.all(x) : x).then(resolve, reject);
        });
        if (uncaughtError)
          throw uncaughtError;
      } catch (e) {
        await (name ? sql3`rollback to ${sql3(name)}` : sql3`rollback`);
        throw e instanceof PostgresError && e.code === "25P02" && uncaughtError || e;
      }
      if (!name) {
        prepare ? await sql3`prepare transaction '${sql3.unsafe(prepare)}'` : await sql3`commit`;
      }
      return result;
      function savepoint(name2, fn3) {
        if (name2 && Array.isArray(name2.raw))
          return savepoint((sql4) => sql4.apply(sql4, arguments));
        arguments.length === 1 && (fn3 = name2, name2 = null);
        return scope(c, fn3, "s" + savepoints++ + (name2 ? "_" + name2 : ""));
      }
      function handler2(q) {
        q.catch((e) => uncaughtError || (uncaughtError = e));
        c.queue === full ? queries2.push(q) : c.execute(q) || move(c, full);
      }
    }
    function onexecute(c) {
      connection2 = c;
      move(c, reserved);
      c.reserved = () => queries2.length ? c.execute(queries2.shift()) : move(c, reserved);
    }
  }
  function move(c, queue) {
    c.queue.remove(c);
    queue.push(c);
    c.queue = queue;
    queue === open ? c.idleTimer.start() : c.idleTimer.cancel();
    return c;
  }
  function json(x) {
    return new Parameter(x, 3802);
  }
  function array(x, type) {
    if (!Array.isArray(x))
      return array(Array.from(arguments));
    return new Parameter(x, type || (x.length ? inferType(x) || 25 : 0), options.shared.typeArrayMap);
  }
  function handler(query) {
    if (ending)
      return query.reject(Errors.connection("CONNECTION_ENDED", options, options));
    if (open.length)
      return go(open.shift(), query);
    if (closed.length)
      return connect(closed.shift(), query);
    busy.length ? go(busy.shift(), query) : queries.push(query);
  }
  function go(c, query) {
    return c.execute(query) ? move(c, busy) : move(c, full);
  }
  function cancel(query) {
    return new Promise((resolve, reject) => {
      query.state ? query.active ? connection_default(options).cancel(query.state, resolve, reject) : query.cancelled = { resolve, reject } : (queries.remove(query), query.cancelled = true, query.reject(Errors.generic("57014", "canceling statement due to user request")), resolve());
    });
  }
  async function end({ timeout = null } = {}) {
    if (ending)
      return ending;
    await 1;
    let timer2;
    return ending = Promise.race([
      new Promise((r) => timeout !== null && (timer2 = setTimeout(destroy, timeout * 1e3, r))),
      Promise.all(connections.map((c) => c.end()).concat(
        listen.sql ? listen.sql.end({ timeout: 0 }) : [],
        subscribe.sql ? subscribe.sql.end({ timeout: 0 }) : []
      ))
    ]).then(() => clearTimeout(timer2));
  }
  async function close() {
    await Promise.all(connections.map((c) => c.end()));
  }
  async function destroy(resolve) {
    await Promise.all(connections.map((c) => c.terminate()));
    while (queries.length)
      queries.shift().reject(Errors.connection("CONNECTION_DESTROYED", options));
    resolve();
  }
  function connect(c, query) {
    move(c, connecting);
    c.connect(query);
    return c;
  }
  function onend(c) {
    move(c, ended);
  }
  function onopen(c) {
    if (queries.length === 0)
      return move(c, open);
    let max = Math.ceil(queries.length / (connecting.length + 1)), ready = true;
    while (ready && queries.length && max-- > 0) {
      const query = queries.shift();
      if (query.reserve)
        return query.reserve(c);
      ready = c.execute(query);
    }
    ready ? move(c, busy) : move(c, full);
  }
  function onclose(c, e) {
    move(c, closed);
    c.reserved = null;
    c.onclose && (c.onclose(e), c.onclose = null);
    options.onclose && options.onclose(c.id);
    queries.length && connect(c, queries.shift());
  }
}
function parseOptions(a, b2) {
  if (a && a.shared)
    return a;
  const env2 = process.env, o = (!a || typeof a === "string" ? b2 : a) || {}, { url: url2, multihost } = parseUrl(a), query = [...url2.searchParams].reduce((a2, [b3, c]) => (a2[b3] = c, a2), {}), host = o.hostname || o.host || multihost || url2.hostname || env2.PGHOST || "localhost", port = o.port || url2.port || env2.PGPORT || 5432, user = o.user || o.username || url2.username || env2.PGUSERNAME || env2.PGUSER || osUsername();
  o.no_prepare && (o.prepare = false);
  query.sslmode && (query.ssl = query.sslmode, delete query.sslmode);
  "timeout" in o && (console.log("The timeout option is deprecated, use idle_timeout instead"), o.idle_timeout = o.timeout);
  query.sslrootcert === "system" && (query.ssl = "verify-full");
  const ints = ["idle_timeout", "connect_timeout", "max_lifetime", "max_pipeline", "backoff", "keep_alive"];
  const defaults = {
    max: globalThis.Cloudflare ? 3 : 10,
    ssl: false,
    sslnegotiation: null,
    idle_timeout: null,
    connect_timeout: 30,
    max_lifetime,
    max_pipeline: 100,
    backoff,
    keep_alive: 60,
    prepare: true,
    debug: false,
    fetch_types: true,
    publications: "alltables",
    target_session_attrs: null
  };
  return {
    host: Array.isArray(host) ? host : host.split(",").map((x) => x.split(":")[0]),
    port: Array.isArray(port) ? port : host.split(",").map((x) => parseInt(x.split(":")[1] || port)),
    path: o.path || host.indexOf("/") > -1 && host + "/.s.PGSQL." + port,
    database: o.database || o.db || (url2.pathname || "").slice(1) || env2.PGDATABASE || user,
    user,
    pass: o.pass || o.password || url2.password || env2.PGPASSWORD || "",
    ...Object.entries(defaults).reduce(
      (acc, [k, d]) => {
        const value = k in o ? o[k] : k in query ? query[k] === "disable" || query[k] === "false" ? false : query[k] : env2["PG" + k.toUpperCase()] || d;
        acc[k] = typeof value === "string" && ints.includes(k) ? +value : value;
        return acc;
      },
      {}
    ),
    connection: {
      application_name: env2.PGAPPNAME || "postgres.js",
      ...o.connection,
      ...Object.entries(query).reduce((acc, [k, v]) => (k in defaults || (acc[k] = v), acc), {})
    },
    types: o.types || {},
    target_session_attrs: tsa(o, url2, env2),
    onnotice: o.onnotice,
    onnotify: o.onnotify,
    onclose: o.onclose,
    onparameter: o.onparameter,
    socket: o.socket,
    transform: parseTransform(o.transform || { undefined: void 0 }),
    parameters: {},
    shared: { retries: 0, typeArrayMap: {} },
    ...mergeUserTypes(o.types)
  };
}
function tsa(o, url2, env2) {
  const x = o.target_session_attrs || url2.searchParams.get("target_session_attrs") || env2.PGTARGETSESSIONATTRS;
  if (!x || ["read-write", "read-only", "primary", "standby", "prefer-standby"].includes(x))
    return x;
  throw new Error("target_session_attrs " + x + " is not supported");
}
function backoff(retries) {
  return (0.5 + Math.random() / 2) * Math.min(3 ** retries / 100, 20);
}
function max_lifetime() {
  return 60 * (30 + Math.random() * 30);
}
function parseTransform(x) {
  return {
    undefined: x.undefined,
    column: {
      from: typeof x.column === "function" ? x.column : x.column && x.column.from,
      to: x.column && x.column.to
    },
    value: {
      from: typeof x.value === "function" ? x.value : x.value && x.value.from,
      to: x.value && x.value.to
    },
    row: {
      from: typeof x.row === "function" ? x.row : x.row && x.row.from,
      to: x.row && x.row.to
    }
  };
}
function parseUrl(url2) {
  if (!url2 || typeof url2 !== "string")
    return { url: { searchParams: /* @__PURE__ */ new Map() } };
  let host = url2;
  host = host.slice(host.indexOf("://") + 3).split(/[?/]/)[0];
  host = decodeURIComponent(host.slice(host.indexOf("@") + 1));
  const urlObj = new URL(url2.replace(host, host.split(",")[0]));
  return {
    url: {
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams
    },
    multihost: host.indexOf(",") > -1 && host
  };
}
function osUsername() {
  try {
    return os.userInfo().username;
  } catch (_) {
    return process.env.USERNAME || process.env.USER || process.env.LOGNAME;
  }
}

// server/generated/catalog.json
var catalog_default = { products: [{ slug: "5d-leather-iran-khodro-dena-plus", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0646\u0627 \u067E\u0644\u0627\u0633", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 10 }, { slug: "5d-leather-iran-khodro-tara", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u0627\u0631\u0627", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 10 }, { slug: "5d-leather-iran-khodro-soren-plus", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0631\u0646 \u067E\u0644\u0627\u0633", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 8 }, { slug: "5d-leather-iran-khodro-samand", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0645\u0646\u062F", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-iran-khodro-runna-plus", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u0627\u0646\u0627 \u067E\u0644\u0627\u0633", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-iran-khodro-reera", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u06CC \u0631\u0627", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-peugeot-206", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0698\u0648 \u06F2\u06F0\u06F6", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 10 }, { slug: "5d-leather-peugeot-207", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0698\u0648 \u06F2\u06F0\u06F7", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 9 }, { slug: "5d-leather-peugeot-pars", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0698\u0648 \u067E\u0627\u0631\u0633", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 9 }, { slug: "5d-leather-peugeot-405", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0698\u0648 \u06F4\u06F0\u06F5", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-peugeot-2008", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0698\u0648 \u06F2\u06F0\u06F0\u06F8", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-peugeot-301", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0698\u0648 \u06F3\u06F0\u06F1", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-saipa-shahin", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0634\u0627\u0647\u06CC\u0646", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 9 }, { slug: "5d-leather-saipa-quick", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0648\u06CC\u06CC\u06A9", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 8 }, { slug: "5d-leather-saipa-saina", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0627\u06CC\u0646\u0627", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-saipa-atlas", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0637\u0644\u0633", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-saipa-tiba", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u06CC\u0628\u0627", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-renault-l90", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u0646\u0648 \u0627\u0644 \u06F9\u06F0", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-renault-sandero", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u0646\u0648 \u0633\u0627\u0646\u062F\u0631\u0648", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-renault-captur", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u0646\u0648 \u06A9\u067E\u0686\u0631", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-renault-duster", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u0646\u0648 \u062F\u0627\u0633\u062A\u0631", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-rega-copa-t5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0648\u067E\u0627 T5", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-rega-copa-t7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0648\u067E\u0627 T7", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-rega-copa-t10", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0648\u067E\u0627 T10", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-kmc-j7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0627\u0645 \u0633\u06CC J7", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 8 }, { slug: "5d-leather-kmc-t8", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0627\u0645 \u0633\u06CC T8", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-kmc-k7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0627\u0645 \u0633\u06CC K7", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-mvm-x22", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u0648\u06CC \u0627\u0645 X22", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-mvm-x33", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u0648\u06CC \u0627\u0645 X33 \u06A9\u0631\u0627\u0633", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-mvm-x55", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u0648\u06CC \u0627\u0645 X55 \u067E\u0631\u0648", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-mvm-arrizo5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u0648\u06CC \u0627\u0645 \u0622\u0631\u06CC\u0632\u0648 \u06F5", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-chery-tiggo7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0686\u0631\u06CC \u062A\u06CC\u06AF\u0648 \u06F7 \u067E\u0631\u0648", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 8 }, { slug: "5d-leather-chery-tiggo8", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0686\u0631\u06CC \u062A\u06CC\u06AF\u0648 \u06F8 \u067E\u0631\u0648", category: "embroidered-leather", price: 75e5, comparePrice: 84e5, stock: 9 }, { slug: "5d-leather-chery-arrizo6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0686\u0631\u06CC \u0622\u0631\u06CC\u0632\u0648 \u06F6", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-jac-s3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u06A9 S3", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-jac-s5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u06A9 S5", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-jac-j4", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u06A9 J4", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-mg-mg6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u062C\u06CC \u06F6", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-mg-gs", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u062C\u06CC GS", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-mg-zs", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u0645 \u062C\u06CC ZS", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-geely-emgrand7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u06CC\u0644\u06CC \u0627\u0645\u06AF\u0631\u0646\u062F \u06F7", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-geely-gc6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u06CC\u0644\u06CC GC6", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-geely-azkarra", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u06CC\u0644\u06CC \u0622\u0632\u06A9\u0627\u0631\u0627", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-haima-s7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u0627\u06CC\u0645\u0627 S7", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-haima-s5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u0627\u06CC\u0645\u0627 S5", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-haima-8s", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u0627\u06CC\u0645\u0627 8S", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-brilliance-h320", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0631\u0644\u06CC\u0627\u0646\u0633 H320", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-brilliance-h330", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0631\u0644\u06CC\u0627\u0646\u0633 H330", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-brilliance-v5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0631\u0644\u06CC\u0627\u0646\u0633 V5", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-lifan-x50", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0644\u06CC\u0641\u0627\u0646 X50", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-lifan-x60", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0644\u06CC\u0641\u0627\u0646 X60", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-lifan-x80", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0644\u06CC\u0641\u0627\u0646 X80", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-greatwall-h6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06AF\u0631\u06CC\u062A \u0648\u0627\u0644 H6", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-greatwall-c30", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06AF\u0631\u06CC\u062A \u0648\u0627\u0644 C30", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-greatwall-wingle", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06AF\u0631\u06CC\u062A \u0648\u0627\u0644 \u0648\u0646\u06AF\u0644", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-changan-cs35", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0686\u0627\u0646\u06AF\u0627\u0646 CS35", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-changan-cs75", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0686\u0627\u0646\u06AF\u0627\u0646 CS75", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-changan-eado", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0686\u0627\u0646\u06AF\u0627\u0646 \u0627\u062F\u0648", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-dongfeng-h30-cross", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0627\u0646\u06AF \u0641\u0627\u0646\u06AF H30 \u06A9\u0631\u0627\u0633", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-dongfeng-s30", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0627\u0646\u06AF \u0641\u0627\u0646\u06AF S30", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-dongfeng-ax7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0627\u0646\u06AF \u0641\u0627\u0646\u06AF AX7", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-faw-b50", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0641\u0627\u0648 B50", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-faw-x40", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0641\u0627\u0648 X40", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-capra-2", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0627\u067E\u0631\u0627 \u06F2", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-capra-3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0627\u067E\u0631\u0627 \u06F3", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-capra-7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u0627\u067E\u0631\u0627 \u06F7", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-byd-f3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0627\u06CC\u062F\u06CC F3", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-byd-s6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0627\u06CC\u062F\u06CC S6", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-swm-g01", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC G01", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-swm-x3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC X3", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-baic-x35", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0627\u06CC\u06A9 X35", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-baic-bj40", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0627\u06CC\u06A9 BJ40", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-bisu-t60", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u06CC\u0633\u0648 T60", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-bisu-x35", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u06CC\u0633\u0648 X35", category: "embroidered-leather", price: 75e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-toyota-camry", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u0648\u06CC\u0648\u062A\u0627 \u06A9\u0645\u0631\u06CC", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-toyota-corolla", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u0648\u06CC\u0648\u062A\u0627 \u06A9\u0631\u0648\u0644\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-toyota-rav4", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u0648\u06CC\u0648\u062A\u0627 \u0631\u0627\u0648 \u06F4", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-toyota-land-cruiser", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u0648\u06CC\u0648\u062A\u0627 \u0644\u0646\u062F\u06A9\u0631\u0648\u0632\u0631", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-toyota-chr", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062A\u0648\u06CC\u0648\u062A\u0627 C-HR", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-hyundai-tucson", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u06CC\u0648\u0646\u062F\u0627\u06CC \u062A\u0648\u0633\u0627\u0646", category: "embroidered-leather", price: 84e5, comparePrice: 94e5, stock: 8 }, { slug: "5d-leather-hyundai-santafe", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u06CC\u0648\u0646\u062F\u0627\u06CC \u0633\u0627\u0646\u062A\u0627\u0641\u0647", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-hyundai-sonata", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u06CC\u0648\u0646\u062F\u0627\u06CC \u0633\u0648\u0646\u0627\u062A\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-hyundai-elantra", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u06CC\u0648\u0646\u062F\u0627\u06CC \u0627\u0644\u0646\u062A\u0631\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-hyundai-azera", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u06CC\u0648\u0646\u062F\u0627\u06CC \u0622\u0632\u0631\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-kia-sportage", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC\u0627 \u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u062C", category: "embroidered-leather", price: 84e5, comparePrice: 94e5, stock: 8 }, { slug: "5d-leather-kia-cerato", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC\u0627 \u0633\u0631\u0627\u062A\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-kia-optima", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC\u0627 \u0627\u067E\u062A\u06CC\u0645\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-kia-sorento", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u06A9\u06CC\u0627 \u0633\u0648\u0631\u0646\u062A\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-mazda-mazda3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u0632\u062F\u0627 \u06F3 \u0646\u06CC\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-mazda-cx5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u0632\u062F\u0627 CX-5", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-mazda-mazda6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u0632\u062F\u0627 \u06F6", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-nissan-qashqai", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0646\u06CC\u0633\u0627\u0646 \u0642\u0634\u0642\u0627\u06CC\u06CC", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-nissan-xtrail", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0646\u06CC\u0633\u0627\u0646 \u0627\u06CC\u06A9\u0633 \u062A\u0631\u06CC\u0644", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-nissan-maxima", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0646\u06CC\u0633\u0627\u0646 \u0645\u0627\u06A9\u0633\u06CC\u0645\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-nissan-juke", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0646\u06CC\u0633\u0627\u0646 \u062C\u0648\u06A9", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-suzuki-alto", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0632\u0648\u06A9\u06CC \u0627\u0644\u062A\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-suzuki-swift", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0632\u0648\u06A9\u06CC \u0633\u0648\u0626\u06CC\u0641\u062A", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-suzuki-vitara", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0632\u0648\u06A9\u06CC \u0648\u06CC\u062A\u0627\u0631\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-suzuki-grand-vitara", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0632\u0648\u06A9\u06CC \u06AF\u0631\u0646\u062F \u0648\u06CC\u062A\u0627\u0631\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-ssangyong-tivoli", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0627\u0646\u06AF \u06CC\u0627\u0646\u06AF \u062A\u06CC\u0648\u0648\u0644\u06CC", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-ssangyong-korando", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0627\u0646\u06AF \u06CC\u0627\u0646\u06AF \u06A9\u0648\u0631\u0627\u0646\u062F\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-ssangyong-rexton", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0627\u0646\u06AF \u06CC\u0627\u0646\u06AF \u0631\u06A9\u0633\u062A\u0648\u0646", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-ssangyong-actyon", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0627\u0646\u06AF \u06CC\u0627\u0646\u06AF \u0627\u06A9\u062A\u06CC\u0648\u0646", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-lexus-nx", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0644\u06A9\u0633\u0648\u0633 NX", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-lexus-rx", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0644\u06A9\u0633\u0648\u0633 RX", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-lexus-es", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0644\u06A9\u0633\u0648\u0633 ES", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-honda-accord", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u0648\u0646\u062F\u0627 \u0622\u06A9\u0648\u0631\u062F", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-honda-civic", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u0648\u0646\u062F\u0627 \u0633\u06CC\u0648\u06CC\u06A9", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-honda-cr-v", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0647\u0648\u0646\u062F\u0627 CR-V", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-daewoo-cielo", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0648\u0648 \u0633\u06CC\u0644\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-daewoo-matiz", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0648\u0648 \u0645\u0627\u062A\u06CC\u0632", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-daewoo-magnus", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0648\u0648 \u0645\u0627\u06AF\u0646\u0648\u0633", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-infiniti-ex35", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u06CC\u0646\u0641\u06CC\u0646\u06CC\u062A\u06CC EX35", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-infiniti-qx50", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u06CC\u0646\u0641\u06CC\u0646\u06CC\u062A\u06CC QX50", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-infiniti-qx60", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0627\u06CC\u0646\u0641\u06CC\u0646\u06CC\u062A\u06CC QX60", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-subaru-legacy", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0628\u0627\u0631\u0648 \u0644\u06AF\u0627\u0633\u06CC", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-subaru-forester", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0628\u0627\u0631\u0648 \u0641\u0648\u0631\u0633\u062A\u0631", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-subaru-outback", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u0648\u0628\u0627\u0631\u0648 \u0627\u0648\u062A\u0628\u06A9", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-mitsubishi-l200", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u06CC\u062A\u0633\u0648\u0628\u06CC\u0634\u06CC L200", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-mitsubishi-asx", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u06CC\u062A\u0633\u0648\u0628\u06CC\u0634\u06CC ASX", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-mitsubishi-outlander", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u06CC\u062A\u0633\u0648\u0628\u06CC\u0634\u06CC \u0627\u0648\u062A\u0644\u0646\u062F\u0631", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-mitsubishi-pajero", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u06CC\u062A\u0633\u0648\u0628\u06CC\u0634\u06CC \u067E\u0627\u062C\u0631\u0648", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-mitsubishi-lancer", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u06CC\u062A\u0633\u0648\u0628\u06CC\u0634\u06CC \u0644\u0646\u0633\u0631", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-landmark-lx570", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC LX570", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-landmark-range-rover", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0631\u0646\u062C\u0631\u0648\u0631", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-benz-c200", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0646\u0632 C200", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-benz-e250", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0646\u0632 E250", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-benz-glc", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0646\u0632 GLC", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-benz-s500", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u0646\u0632 S500", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-volkswagen-tiguan", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0641\u0648\u0644\u06A9\u0633 \u0648\u0627\u06AF\u0646 \u062A\u06CC\u06AF\u0648\u0627\u0646", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-volkswagen-passat", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0641\u0648\u0644\u06A9\u0633 \u0648\u0627\u06AF\u0646 \u067E\u0627\u0633\u0627\u062A", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-volkswagen-golf", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0641\u0648\u0644\u06A9\u0633 \u0648\u0627\u06AF\u0646 \u06AF\u0644\u0641", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-bmw-x3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u06CC \u0627\u0645 \u0648 X3", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 7 }, { slug: "5d-leather-bmw-x5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u06CC \u0627\u0645 \u0648 X5", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-bmw-series3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u06CC \u0627\u0645 \u0648 \u0633\u0631\u06CC \u06F3", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-bmw-series5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0628\u06CC \u0627\u0645 \u0648 \u0633\u0631\u06CC \u06F5", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-citroen-xantia", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u06CC\u062A\u0631\u0648\u0626\u0646 \u0632\u0627\u0646\u062A\u06CC\u0627", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 6 }, { slug: "5d-leather-citroen-c3", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u06CC\u062A\u0631\u0648\u0626\u0646 C3", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-citroen-c4", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u06CC\u062A\u0631\u0648\u0626\u0646 C4", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-citroen-elysee", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0633\u06CC\u062A\u0631\u0648\u0626\u0646 \u0627\u0644\u06CC\u0632\u0647", category: "embroidered-leather", price: 84e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-porsche-cayenne", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0648\u0631\u0634 \u06A9\u0627\u06CC\u0646", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-porsche-macan", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0648\u0631\u0634 \u0645\u0627\u06A9\u0627\u0646", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-porsche-911", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0648\u0631\u0634 \u06F9\u06F1\u06F1", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-porsche-panamera", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u067E\u0648\u0631\u0634 \u067E\u0627\u0646\u0627\u0645\u0631\u0627", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-audi-a4", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0622\u0626\u0648\u062F\u06CC A4", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-audi-a6", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0622\u0626\u0648\u062F\u06CC A6", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-audi-q5", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0622\u0626\u0648\u062F\u06CC Q5", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-audi-q7", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0622\u0626\u0648\u062F\u06CC Q7", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-volvo-xc60", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0648\u0644\u0648\u0648 XC60", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 5 }, { slug: "5d-leather-volvo-xc90", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0648\u0644\u0648\u0648 XC90", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-volvo-s60", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0648\u0644\u0648\u0648 S60", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-maserati-ghibli", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u0627\u0632\u0631\u0627\u062A\u06CC \u06AF\u06CC\u0628\u0644\u06CC", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-maserati-levante", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u0627\u0632\u0631\u0627\u062A\u06CC \u0644\u0648\u0628\u0627\u0646\u0647", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-maserati-quattroporte", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u0645\u0627\u0632\u0631\u0627\u062A\u06CC \u06A9\u0648\u0627\u062A\u0631\u0648\u067E\u0648\u0631\u062A\u0647", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 3 }, { slug: "5d-leather-dodge-challenger", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0648\u062C \u0686\u0644\u0646\u062C\u0631", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "5d-leather-dodge-journey", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645\u06CC \u06AF\u0644\u062F\u0648\u0632\u06CC \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062F\u0648\u062C \u062C\u0648\u0631\u0646\u06CC", category: "embroidered-leather", price: 98e5, comparePrice: null, stock: 4 }, { slug: "acc-steering-lock", title: "\u0642\u0641\u0644 \u0641\u0631\u0645\u0627\u0646 \u0636\u062F\u0633\u0631\u0642\u062A \u062F\u0648\u0642\u0644\u0627\u0628", category: "accessories", price: 145e4, comparePrice: 175e4, stock: 120 }, { slug: "acc-pedal-lock", title: "\u0642\u0641\u0644 \u067E\u062F\u0627\u0644 \u062A\u0631\u0645\u0632 \u0648 \u06A9\u0644\u0627\u0686", category: "accessories", price: 125e4, comparePrice: null, stock: 120 }, { slug: "acc-wheel-cover", title: "\u0631\u0648\u06A9\u0634 \u062F\u0648\u0631 \u0641\u0631\u0645\u0627\u0646 \u0686\u0631\u0645\u06CC \u0645\u0634\u06A9\u06CC", category: "accessories", price: 899e3, comparePrice: 105e4, stock: 120 }, { slug: "acc-front-5d-mat", title: "\u06A9\u0641\u067E\u0648\u0634 \u0686\u0631\u0645 \u067E\u0646\u062C \u0628\u0639\u062F\u06CC \u062C\u0644\u0648", category: "accessories", price: 399e3, comparePrice: 49e4, stock: 95 }, { slug: "acc-rear-antislip-mat", title: "\u06A9\u0641\u067E\u0648\u0634 \u0645\u0634\u06A9\u06CC \u0636\u062F\u0644\u063A\u0632\u0634 \u0639\u0642\u0628", category: "accessories", price: 499e3, comparePrice: 59e4, stock: 110 }, { slug: "acc-wheel-cover-brown", title: "\u0631\u0648\u06A9\u0634 \u062F\u0648\u0631 \u0641\u0631\u0645\u0627\u0646 \u0686\u0631\u0645 \u0642\u0647\u0648\u0647\u200C\u0627\u06CC", category: "accessories", price: 95e4, comparePrice: null, stock: 120 }, { slug: "acc-gap-organizer", title: "\u0646\u0638\u0645\u200C\u062F\u0647\u0646\u062F\u0647 \u0686\u0631\u0645\u06CC \u06A9\u0646\u0627\u0631 \u0635\u0646\u062F\u0644\u06CC", category: "accessories", price: 98e4, comparePrice: 115e4, stock: 120 }, { slug: "acc-neck-pillow", title: "\u0633\u062A \u06A9\u0648\u0633\u0646 \u06AF\u0631\u062F\u0646\u06CC \u0648 \u06A9\u0645\u0631\u06CC \u0686\u0631\u0645\u06CC", category: "accessories", price: 145e4, comparePrice: 17e5, stock: 120 }, { slug: "acc-seat-belt", title: "\u0631\u0648\u06A9\u0634 \u0686\u0631\u0645\u06CC \u06A9\u0645\u0631\u0628\u0646\u062F \u0627\u06CC\u0645\u0646\u06CC (\u062C\u0641\u062A)", category: "accessories", price: 299e3, comparePrice: 39e4, stock: 120 }, { slug: "acc-trunk-organizer", title: "\u0646\u0638\u0645\u200C\u062F\u0647\u0646\u062F\u0647 \u062A\u0627\u0634\u0648 \u0635\u0646\u062F\u0648\u0642 \u0639\u0642\u0628", category: "accessories", price: 26e5, comparePrice: 295e4, stock: 120 }, { slug: "acc-trunk-organizer-suede", title: "\u062C\u0639\u0628\u0647 \u0635\u0646\u062F\u0648\u0642 \u0639\u0642\u0628 \u062C\u06CC\u0631 \u0644\u0648\u06A9\u0633", category: "accessories", price: 295e4, comparePrice: null, stock: 120 }, { slug: "acc-seat-back", title: "\u0646\u0638\u0645\u200C\u062F\u0647\u0646\u062F\u0647 \u0686\u0631\u0645\u06CC \u067E\u0634\u062A \u0635\u0646\u062F\u0644\u06CC", category: "accessories", price: 125e4, comparePrice: 145e4, stock: 120 }, { slug: "acc-armrest-organizer", title: "\u06A9\u06CC\u0641 \u0686\u0631\u0645\u06CC \u062F\u0633\u062A\u0647 \u0635\u0646\u062F\u0644\u06CC (\u0622\u0631\u0646\u062C\u200C\u06AF\u06CC\u0631)", category: "accessories", price: 115e4, comparePrice: null, stock: 120 }, { slug: "acc-key-case", title: "\u06A9\u06CC\u0641 \u0686\u0631\u0645\u06CC \u0633\u0648\u0626\u06CC\u0686 \u062E\u0648\u062F\u0631\u0648", category: "accessories", price: 39e4, comparePrice: null, stock: 120 }], coupons: { "50500": { percent: 10, label: "\u06A9\u062F 50500 \u2014 \u06F1\u06F0\u066A \u062A\u062E\u0641\u06CC\u0641" }, WELCOME: { percent: 15, label: "\u06A9\u062F WELCOME \u2014 \u06F1\u06F5\u066A \u062A\u062E\u0641\u06CC\u0641 \u062E\u0648\u0634\u200C\u0622\u0645\u062F\u06AF\u0648\u06CC\u06CC" } }, shipping: [{ id: "post", name: "\u067E\u0633\u062A \u067E\u06CC\u0634\u062A\u0627\u0632", cost: 12e4, freeOver: 5e6 }, { id: "tipax", name: "\u062A\u06CC\u067E\u0627\u06A9\u0633 (\u067E\u0633\u200C\u06A9\u0631\u0627\u06CC\u0647)", cost: 0, freeOver: null }, { id: "pickup", name: "\u062A\u062D\u0648\u06CC\u0644 \u062D\u0636\u0648\u0631\u06CC", cost: 0, freeOver: null }], leather: ["black", "tan", "cream", "gray", "burgundy", "navy"], thread: ["red", "orange", "gold", "cream", "brown", "white", "blue", "black"] };

// server/security.ts
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
var SCRYPT = { N: 1 << 15, r: 8, p: 1 };
var MAXMEM = 96 * 1024 * 1024;
function scrypt(password, salt, keylen, opts) {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, keylen, { ...opts, maxmem: MAXMEM }, (err, key) => err ? reject(err) : resolve(key));
  });
}
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}
async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
var dummyHash = null;
async function burnPasswordCheck(password) {
  dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
  await verifyPassword(password, await dummyHash);
}
function passwordPolicy(password) {
  if (password.length < 8) return "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F.";
  if (password.length > 128) return "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u0637\u0648\u0644\u0627\u0646\u06CC \u0627\u0633\u062A.";
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d|[۰-۹]/.test(password)) return "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 \u062D\u0631\u0641 \u0648 \u0639\u062F\u062F \u0628\u0627\u0634\u062F.";
  return null;
}
var randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
var sha2563 = (value) => createHash("sha256").update(value).digest("hex");
function randomDigits(length) {
  let out = String(randomInt(1, 10));
  while (out.length < length) out += String(randomInt(0, 10));
  return out;
}
function safeEqual(a, b2) {
  const x = Buffer.from(a);
  const y = Buffer.from(b2);
  return x.length === y.length && timingSafeEqual(x, y);
}
var vaultKey = Buffer.from(hkdfSync("sha256", config.appSecret, "50500.shop/vault", "aes-256-gcm v1", 32));
function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}
function decrypt(payload) {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported vault payload");
  const decipher = createDecipheriv("aes-256-gcm", vaultKey, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
var B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[value << 5 - bits & 31];
  return out;
}
function base32Decode(input) {
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32");
    value = value << 5 | idx;
    bits += 5;
    if (bits >= 8) {
      out.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
var generateTotpSecret = () => base32Encode(randomBytes(20));
function totpAt(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac2 = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac2[hmac2.length - 1] & 15;
  const code = (hmac2.readUInt32BE(offset) & 2147483647) % 1e6;
  return code.toString().padStart(6, "0");
}
function verifyTotp(secret, code, lastUsedCounter = -1) {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 3e4);
  for (const step of [0, -1, 1]) {
    const counter = now + step;
    if (counter <= lastUsedCounter) continue;
    if (safeEqual(totpAt(secret, counter), code)) return counter;
  }
  return null;
}
var totpUri = (secret, account) => `otpauth://totp/${encodeURIComponent(`50500.shop:${account}`)}?secret=${secret}&issuer=${encodeURIComponent("50500.shop")}&algorithm=SHA1&digits=6&period=30`;
var buckets = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 6e4).unref();
function rateLimit(key, limit2, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > limit2) return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1e3) };
  return { ok: true };
}
function normalizeDigits(value) {
  return value.replace(/[۰-۹]/g, (d) => String("\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9".indexOf(d))).replace(/[٠-٩]/g, (d) => String("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d)));
}
function normalizePhone(value) {
  let digits = normalizeDigits(value).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("98") && digits.length === 12) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10 && digits.startsWith("9")) digits = `0${digits}`;
  return digits;
}
var maskPhone = (phone2) => phone2.length >= 11 ? `${phone2.slice(0, 4)}***${phone2.slice(-4)}` : "***";

// server/db.ts
var CATALOG = catalog_default;
var SEED_PRODUCTS = new Map(catalog_default.products.map((p) => [p.slug, p]));
var sql = src_default(config.databaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {
  }
});
var SCHEMA = (
  /* sql */
  `
create table if not exists users (
  id bigserial primary key,
  name text not null check (length(name) between 2 and 80),
  email text not null,
  phone text not null check (phone ~ '^09[0-9]{9}$'),
  password_hash text not null,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_key on users (lower(email));
create unique index if not exists users_phone_key on users (phone);

create table if not exists admins (
  id bigserial primary key,
  email text not null,
  name text not null,
  password_hash text not null,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  totp_secret_enc text,
  totp_pending_enc text,
  totp_enabled boolean not null default false,
  totp_last_counter bigint not null default -1,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists admins_email_key on admins (lower(email));

create table if not exists sessions (
  id_hash text primary key,
  kind text not null check (kind in ('user', 'admin')),
  subject_id bigint not null,
  expires_at timestamptz not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists sessions_subject_idx on sessions (kind, subject_id);
create index if not exists sessions_expiry_idx on sessions (expires_at);

create table if not exists products (
  slug text primary key,
  title text not null,
  category text not null,
  price int not null check (price >= 0),
  compare_price int check (compare_price is null or compare_price >= 0),
  stock int not null check (stock >= 0),
  active boolean not null default true,
  image text,
  cost int not null default 0 check (cost >= 0),
  updated_at timestamptz not null default now()
);
alter table products add column if not exists body text not null default '';
alter table products add column if not exists brand_name text;
alter table products add column if not exists custom boolean not null default false;
alter table products add column if not exists created_at timestamptz not null default now();


create table if not exists orders (
  id bigserial primary key,
  code text not null unique,
  access_hash text not null,
  user_id bigint references users(id) on delete set null,
  customer jsonb not null,
  phone text not null,
  items jsonb not null,
  subtotal int not null check (subtotal >= 0),
  discount int not null check (discount >= 0),
  shipping int not null check (shipping >= 0),
  total int not null check (total >= 0),
  coupon text,
  shipping_method text not null,
  payment_method text not null check (payment_method in ('online', 'cod', 'card')),
  status text not null default 'pending',
  payment_status text not null default 'pending',
  tracking text,
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_phone_idx on orders (phone);
create index if not exists orders_expiry_idx on orders (expires_at) where payment_status = 'pending';

create table if not exists payments (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  gateway text not null,
  amount int not null check (amount > 0),
  status text not null default 'initiated' check (status in ('initiated', 'paid', 'failed')),
  token_hash text not null unique,
  authority text,
  ref_id text,
  card_pan text,
  raw jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists payments_order_idx on payments (order_id);
-- A bank reference can settle exactly one payment (blocks receipt replay, e.g. SEP RefNum reuse).
create unique index if not exists payments_ref_key on payments (gateway, ref_id) where ref_id is not null;

create table if not exists order_events (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  admin_id bigint,
  kind text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists order_events_idx on order_events (order_id, created_at desc);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by bigint
);

create table if not exists vault (
  key text primary key,
  value_enc text not null,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists media (
  id text primary key,
  name text not null,
  mime text not null,
  size int not null,
  width int not null,
  height int not null,
  alt text not null default '',
  folder text not null default '\u0639\u0645\u0648\u0645\u06CC',
  tags jsonb not null default '[]'::jsonb,
  data bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coupons (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,24}$'),
  label text not null default '',
  percent int not null check (percent between 1 and 90),
  min_amount int not null default 0 check (min_amount >= 0),
  max_uses int check (max_uses is null or max_uses >= 1),
  uses int not null default 0 check (uses >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id bigserial primary key,
  slug text not null references products(slug) on delete cascade,
  user_id bigint references users(id) on delete set null,
  name text not null check (length(name) between 2 and 60),
  rating int not null check (rating between 1 and 5),
  comment text not null check (length(comment) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists reviews_slug_idx on reviews (slug, status, created_at desc);
create index if not exists reviews_status_idx on reviews (status, created_at desc);

create table if not exists audit_log (
  id bigserial primary key,
  admin_id bigint,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_log (created_at desc);
`
);
async function migrate() {
  await sql.unsafe(SCHEMA);
  const rows = catalog_default.products.map((p) => ({ slug: p.slug, title: p.title, category: p.category, price: p.price, compare_price: p.comparePrice, stock: p.stock }));
  for (let i = 0; i < rows.length; i += 200) {
    await sql`insert into products ${sql(rows.slice(i, i + 200), "slug", "title", "category", "price", "compare_price", "stock")} on conflict (slug) do nothing`;
  }
  for (const [code, c] of Object.entries(catalog_default.coupons)) {
    await sql`insert into coupons (code, label, percent) values (${code}, ${c.label}, ${c.percent}) on conflict (code) do nothing`;
  }
  const [{ count }] = await sql`select count(*)::text as count from admins`;
  if (count === "0") {
    if (config.adminEmail && config.adminPassword) {
      await sql`insert into admins (email, name, password_hash, role) values (${config.adminEmail}, 'مدیر اصلی', ${await hashPassword(config.adminPassword)}, 'owner')`;
      console.log(`\u2713 owner account created for ${config.adminEmail}`);
    } else {
      console.warn("\u26A0 No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the owner account.");
    }
  }
}
async function audit(adminId, action, meta = {}, ip) {
  await sql`insert into audit_log (admin_id, action, meta, ip) values (${adminId}, ${action}, ${sql.json(meta)}, ${ip ?? null})`;
}
async function expireUnpaidOrders() {
  await sql.begin(async (tx) => {
    const expired = await tx`
      select id, items from orders
      where payment_status = 'pending' and status = 'pending' and expires_at is not null and expires_at < now()
      for update skip locked`;
    for (const order2 of expired) {
      for (const item of order2.items) await tx`update products set stock = stock + ${item.qty} where slug = ${item.slug}`;
      await tx`update orders set status = 'cancelled', payment_status = 'cancelled', updated_at = now() where id = ${order2.id}`;
    }
    await tx`delete from sessions where expires_at < now()`;
  });
}

// server/payments.ts
import { createCipheriv as createCipheriv2 } from "node:crypto";
var GATEWAY_NAMES = { zarinpal: "\u0632\u0631\u06CC\u0646\u200C\u067E\u0627\u0644", zibal: "\u0632\u06CC\u0628\u0627\u0644", sep: "\u0633\u067E (\u0628\u0627\u0646\u06A9 \u0633\u0627\u0645\u0627\u0646)", sadad: "\u0633\u062F\u0627\u062F \u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC" };
var REQUIRED_FIELDS = {
  zarinpal: ["merchantId"],
  zibal: ["merchantId"],
  sep: ["terminalId"],
  sadad: ["merchantId", "terminalId", "secretKey"]
};
var REDIRECT_HOSTS = ["payment.zarinpal.com", "sandbox.zarinpal.com", "www.zarinpal.com", "gateway.zibal.ir", "sep.shaparak.ir", "sadad.shaparak.ir"];
var GatewayError = class extends Error {
};
function url(gateway, real) {
  if (!config.paymentTestBase) return real;
  const parsed2 = new URL(real);
  return `${config.paymentTestBase.replace(/\/$/, "")}/${gateway}${parsed2.pathname}${parsed2.search}`;
}
async function postJson(target, body) {
  let response;
  try {
    response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15e3)
    });
  } catch {
    throw new GatewayError("\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u062F\u0631\u06AF\u0627\u0647 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F");
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") throw new GatewayError(`\u067E\u0627\u0633\u062E \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0632 \u062F\u0631\u06AF\u0627\u0647 (HTTP ${response.status})`);
  return data;
}
var toRial = (toman) => toman * 10;
var str = (v) => v === void 0 || v === null ? null : String(v);
var zarinpalBase = (mode) => mode === "sandbox" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
function sadadSign(data, keyB64) {
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 24 && key.length !== 16) throw new GatewayError("\u06A9\u0644\u06CC\u062F \u062A\u0631\u0645\u06CC\u0646\u0627\u0644 \u0633\u062F\u0627\u062F \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A");
  const cipher = createCipheriv2(key.length === 24 ? "des-ede3" : "des-ede", key, null);
  return Buffer.concat([cipher.update(data, "utf8"), cipher.final()]).toString("base64");
}
var gateways = {
  zarinpal: {
    async start({ amountToman, callbackUrl, mobile, description, creds, mode }) {
      const data = await postJson(url("zarinpal", `${zarinpalBase(mode)}/pg/v4/payment/request.json`), {
        merchant_id: creds.merchantId,
        amount: amountToman,
        currency: "IRT",
        description,
        callback_url: callbackUrl,
        metadata: { mobile }
      });
      const d = data.data;
      if (!d || Number(d.code) !== 100 || typeof d.authority !== "string") throw new GatewayError("\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u067E\u0631\u062F\u0627\u062E\u062A \u0632\u0631\u06CC\u0646\u200C\u067E\u0627\u0644 \u0631\u062F \u0634\u062F");
      return { authority: d.authority, redirectUrl: url("zarinpal", `${zarinpalBase(mode)}/pg/StartPay/${encodeURIComponent(d.authority)}`) };
    },
    parseCallback: (p) => ({ success: p.Status === "OK", authority: p.Authority ?? null, reference: null }),
    async verify({ amountToman, authority, creds, mode }) {
      const data = await postJson(url("zarinpal", `${zarinpalBase(mode)}/pg/v4/payment/verify.json`), { merchant_id: creds.merchantId, amount: amountToman, authority });
      const d = data.data;
      const code = Number(d?.code);
      if (d && (code === 100 || code === 101)) return { ok: true, refId: str(d.ref_id), cardPan: str(d.card_pan), message: "OK", raw: data };
      return { ok: false, refId: null, cardPan: null, message: "\u062A\u0623\u06CC\u06CC\u062F \u067E\u0631\u062F\u0627\u062E\u062A \u0632\u0631\u06CC\u0646\u200C\u067E\u0627\u0644 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", raw: data };
    }
  },
  zibal: {
    async start({ paymentId, amountToman, callbackUrl, mobile, description, creds, mode }) {
      const data = await postJson(url("zibal", "https://gateway.zibal.ir/v1/request"), {
        merchant: mode === "sandbox" ? "zibal" : creds.merchantId,
        amount: toRial(amountToman),
        callbackUrl,
        orderId: String(paymentId),
        mobile,
        description
      });
      if (Number(data.result) !== 100 || !data.trackId) throw new GatewayError("\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u067E\u0631\u062F\u0627\u062E\u062A \u0632\u06CC\u0628\u0627\u0644 \u0631\u062F \u0634\u062F");
      const trackId = String(data.trackId);
      return { authority: trackId, redirectUrl: url("zibal", `https://gateway.zibal.ir/start/${encodeURIComponent(trackId)}`) };
    },
    parseCallback: (p) => ({ success: p.success === "1", authority: p.trackId ?? null, reference: null }),
    async verify({ amountToman, authority, creds, mode }) {
      const data = await postJson(url("zibal", "https://gateway.zibal.ir/v1/verify"), { merchant: mode === "sandbox" ? "zibal" : creds.merchantId, trackId: Number(authority) });
      const result = Number(data.result);
      if ((result === 100 || result === 201) && Number(data.amount) === toRial(amountToman)) {
        return { ok: true, refId: str(data.refNumber), cardPan: str(data.cardNumber), message: "OK", raw: data };
      }
      return { ok: false, refId: null, cardPan: null, message: result === 100 ? "\u0645\u0628\u0644\u063A \u062A\u0623\u06CC\u06CC\u062F\u0634\u062F\u0647 \u0628\u0627 \u0633\u0641\u0627\u0631\u0634 \u0628\u0631\u0627\u0628\u0631 \u0646\u06CC\u0633\u062A" : "\u062A\u0623\u06CC\u06CC\u062F \u067E\u0631\u062F\u0627\u062E\u062A \u0632\u06CC\u0628\u0627\u0644 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", raw: data };
    }
  },
  sep: {
    async start({ paymentId, amountToman, callbackUrl, mobile, creds }) {
      const data = await postJson(url("sep", "https://sep.shaparak.ir/onlinepg/onlinepg"), {
        action: "token",
        TerminalId: creds.terminalId,
        Amount: toRial(amountToman),
        ResNum: String(paymentId),
        RedirectUrl: callbackUrl,
        CellNumber: mobile
      });
      if (Number(data.status) !== 1 || typeof data.token !== "string") throw new GatewayError(`\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u0648\u06A9\u0646 \u0633\u067E \u0631\u062F \u0634\u062F${data.errorDesc ? `: ${String(data.errorDesc)}` : ""}`);
      return { authority: data.token, redirectUrl: url("sep", `https://sep.shaparak.ir/OnlinePG/SendToken?token=${encodeURIComponent(data.token)}`) };
    },
    // Status 2 = success. ResNum is our payment id; RefNum is SEP's digital receipt.
    parseCallback: (p) => ({ success: p.State === "OK" && p.Status === "2", authority: p.Token ?? null, reference: p.RefNum ?? null }),
    async verify({ paymentId, amountToman, reference, creds }) {
      if (!reference) return { ok: false, refId: null, cardPan: null, message: "\u0631\u0633\u06CC\u062F \u062F\u06CC\u062C\u06CC\u062A\u0627\u0644 \u0633\u067E \u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0634\u062F", raw: null };
      const body = { RefNum: reference, TerminalNumber: Number(creds.terminalId) };
      const data = await postJson(url("sep", "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction"), body);
      const detail = data.TransactionDetail;
      const success = data.Success === true || Number(data.ResultCode) === 0;
      if (success && detail && Number(detail.OrginalAmount) === toRial(amountToman)) {
        return { ok: true, refId: reference, cardPan: str(detail.MaskedPan), message: "OK", raw: data };
      }
      if (success) {
        await postJson(url("sep", "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction"), body).catch(() => null);
        return { ok: false, refId: null, cardPan: null, message: `\u0645\u0628\u0644\u063A \u062A\u0631\u0627\u06A9\u0646\u0634 ${paymentId} \u0645\u063A\u0627\u06CC\u0631\u062A \u062F\u0627\u0634\u062A \u0648 \u0628\u0631\u06AF\u0634\u062A \u062F\u0627\u062F\u0647 \u0634\u062F`, raw: data };
      }
      return { ok: false, refId: null, cardPan: null, message: "\u062A\u0623\u06CC\u06CC\u062F \u067E\u0631\u062F\u0627\u062E\u062A \u0633\u067E \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", raw: data };
    }
  },
  sadad: {
    async start({ paymentId, amountToman, callbackUrl, mobile, creds }) {
      const amount = toRial(amountToman);
      const data = await postJson(url("sadad", "https://sadad.shaparak.ir/vpg/api/v0/Request/PaymentRequest"), {
        MerchantId: creds.merchantId,
        TerminalId: creds.terminalId,
        Amount: amount,
        OrderId: paymentId,
        LocalDateTime: (/* @__PURE__ */ new Date()).toISOString(),
        ReturnUrl: callbackUrl,
        UserId: mobile,
        SignData: sadadSign(`${creds.terminalId};${paymentId};${amount}`, creds.secretKey)
      });
      if (Number(data.ResCode) !== 0 || typeof data.Token !== "string") throw new GatewayError(`\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u067E\u0631\u062F\u0627\u062E\u062A \u0633\u062F\u0627\u062F \u0631\u062F \u0634\u062F${data.Description ? `: ${String(data.Description)}` : ""}`);
      return { authority: data.Token, redirectUrl: url("sadad", `https://sadad.shaparak.ir/VPG/Purchase?Token=${encodeURIComponent(data.Token)}`) };
    },
    parseCallback: (p) => ({ success: p.ResCode === "0", authority: p.token ?? p.Token ?? null, reference: p.OrderId ?? null }),
    async verify({ paymentId, amountToman, authority, reference, creds }) {
      if (reference !== null && reference !== String(paymentId)) return { ok: false, refId: null, cardPan: null, message: "\u0634\u0646\u0627\u0633\u0647 \u0633\u0641\u0627\u0631\u0634 \u0633\u062F\u0627\u062F \u0645\u0637\u0627\u0628\u0642\u062A \u0646\u062F\u0627\u0631\u062F", raw: null };
      const data = await postJson(url("sadad", "https://sadad.shaparak.ir/vpg/api/v0/Advice/Verify"), { Token: authority, SignData: sadadSign(authority, creds.secretKey) });
      if (Number(data.ResCode) === 0 && Number(data.Amount) === toRial(amountToman) && String(data.OrderId) === String(paymentId)) {
        return { ok: true, refId: str(data.RetrivalRefNo) ?? str(data.SystemTraceNo), cardPan: null, message: "OK", raw: data };
      }
      return { ok: false, refId: null, cardPan: null, message: "\u062A\u0623\u06CC\u06CC\u062F \u067E\u0631\u062F\u0627\u062E\u062A \u0633\u062F\u0627\u062F \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", raw: data };
    }
  }
};
function isGatewayError(error) {
  return error instanceof GatewayError;
}

// server/static.ts
import { createHash as createHash2 } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};
var COMPRESSIBLE = /* @__PURE__ */ new Set([".html", ".js", ".css", ".json", ".svg", ".txt"]);
var assets = /* @__PURE__ */ new Map();
var scriptHashes = [];
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
function loadStatic(dir) {
  if (!existsSync(dir)) {
    console.warn(`\u26A0 static directory "${dir}" not found \u2014 only the API will be served`);
    return;
  }
  for (const file of walk(dir)) {
    const ext = extname(file).toLowerCase();
    if (ext === ".html" && !file.endsWith("index.html")) continue;
    const body = readFileSync(file);
    const urlPath = `/${relative(dir, file).split(sep).join("/")}`;
    const asset = {
      body,
      type: TYPES[ext] ?? "application/octet-stream",
      etag: `"${createHash2("sha256").update(body).digest("base64url").slice(0, 22)}"`,
      cache: ext === ".html" ? "no-cache" : "public, max-age=604800, stale-while-revalidate=86400"
    };
    if (COMPRESSIBLE.has(ext) && body.length > 1024) {
      asset.gzip = gzipSync(body, { level: 9 });
      asset.br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 10, [constants.BROTLI_PARAM_SIZE_HINT]: body.length } });
    }
    assets.set(urlPath, asset);
  }
  const index = assets.get("/index.html");
  if (index) {
    const html = index.body.toString("utf8");
    scriptHashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
      (m) => `'sha256-${createHash2("sha256").update(m[1], "utf8").digest("base64")}'`
    );
  }
  console.log(`\u2713 static: ${assets.size} files, ${scriptHashes.length} inline script hash(es)`);
}
function contentSecurityPolicy(production2) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...production2 ? ["upgrade-insecure-requests"] : []
  ].join("; ");
}
function serveStatic(path, acceptEncoding, ifNoneMatch) {
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  const asset = assets.get(decoded === "/" ? "/index.html" : decoded) ?? (extname(decoded) ? void 0 : assets.get("/index.html"));
  if (!asset) return null;
  const headers = { "Content-Type": asset.type, "Cache-Control": asset.cache, ETag: asset.etag, Vary: "Accept-Encoding" };
  if (ifNoneMatch === asset.etag) return new Response(null, { status: 304, headers });
  let body = asset.body;
  if (asset.br && /\bbr\b/.test(acceptEncoding)) {
    body = asset.br;
    headers["Content-Encoding"] = "br";
  } else if (asset.gzip && /\bgzip\b/.test(acceptEncoding)) {
    body = asset.gzip;
    headers["Content-Encoding"] = "gzip";
  }
  headers["Content-Length"] = String(body.length);
  return new Response(new Uint8Array(body), { status: 200, headers });
}

// server/app.ts
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var app = new Hono3();
var USER_COOKIE = config.production ? "__Host-sid" : "sid";
var ADMIN_COOKIE = config.production ? "__Host-asid" : "asid";
var USER_TTL = 30 * 24 * 3600;
var ADMIN_TTL = 8 * 3600;
var GATEWAY_IDS = ["zarinpal", "sadad", "sep", "zibal", "card"];
var SECRET_FIELDS = { sadad: ["secretKey"], sep: ["password"] };
var ORDER_STATUSES = ["pending", "confirmed", "producing", "shipped", "delivered", "cancelled"];
var MODULES = ["orders", "products", "customers", "coupons", "reviews", "content", "pages", "media", "payments", "agents", "settings", "finance", "affiliates"];
var fail = (c, status, error, extra = {}) => c.json({ error, ...extra }, status);
function clientIp(c) {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || c.env?.incoming?.socket?.remoteAddress || "unknown";
}
function limit(c, bucket, max, windowMs) {
  const result = rateLimit(`${bucket}:${c.get("ip")}`, max, windowMs);
  if (result.ok) return null;
  c.header("Retry-After", String(result.retryAfter));
  return fail(c, 429, "\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627 \u0632\u06CC\u0627\u062F \u0627\u0633\u062A\u061B \u06A9\u0645\u06CC \u0628\u0639\u062F \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F.");
}
async function readBody(c, schema2) {
  let raw2;
  try {
    raw2 = await c.req.json();
  } catch {
    throw new HttpError(400, "\u0628\u062F\u0646\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A");
  }
  const parsed2 = schema2.safeParse(raw2);
  if (!parsed2.success) throw new HttpError(400, parsed2.error.issues[0]?.message ?? "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A");
  return parsed2.data;
}
var isUnique = (error) => typeof error === "object" && error !== null && error.code === "23505";
async function createSession(c, kind, subjectId) {
  const token = randomToken(32);
  const ttl = kind === "admin" ? ADMIN_TTL : USER_TTL;
  await sql`insert into sessions (id_hash, kind, subject_id, expires_at, ip, user_agent)
    values (${sha2563(token)}, ${kind}, ${subjectId}, now() + ${`${ttl} seconds`}::interval, ${c.get("ip")}, ${(c.req.header("user-agent") ?? "").slice(0, 300)})`;
  setCookie(c, kind === "admin" ? ADMIN_COOKIE : USER_COOKIE, token, {
    httpOnly: true,
    secure: config.production,
    sameSite: kind === "admin" ? "Strict" : "Lax",
    path: "/",
    maxAge: ttl
  });
}
async function destroySession(c, kind) {
  const name = kind === "admin" ? ADMIN_COOKIE : USER_COOKIE;
  const token = getCookie(c, name);
  if (!token) return;
  await sql`delete from sessions where id_hash = ${sha2563(token)}`;
  deleteCookie(c, name, { path: "/", secure: config.production });
}
function requireUser(c) {
  const user = c.get("user");
  if (!user) throw new HttpError(401, "\u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0634\u0648\u06CC\u062F.");
  return user;
}
function requireAdmin(c, module, write = false) {
  const admin = c.get("admin");
  if (!admin) throw new HttpError(401, "\u0646\u0634\u0633\u062A \u0645\u062F\u06CC\u0631\u06CC\u062A \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A\u061B \u062F\u0648\u0628\u0627\u0631\u0647 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F.");
  if (module && admin.role !== "owner") {
    const perm = admin.permissions?.[module];
    if (!perm?.read || write && !perm.write) throw new HttpError(403, "\u0645\u062C\u0648\u0632 \u0627\u06CC\u0646 \u0639\u0645\u0644\u06CC\u0627\u062A \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F.");
  }
  return admin;
}
var publicUser = (u) => u ? { id: u.id, name: u.name, email: u.email, phone: u.phone } : null;
var publicAdmin = (a) => ({ id: a.id, email: a.email, name: a.name, role: a.role, permissions: a.permissions, totpEnabled: a.totp_enabled });
function mapOrder(o, masked = false) {
  return {
    code: o.code,
    items: o.items.map((i) => ({ slug: i.slug, qty: i.qty, title: i.title, price: i.price, leather: i.leather, thread: i.thread })),
    customer: masked ? { name: o.customer.name, phone: maskPhone(o.phone), province: o.customer.province, city: o.customer.city, address: "\u2014", postalCode: "", notes: "" } : o.customer,
    shippingMethod: o.shipping_method,
    payment: o.payment_method,
    coupon: o.coupon,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    status: o.status,
    paymentStatus: o.payment_status,
    tracking: o.tracking,
    createdAt: o.created_at.toISOString(),
    expiresAt: o.expires_at?.toISOString() ?? null
  };
}
function mapAdminOrder(o) {
  const payment = o.payment_status === "paid" || o.payment_status === "paid_review" ? "paid" : o.payment_status === "cod" ? "cod" : o.payment_status === "refunded" ? "refunded" : "pending";
  return {
    code: o.code,
    customer: o.customer.name,
    phone: o.phone,
    province: o.customer.province ?? "",
    city: o.customer.city ?? "",
    items: o.items.map((i) => ({ slug: i.slug, title: i.title, qty: i.qty, price: i.price, image: "", leather: i.leather, thread: i.thread })),
    subtotal: o.subtotal,
    shipping: o.shipping,
    discount: o.discount,
    total: o.total,
    status: o.status,
    payment,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    shippingMethod: o.shipping_method,
    createdAt: o.created_at.toISOString(),
    tracking: o.tracking ?? void 0,
    note: o.note ?? void 0,
    address: o.customer.address,
    postalCode: o.customer.postalCode
  };
}
async function getSetting(key) {
  const [row] = await sql`select value from settings where key = ${key}`;
  return row?.value ?? null;
}
async function loadGateway(id) {
  const [row] = await sql`select value_enc, meta from vault where key = ${`gateway:${id}`}`;
  const defaults = { enabled: false, mode: "sandbox", currency: id === "zarinpal" || id === "zibal" || id === "card" ? "IRT" : "IRR", position: GATEWAY_IDS.indexOf(id) + 1 };
  if (!row) return { id, ...defaults, fields: {} };
  return { id, ...defaults, ...row.meta, fields: JSON.parse(decrypt(row.value_enc)) };
}
async function publicGateways() {
  const all = await Promise.all(GATEWAY_IDS.map(loadGateway));
  return all.filter((g) => g.enabled).sort((a, b2) => a.position - b2.position).map((g) => ({
    id: g.id,
    name: g.id === "card" ? "\u06A9\u0627\u0631\u062A\u200C\u0628\u0647\u200C\u06A9\u0627\u0631\u062A" : GATEWAY_NAMES[g.id],
    mode: g.mode,
    card: g.id === "card" ? { owner: g.fields.owner ?? "", cardNumber: g.fields.cardNumber ?? "", iban: g.fields.iban ?? "", bank: g.fields.bank ?? "" } : void 0
  }));
}
async function adminGateways() {
  const all = await Promise.all(GATEWAY_IDS.map(loadGateway));
  return all.map((g) => {
    const secrets = SECRET_FIELDS[g.id] ?? [];
    const fields = {};
    for (const [key, value] of Object.entries(g.fields)) {
      if (secrets.includes(key)) fields[`__set_${key}`] = value ? "1" : "";
      else fields[key] = value;
    }
    return { id: g.id, enabled: g.enabled, mode: g.mode, currency: g.currency, position: g.position, fields };
  });
}
async function customProducts(includeInactive = false) {
  const rows = await sql`
    select slug, title, category, price, compare_price, stock, image, body, brand_name, active from products where custom ${includeInactive ? sql`` : sql`and active`} order by created_at desc`;
  return rows.map((r) => ({ slug: r.slug, title: r.title, category: r.category, price: r.price, comparePrice: r.compare_price, stock: r.stock, image: r.image, body: r.body, brandName: r.brand_name, active: r.active }));
}
async function productOverrides() {
  const rows = await sql`
    select slug, title, price, compare_price, stock, active, image, custom from products where not custom`;
  const out = {};
  for (const r of rows) {
    const seed = SEED_PRODUCTS.get(r.slug);
    const o = {};
    if (!seed || r.title !== seed.title) o.title = r.title;
    if (!seed || r.price !== seed.price) o.price = r.price;
    if (!seed || r.compare_price !== seed.comparePrice) o.comparePrice = r.compare_price;
    if (!seed || r.stock !== seed.stock) o.stock = r.stock;
    if (!r.active) o.active = false;
    if (r.image) o.image = r.image;
    if (Object.keys(o).length) out[r.slug] = o;
  }
  return out;
}
async function findOrderWithAccess(c, code, token) {
  if (!/^\d{6,12}$/.test(code)) throw new HttpError(404, "\u0633\u0641\u0627\u0631\u0634 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  const [order2] = await sql`select * from orders where code = ${code}`;
  const user = c.get("user");
  const allowed = order2 && (token && safeEqual(sha2563(token), order2.access_hash) || user && order2.user_id === user.id);
  if (!order2 || !allowed) throw new HttpError(404, "\u0633\u0641\u0627\u0631\u0634 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  return order2;
}
var IMAGE_REF = /^(\/media\/[A-Za-z0-9_-]{8,64}|images\/[A-Za-z0-9/_.-]{1,200}|https:\/\/[^\s"'<>]{1,2000})$/;
app.use("*", async (c, next) => {
  c.set("ip", clientIp(c));
  c.set("user", null);
  c.set("admin", null);
  await next();
  const h = c.res.headers;
  h.set("Content-Security-Policy", contentSecurityPolicy(config.production));
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  if (config.production) h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.delete("X-Powered-By");
});
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const general = limit(c, "api", 600, 6e4);
  if (general) return general;
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.req.path.startsWith("/api/payments/callback/")) {
    const origin2 = c.req.header("origin");
    if (c.req.header("x-50500-client") !== "1" || c.req.header("sec-fetch-site") === "cross-site" || origin2 && origin2 !== config.appOrigin) {
      return fail(c, 403, "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.");
    }
  }
  const userToken = getCookie(c, USER_COOKIE);
  if (userToken) {
    const [user] = await sql`select u.id, u.name, u.email, u.phone from sessions s join users u on u.id = s.subject_id
      where s.id_hash = ${sha2563(userToken)} and s.kind = 'user' and s.expires_at > now()`;
    c.set("user", user ?? null);
  }
  const adminToken = getCookie(c, ADMIN_COOKIE);
  if (adminToken) {
    const [admin] = await sql`select a.id, a.email, a.name, a.role, a.permissions, a.totp_enabled from sessions s join admins a on a.id = s.subject_id
      where s.id_hash = ${sha2563(adminToken)} and s.kind = 'admin' and s.expires_at > now() and a.active`;
    c.set("admin", admin ?? null);
  }
  await next();
});
app.use("/api/*", (c, next) => {
  const maxSize = c.req.path === "/api/admin/media" && c.req.method === "POST" ? 6 * 1024 * 1024 : c.req.path.startsWith("/api/admin/settings/") ? 1024 * 1024 : 64 * 1024;
  return bodyLimit({ maxSize, onError: (ctx) => ctx.json({ error: "\u062D\u062C\u0645 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u0645\u062C\u0627\u0632 \u0627\u0633\u062A." }, 413) })(c, next);
});
app.onError((error, c) => {
  if (error instanceof HttpError) return fail(c, error.status, error.message);
  console.error("Unhandled error:", error);
  return c.json({ error: "\u062E\u0637\u0627\u06CC \u062F\u0627\u062E\u0644\u06CC \u0633\u0631\u0648\u0631\u061B \u0644\u0637\u0641\u0627\u064B \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F." }, 500);
});
app.get("/api/health", async (c) => {
  await sql`select 1`;
  return c.json({ ok: true });
});
app.get("/api/public/bootstrap", async (c) => {
  const [siteContent, control, overrides, payGateways, custom2] = await Promise.all([
    getSetting("site_content"),
    getSetting("control"),
    productOverrides(),
    publicGateways(),
    customProducts()
  ]);
  return c.json({
    serverMode: true,
    user: publicUser(c.get("user")),
    siteContent,
    control: control ? { pages: control.pages } : null,
    productOverrides: overrides,
    customProducts: custom2,
    gateways: payGateways,
    redirectHosts: REDIRECT_HOSTS
  });
});
app.get("/api/reviews", async (c) => {
  const slug = c.req.query("slug") ?? "";
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return fail(c, 400, "\u0645\u062D\u0635\u0648\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.");
  const rows = await sql`
    select id, name, rating, comment, created_at from reviews where slug = ${slug} and status = 'approved' order by created_at desc limit 50`;
  return c.json({ reviews: rows.map((r) => ({ id: r.id, name: r.name, rating: r.rating, comment: r.comment, date: r.created_at.toISOString() })) });
});
app.post("/api/reviews", async (c) => {
  const limited = limit(c, "review", 5, 36e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({
    slug: external_exports.string().regex(/^[a-z0-9-]{1,120}$/, "\u0645\u062D\u0635\u0648\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A."),
    name: external_exports.string().trim().min(2, "\u0646\u0627\u0645 \u0631\u0627 \u06A9\u0627\u0645\u0644 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(60),
    rating: external_exports.number().int().min(1).max(5),
    comment: external_exports.string().trim().min(10, "\u0646\u0638\u0631 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F1\u06F0 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F.").max(1e3)
  }));
  const [product] = await sql`select slug from products where slug = ${body.slug}`;
  if (!product) return fail(c, 404, "\u0645\u062D\u0635\u0648\u0644 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  const user = c.get("user");
  const [recent] = await sql`select id from reviews where slug = ${body.slug} and name = ${body.name} and created_at > now() - interval '24 hours' limit 1`;
  if (recent) return fail(c, 429, "\u0646\u0638\u0631 \u0634\u0645\u0627 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0645\u062D\u0635\u0648\u0644 \u062B\u0628\u062A \u0634\u062F\u0647 \u0648 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0631\u0631\u0633\u06CC \u0627\u0633\u062A.");
  await sql`insert into reviews (slug, user_id, name, rating, comment) values (${body.slug}, ${user?.id ?? null}, ${body.name}, ${body.rating}, ${body.comment})`;
  return c.json({ ok: true, pending: true });
});
var email = external_exports.string().trim().toLowerCase().email("\u0627\u06CC\u0645\u06CC\u0644 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A.").max(120);
var phone = external_exports.string().max(20).transform(normalizePhone).refine((v) => /^09\d{9}$/.test(v), "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A.");
app.post("/api/auth/register", async (c) => {
  const limited = limit(c, "register", 8, 36e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({ name: external_exports.string().trim().min(3, "\u0646\u0627\u0645 \u0631\u0627 \u06A9\u0627\u0645\u0644 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(80), email, phone, password: external_exports.string().max(200) }));
  const policy = passwordPolicy(body.password);
  if (policy) return fail(c, 400, policy);
  try {
    const [user] = await sql`insert into users (name, email, phone, password_hash)
      values (${body.name}, ${body.email}, ${body.phone}, ${await hashPassword(body.password)}) returning id, name, email, phone`;
    await createSession(c, "user", user.id);
    return c.json({ user: publicUser(user) });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "\u0627\u06CC\u0646 \u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0642\u0628\u0644\u0627\u064B \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A.");
    throw error;
  }
});
app.post("/api/auth/login", async (c) => {
  const body = await readBody(c, external_exports.object({ email, password: external_exports.string().max(200) }));
  const limited = limit(c, "login", 20, 9e5) ?? limit(c, `login:${body.email}`, 10, 9e5);
  if (limited) return limited;
  const [row] = await sql`
    select id, name, email, phone, password_hash, failed_logins, locked_until from users where lower(email) = ${body.email}`;
  if (!row) {
    await burnPasswordCheck(body.password);
    return fail(c, 401, "\u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  }
  if (row.locked_until && row.locked_until > /* @__PURE__ */ new Date()) return fail(c, 429, "\u0628\u0647 \u062F\u0644\u06CC\u0644 \u062A\u0644\u0627\u0634\u200C\u0647\u0627\u06CC \u0646\u0627\u0645\u0648\u0641\u0642\u060C \u062D\u0633\u0627\u0628 \u0645\u0648\u0642\u062A\u0627\u064B \u0642\u0641\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A.");
  if (!await verifyPassword(body.password, row.password_hash)) {
    await sql`update users set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 10 then now() + interval '15 minutes' else locked_until end where id = ${row.id}`;
    return fail(c, 401, "\u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  }
  await sql`update users set failed_logins = 0, locked_until = null where id = ${row.id}`;
  await destroySession(c, "user");
  await createSession(c, "user", row.id);
  return c.json({ user: publicUser(row) });
});
app.post("/api/auth/logout", async (c) => {
  await destroySession(c, "user");
  return c.json({ ok: true });
});
app.get("/api/auth/me", (c) => c.json({ user: publicUser(c.get("user")) }));
app.post("/api/auth/reset", (c) => fail(c, 503, "\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0622\u0646\u0644\u0627\u06CC\u0646 \u0631\u0645\u0632 \u0647\u0646\u0648\u0632 \u0641\u0639\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A\u061B \u0644\u0637\u0641\u0627\u064B \u0628\u0627 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u062A\u0645\u0627\u0633 \u0628\u06AF\u06CC\u0631\u06CC\u062F."));
app.patch("/api/account/profile", async (c) => {
  const user = requireUser(c);
  const body = await readBody(c, external_exports.object({ name: external_exports.string().trim().min(3, "\u0646\u0627\u0645 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A.").max(80), phone }));
  try {
    const [updated] = await sql`update users set name = ${body.name}, phone = ${body.phone} where id = ${user.id} returning id, name, email, phone`;
    return c.json({ user: publicUser(updated) });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0645\u062A\u0639\u0644\u0642 \u0628\u0647 \u062D\u0633\u0627\u0628 \u062F\u06CC\u06AF\u0631\u06CC \u0627\u0633\u062A.");
    throw error;
  }
});
app.post("/api/account/password", async (c) => {
  const user = requireUser(c);
  const limited = limit(c, `pw:${user.id}`, 8, 9e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({ current: external_exports.string().max(200), next: external_exports.string().max(200) }));
  const [row] = await sql`select password_hash from users where id = ${user.id}`;
  if (!row || !await verifyPassword(body.current, row.password_hash)) return fail(c, 400, "\u0631\u0645\u0632 \u0641\u0639\u0644\u06CC \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  const policy = passwordPolicy(body.next);
  if (policy) return fail(c, 400, policy);
  await sql`update users set password_hash = ${await hashPassword(body.next)} where id = ${user.id}`;
  await sql`delete from sessions where kind = 'user' and subject_id = ${user.id}`;
  await createSession(c, "user", user.id);
  return c.json({ ok: true });
});
app.get("/api/account/orders", async (c) => {
  const user = requireUser(c);
  const rows = await sql`select * from orders where user_id = ${user.id} order by created_at desc limit 100`;
  return c.json({ orders: rows.map((o) => mapOrder(o)) });
});
var orderSchema = external_exports.object({
  items: external_exports.array(external_exports.object({
    slug: external_exports.string().regex(/^[a-z0-9-]{1,120}$/, "\u0645\u062D\u0635\u0648\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A."),
    qty: external_exports.number().int().min(1).max(10),
    leather: external_exports.string().max(20).optional(),
    thread: external_exports.string().max(20).optional()
  })).min(1, "\u0633\u0628\u062F \u062E\u0631\u06CC\u062F \u062E\u0627\u0644\u06CC \u0627\u0633\u062A.").max(30),
  customer: external_exports.object({
    name: external_exports.string().trim().min(3, "\u0646\u0627\u0645 \u06AF\u06CC\u0631\u0646\u062F\u0647 \u0631\u0627 \u06A9\u0627\u0645\u0644 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(80),
    phone,
    province: external_exports.string().trim().min(1, "\u0627\u0633\u062A\u0627\u0646 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(40),
    city: external_exports.string().trim().min(1, "\u0634\u0647\u0631 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(40),
    address: external_exports.string().trim().min(10, "\u0646\u0634\u0627\u0646\u06CC \u06A9\u0627\u0645\u0644 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(300),
    postalCode: external_exports.string().max(20).optional().default("").transform((v) => normalizeDigits(v).replace(/\D/g, "")).refine((v) => v === "" || v.length === 10, "\u06A9\u062F \u067E\u0633\u062A\u06CC \u06F1\u06F0 \u0631\u0642\u0645\u06CC \u0627\u0633\u062A."),
    notes: external_exports.string().trim().max(500).optional().default("")
  }),
  shippingMethod: external_exports.string().max(20),
  payment: external_exports.enum(["online", "cod"]),
  coupon: external_exports.string().trim().max(30).nullable().optional()
});
app.post("/api/orders", async (c) => {
  const limited = limit(c, "order", 20, 36e5);
  if (limited) return limited;
  const body = await readBody(c, orderSchema);
  const method = CATALOG.shipping.find((m) => m.id === body.shippingMethod);
  if (!method) return fail(c, 400, "\u0631\u0648\u0634 \u0627\u0631\u0633\u0627\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.");
  const couponCode = body.coupon ? body.coupon.trim().toUpperCase() : null;
  const merged = /* @__PURE__ */ new Map();
  for (const item of body.items) {
    const key = `${item.slug}|${item.leather ?? ""}|${item.thread ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { ...item, qty: Math.min(10, (prev?.qty ?? 0) + item.qty) });
  }
  const accessToken = randomToken(24);
  const user = c.get("user");
  const order2 = await sql.begin(async (tx) => {
    const lines = [];
    for (const item of merged.values()) {
      const [row] = await tx`
        update products set stock = stock - ${item.qty}, updated_at = now()
        where slug = ${item.slug} and active and stock >= ${item.qty} returning price, title, category`;
      if (!row) throw new HttpError(409, `\u0645\u0648\u062C\u0648\u062F\u06CC \u06CC\u06A9\u06CC \u0627\u0632 \u06A9\u0627\u0644\u0627\u0647\u0627 \u06A9\u0627\u0641\u06CC \u0646\u06CC\u0633\u062A \u06CC\u0627 \u06A9\u0627\u0644\u0627 \u062F\u06CC\u06AF\u0631 \u0641\u0631\u0648\u062E\u062A\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F (${item.slug}).`);
      const leather = row.category === "embroidered-leather" ? CATALOG.leather.includes(item.leather ?? "") ? item.leather : CATALOG.leather[0] : void 0;
      const thread = row.category === "embroidered-leather" ? CATALOG.thread.includes(item.thread ?? "") ? item.thread : CATALOG.thread[0] : void 0;
      lines.push({ slug: item.slug, qty: item.qty, title: row.title, price: row.price, leather, thread });
    }
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    let discount = 0;
    if (couponCode) {
      const [cp] = await tx`
        select percent, min_amount, max_uses, uses, active from coupons where code = ${couponCode} for update`;
      if (!cp || !cp.active) throw new HttpError(400, "\u06A9\u062F \u062A\u062E\u0641\u06CC\u0641 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A \u06CC\u0627 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A.");
      if (subtotal < cp.min_amount) throw new HttpError(400, `\u062D\u062F\u0627\u0642\u0644 \u0645\u0628\u0644\u063A \u0633\u0641\u0627\u0631\u0634 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u06A9\u062F ${cp.min_amount.toLocaleString("fa-IR")} \u062A\u0648\u0645\u0627\u0646 \u0627\u0633\u062A.`);
      if (cp.max_uses !== null && cp.uses >= cp.max_uses) throw new HttpError(400, "\u0638\u0631\u0641\u06CC\u062A \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0627\u06CC\u0646 \u06A9\u062F \u062A\u062E\u0641\u06CC\u0641 \u062A\u06A9\u0645\u06CC\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A.");
      discount = Math.round(subtotal * cp.percent / 100);
      await tx`update coupons set uses = uses + 1 where code = ${couponCode}`;
    }
    const shipping = method.freeOver !== null && subtotal - discount >= method.freeOver ? 0 : method.cost;
    let code = randomDigits(10);
    for (let i = 0; i < 5; i++) {
      const [taken] = await tx`select 1 from orders where code = ${code}`;
      if (!taken) break;
      code = randomDigits(10);
    }
    const [created] = await tx`
      insert into orders (code, access_hash, user_id, customer, phone, items, subtotal, discount, shipping, total, coupon, shipping_method, payment_method, payment_status, expires_at)
      values (${code}, ${sha2563(accessToken)}, ${user?.id ?? null}, ${tx.json({ ...body.customer, phone: body.customer.phone })}, ${body.customer.phone},
        ${tx.json(lines)}, ${subtotal}, ${discount}, ${shipping}, ${subtotal - discount + shipping}, ${couponCode}, ${method.id}, ${body.payment},
        ${body.payment === "cod" ? "cod" : "pending"},
        ${body.payment === "online" ? sql`now() + ${`${config.orderTtlMinutes} minutes`}::interval` : null})
      returning *`;
    return created;
  });
  return c.json({ order: mapOrder(order2), accessToken });
});
app.get("/api/orders/:code", async (c) => {
  const order2 = await findOrderWithAccess(c, c.req.param("code"), c.req.header("x-order-token"));
  return c.json({ order: mapOrder(order2) });
});
app.post("/api/orders/track", async (c) => {
  const limited = limit(c, "track", 15, 6e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({ code: external_exports.string().trim().max(20), phone }));
  const code = normalizeDigits(body.code).replace(/\D/g, "");
  const [order2] = await sql`select * from orders where code = ${code} and phone = ${body.phone}`;
  if (!order2) return fail(c, 404, "\u0633\u0641\u0627\u0631\u0634\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u06A9\u062F \u0648 \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  return c.json({ order: mapOrder(order2, true) });
});
app.post("/api/coupons/validate", async (c) => {
  const limited = limit(c, "coupon-check", 30, 6e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({ code: external_exports.string().trim().max(30), subtotal: external_exports.number().int().min(0).max(1e10) }));
  const [cp] = await sql`
    select percent, label, min_amount, max_uses, uses, active from coupons where code = ${body.code.toUpperCase()}`;
  if (!cp || !cp.active) return fail(c, 400, "\u06A9\u062F \u062A\u062E\u0641\u06CC\u0641 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A \u06CC\u0627 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A.");
  if (body.subtotal < cp.min_amount) return fail(c, 400, `\u062D\u062F\u0627\u0642\u0644 \u062E\u0631\u06CC\u062F \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u06A9\u062F ${cp.min_amount.toLocaleString("fa-IR")} \u062A\u0648\u0645\u0627\u0646 \u0627\u0633\u062A.`);
  if (cp.max_uses !== null && cp.uses >= cp.max_uses) return fail(c, 400, "\u0638\u0631\u0641\u06CC\u062A \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0627\u06CC\u0646 \u06A9\u062F \u062A\u06A9\u0645\u06CC\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A.");
  return c.json({ percent: cp.percent, label: cp.label });
});
app.post("/api/payments/start", async (c) => {
  const limited = limit(c, "pay", 30, 36e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({ code: external_exports.string().max(20), token: external_exports.string().max(100).nullable().optional(), gateway: external_exports.enum(["zarinpal", "zibal", "sep", "sadad"]) }));
  const order2 = await findOrderWithAccess(c, body.code, body.token);
  if (order2.payment_status !== "pending" || order2.status !== "pending" || order2.payment_method !== "online") return fail(c, 409, "\u0627\u06CC\u0646 \u0633\u0641\u0627\u0631\u0634 \u0642\u0627\u0628\u0644 \u067E\u0631\u062F\u0627\u062E\u062A \u0622\u0646\u0644\u0627\u06CC\u0646 \u0646\u06CC\u0633\u062A.");
  if (order2.expires_at && order2.expires_at < /* @__PURE__ */ new Date()) return fail(c, 410, "\u0645\u0647\u0644\u062A \u067E\u0631\u062F\u0627\u062E\u062A \u0627\u06CC\u0646 \u0633\u0641\u0627\u0631\u0634 \u062A\u0645\u0627\u0645 \u0634\u062F\u0647 \u0627\u0633\u062A.");
  const gw = await loadGateway(body.gateway);
  if (!gw.enabled) return fail(c, 400, "\u0627\u06CC\u0646 \u062F\u0631\u06AF\u0627\u0647 \u0641\u0639\u0627\u0644 \u0646\u06CC\u0633\u062A.");
  if (REQUIRED_FIELDS[body.gateway].some((f) => !gw.fields[f]) && !(body.gateway === "zibal" && gw.mode === "sandbox")) return fail(c, 503, "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0627\u06CC\u0646 \u062F\u0631\u06AF\u0627\u0647 \u06A9\u0627\u0645\u0644 \u0646\u06CC\u0633\u062A.");
  const token = randomToken(32);
  const [payment] = await sql`insert into payments (order_id, gateway, amount, token_hash) values (${order2.id}, ${body.gateway}, ${order2.total}, ${sha2563(token)}) returning id`;
  try {
    const result = await gateways[body.gateway].start({
      paymentId: Number(payment.id),
      amountToman: order2.total,
      mobile: order2.phone,
      description: `\u0633\u0641\u0627\u0631\u0634 ${order2.code} - 50500.shop`,
      callbackUrl: `${config.appOrigin}/api/payments/callback/${body.gateway}?t=${encodeURIComponent(token)}`,
      creds: gw.fields,
      mode: gw.mode
    });
    await sql`update payments set authority = ${result.authority} where id = ${payment.id}`;
    return c.json({ redirectUrl: result.redirectUrl });
  } catch (error) {
    await sql`update payments set status = 'failed', raw = ${sql.json({ error: String(error) })} where id = ${payment.id}`;
    if (isGatewayError(error)) return fail(c, 502, error.message);
    throw error;
  }
});
app.post("/api/payments/card", async (c) => {
  const body = await readBody(c, external_exports.object({ code: external_exports.string().max(20), token: external_exports.string().max(100).nullable().optional() }));
  const order2 = await findOrderWithAccess(c, body.code, body.token);
  const card = await loadGateway("card");
  if (!card.enabled) return fail(c, 400, "\u067E\u0631\u062F\u0627\u062E\u062A \u06A9\u0627\u0631\u062A\u200C\u0628\u0647\u200C\u06A9\u0627\u0631\u062A \u0641\u0639\u0627\u0644 \u0646\u06CC\u0633\u062A.");
  if (order2.payment_status !== "pending" || order2.status !== "pending") return fail(c, 409, "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A \u0627\u06CC\u0646 \u0633\u0641\u0627\u0631\u0634 \u0642\u0627\u0628\u0644 \u062A\u063A\u06CC\u06CC\u0631 \u0646\u06CC\u0633\u062A.");
  const [updated] = await sql`update orders set payment_method = 'card', expires_at = now() + interval '24 hours', updated_at = now() where id = ${order2.id} returning *`;
  return c.json({ order: mapOrder(updated) });
});
app.all("/api/payments/callback/:gateway", async (c) => {
  const gatewayId = c.req.param("gateway");
  const token = c.req.query("t") ?? "";
  const fallback = "/#/track?pay=invalid";
  if (!(gatewayId in gateways) || !token) return c.redirect(fallback, 303);
  const params = {};
  for (const [k, v] of Object.entries(c.req.query())) params[k] = String(v);
  if (c.req.method === "POST") {
    const form = await c.req.parseBody().catch(() => ({}));
    for (const [k, v] of Object.entries(form)) if (typeof v === "string") params[k] = v;
  }
  const [payment] = await sql`
    select p.id, p.order_id, p.status, p.amount, p.authority, o.code from payments p join orders o on o.id = p.order_id
    where p.token_hash = ${sha2563(token)} and p.gateway = ${gatewayId}`;
  if (!payment) return c.redirect(fallback, 303);
  const done = (ok) => c.redirect(`/#/order/${payment.code}?pay=${ok ? "success" : "failed"}`, 303);
  if (payment.status === "paid") return done(true);
  const info = gateways[gatewayId].parseCallback(params);
  const authorityMatches = gatewayId === "sep" ? params.ResNum === String(payment.id) : info.authority !== null && info.authority === payment.authority;
  if (!info.success || !authorityMatches || !payment.authority) {
    await sql`update payments set status = 'failed', raw = ${sql.json(params)} where id = ${payment.id} and status = 'initiated'`;
    return done(false);
  }
  const gw = await loadGateway(gatewayId);
  const verified = await gateways[gatewayId].verify({
    paymentId: Number(payment.id),
    amountToman: payment.amount,
    authority: payment.authority,
    reference: info.reference,
    creds: gw.fields,
    mode: gw.mode
  }).catch((error) => ({ ok: false, refId: null, cardPan: null, message: String(error), raw: null }));
  if (!verified.ok) {
    await sql`update payments set status = 'failed', raw = ${sql.json({ params, verify: verified.raw, message: verified.message })} where id = ${payment.id} and status = 'initiated'`;
    return done(false);
  }
  try {
    await sql.begin(async (tx) => {
      const [locked] = await tx`select status from payments where id = ${payment.id} for update`;
      if (locked.status === "paid") return;
      await tx`update payments set status = 'paid', ref_id = ${verified.refId}, card_pan = ${verified.cardPan}, raw = ${tx.json(verified.raw)}, verified_at = now() where id = ${payment.id}`;
      const [order2] = await tx`select status from orders where id = ${payment.order_id} for update`;
      if (order2.status === "cancelled") {
        await tx`update orders set payment_status = 'paid_review', note = coalesce(note, '') || ' پرداخت پس از لغو؛ نیاز به بررسی/استرداد.', updated_at = now() where id = ${payment.order_id}`;
      } else {
        await tx`update orders set payment_status = 'paid', status = case when status = 'pending' then 'confirmed' else status end, expires_at = null, updated_at = now() where id = ${payment.order_id}`;
      }
    });
  } catch (error) {
    if (isUnique(error)) {
      await sql`update payments set status = 'failed', raw = ${sql.json({ replay: verified.refId })} where id = ${payment.id} and status = 'initiated'`;
      return done(false);
    }
    throw error;
  }
  return done(true);
});
app.post("/api/admin/login", async (c) => {
  const body = await readBody(c, external_exports.object({ email, password: external_exports.string().max(200), totp: external_exports.string().max(10).optional() }));
  const limited = limit(c, "admin-login", 10, 9e5) ?? limit(c, `admin-login:${body.email}`, 8, 9e5);
  if (limited) return limited;
  const [row] = await sql`
    select id, email, name, role, permissions, totp_enabled, password_hash, totp_secret_enc, totp_last_counter, locked_until, active from admins where lower(email) = ${body.email}`;
  if (!row || !row.active) {
    await burnPasswordCheck(body.password);
    return fail(c, 401, "\u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  }
  if (row.locked_until && row.locked_until > /* @__PURE__ */ new Date()) return fail(c, 429, "\u0628\u0647 \u062F\u0644\u06CC\u0644 \u062A\u0644\u0627\u0634\u200C\u0647\u0627\u06CC \u0646\u0627\u0645\u0648\u0641\u0642\u060C \u0648\u0631\u0648\u062F \u0645\u0648\u0642\u062A\u0627\u064B \u0642\u0641\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A.");
  if (!await verifyPassword(body.password, row.password_hash)) {
    await sql`update admins set failed_logins = failed_logins + 1,
      locked_until = case when failed_logins + 1 >= 6 then now() + interval '30 minutes' else locked_until end where id = ${row.id}`;
    await audit(Number(row.id), "admin.login_failed", {}, c.get("ip"));
    return fail(c, 401, "\u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  }
  if (row.totp_enabled && row.totp_secret_enc) {
    if (!body.totp) return c.json({ needTotp: true });
    const counter = verifyTotp(decrypt(row.totp_secret_enc), normalizeDigits(body.totp), Number(row.totp_last_counter));
    if (counter === null) {
      await sql`update admins set failed_logins = failed_logins + 1 where id = ${row.id}`;
      return fail(c, 401, "\u06A9\u062F \u062A\u0623\u06CC\u06CC\u062F \u062F\u0648\u0645\u0631\u062D\u0644\u0647\u200C\u0627\u06CC \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.", { needTotp: true });
    }
    await sql`update admins set totp_last_counter = ${counter} where id = ${row.id}`;
  }
  await sql`update admins set failed_logins = 0, locked_until = null where id = ${row.id}`;
  await destroySession(c, "admin");
  await createSession(c, "admin", row.id);
  await audit(Number(row.id), "admin.login", {}, c.get("ip"));
  return c.json({ admin: publicAdmin(row) });
});
app.post("/api/admin/logout", async (c) => {
  await destroySession(c, "admin");
  return c.json({ ok: true });
});
app.get("/api/admin/me", (c) => c.json({ admin: publicAdmin(requireAdmin(c)) }));
app.post("/api/admin/password", async (c) => {
  const admin = requireAdmin(c);
  const body = await readBody(c, external_exports.object({ current: external_exports.string().max(200), next: external_exports.string().min(12, "\u0631\u0645\u0632 \u0645\u062F\u06CC\u0631 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F1\u06F2 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F.").max(200) }));
  const [row] = await sql`select password_hash from admins where id = ${admin.id}`;
  if (!await verifyPassword(body.current, row.password_hash)) return fail(c, 400, "\u0631\u0645\u0632 \u0641\u0639\u0644\u06CC \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  await sql`update admins set password_hash = ${await hashPassword(body.next)} where id = ${admin.id}`;
  await sql`delete from sessions where kind = 'admin' and subject_id = ${admin.id}`;
  await createSession(c, "admin", admin.id);
  await audit(Number(admin.id), "admin.password_changed", {}, c.get("ip"));
  return c.json({ ok: true });
});
app.post("/api/admin/totp/setup", async (c) => {
  const admin = requireAdmin(c);
  const secret = generateTotpSecret();
  await sql`update admins set totp_pending_enc = ${encrypt(secret)} where id = ${admin.id}`;
  return c.json({ secret, uri: totpUri(secret, admin.email) });
});
app.post("/api/admin/totp/enable", async (c) => {
  const admin = requireAdmin(c);
  const body = await readBody(c, external_exports.object({ code: external_exports.string().max(10) }));
  const [row] = await sql`select totp_pending_enc from admins where id = ${admin.id}`;
  if (!row?.totp_pending_enc) return fail(c, 400, "\u0627\u0628\u062A\u062F\u0627 \u0631\u0627\u0647\u200C\u0627\u0646\u062F\u0627\u0632\u06CC \u0631\u0627 \u0634\u0631\u0648\u0639 \u06A9\u0646\u06CC\u062F.");
  const counter = verifyTotp(decrypt(row.totp_pending_enc), normalizeDigits(body.code));
  if (counter === null) return fail(c, 400, "\u06A9\u062F \u0648\u0627\u0631\u062F \u0634\u062F\u0647 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A\u061B \u0633\u0627\u0639\u062A \u06AF\u0648\u0634\u06CC \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F.");
  await sql`update admins set totp_secret_enc = totp_pending_enc, totp_pending_enc = null, totp_enabled = true, totp_last_counter = ${counter} where id = ${admin.id}`;
  await audit(Number(admin.id), "admin.totp_enabled", {}, c.get("ip"));
  return c.json({ ok: true });
});
app.post("/api/admin/totp/disable", async (c) => {
  const admin = requireAdmin(c);
  const body = await readBody(c, external_exports.object({ password: external_exports.string().max(200), code: external_exports.string().max(10) }));
  const [row] = await sql`select password_hash, totp_secret_enc, totp_last_counter from admins where id = ${admin.id}`;
  const okPassword = await verifyPassword(body.password, row.password_hash);
  const okCode = row.totp_secret_enc ? verifyTotp(decrypt(row.totp_secret_enc), normalizeDigits(body.code), Number(row.totp_last_counter)) !== null : false;
  if (!okPassword || !okCode) return fail(c, 400, "\u0631\u0645\u0632 \u06CC\u0627 \u06A9\u062F \u062A\u0623\u06CC\u06CC\u062F \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
  await sql`update admins set totp_enabled = false, totp_secret_enc = null, totp_last_counter = -1 where id = ${admin.id}`;
  await audit(Number(admin.id), "admin.totp_disabled", {}, c.get("ip"));
  return c.json({ ok: true });
});
app.get("/api/admin/bootstrap", async (c) => {
  const admin = requireAdmin(c);
  const [control, siteContent, orders, gws, custom2] = await Promise.all([
    getSetting("control"),
    getSetting("site_content"),
    sql`select * from orders order by created_at desc limit 500`,
    adminGateways(),
    customProducts(true)
  ]);
  return c.json({ admin: publicAdmin(admin), control, siteContent, orders: orders.map(mapAdminOrder), gateways: gws, customProducts: custom2 });
});
app.put("/api/admin/settings/:key", async (c) => {
  const key = c.req.param("key");
  const module = key === "site_content" ? "content" : key === "control" ? "pages" : null;
  if (!module) return fail(c, 404, "\u062A\u0646\u0638\u06CC\u0645 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.");
  const admin = requireAdmin(c, module, true);
  const body = await readBody(c, external_exports.object({ value: external_exports.record(external_exports.unknown()) }));
  if (key === "control") {
    delete body.value.secrets;
  }
  await sql`insert into settings (key, value, updated_by) values (${key}, ${sql.json(body.value)}, ${admin.id})
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
  await audit(Number(admin.id), `settings.${key}`, {}, c.get("ip"));
  return c.json({ ok: true });
});
app.patch("/api/admin/products/:slug", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const slug = c.req.param("slug");
  const body = await readBody(c, external_exports.object({
    title: external_exports.string().trim().min(3).max(200).optional(),
    price: external_exports.number().int().min(0).max(1e10).optional(),
    comparePrice: external_exports.number().int().min(0).max(1e10).nullable().optional(),
    stock: external_exports.number().int().min(0).max(1e6).optional(),
    active: external_exports.boolean().optional(),
    image: external_exports.string().regex(IMAGE_REF, "\u0622\u062F\u0631\u0633 \u062A\u0635\u0648\u06CC\u0631 \u0645\u062C\u0627\u0632 \u0646\u06CC\u0633\u062A.").nullable().optional(),
    cost: external_exports.number().int().min(0).max(1e10).optional(),
    body: external_exports.string().trim().max(5e3).optional(),
    brandName: external_exports.string().trim().max(60).nullable().optional()
  }));
  const [row] = await sql`update products set
      body = coalesce(${body.body ?? null}, body),
      brand_name = case when ${body.brandName !== void 0} then ${body.brandName ?? null} else brand_name end,
      title = coalesce(${body.title ?? null}, title),
      price = coalesce(${body.price ?? null}, price),
      compare_price = case when ${body.comparePrice !== void 0} then ${body.comparePrice ?? null}::int else compare_price end,
      stock = coalesce(${body.stock ?? null}, stock),
      active = coalesce(${body.active ?? null}, active),
      image = case when ${body.image !== void 0} then ${body.image ?? null} else image end,
      cost = coalesce(${body.cost ?? null}, cost),
      updated_at = now()
    where slug = ${slug} returning slug, price, stock, active`;
  if (!row) return fail(c, 404, "\u0645\u062D\u0635\u0648\u0644 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  await audit(Number(admin.id), "product.update", { slug, ...body }, c.get("ip"));
  return c.json({ product: row });
});
var productSchema = external_exports.object({
  slug: external_exports.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,80}$/, "\u0634\u0646\u0627\u0633\u0647 \u0641\u0642\u0637 \u062D\u0631\u0648\u0641 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC \u06A9\u0648\u0686\u06A9\u060C \u0639\u062F\u062F \u0648 \u062E\u0637 \u062A\u06CC\u0631\u0647 (\u06F3 \u062A\u0627 \u06F8\u06F0 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)."),
  title: external_exports.string().trim().min(3, "\u0639\u0646\u0648\u0627\u0646 \u0631\u0627 \u06A9\u0627\u0645\u0644 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.").max(200),
  category: external_exports.enum(["embroidered-leather", "accessories"]),
  price: external_exports.number().int().min(1e3, "\u0642\u06CC\u0645\u062A \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A.").max(1e10),
  comparePrice: external_exports.number().int().min(0).max(1e10).nullable().default(null),
  stock: external_exports.number().int().min(0).max(1e6).default(0),
  image: external_exports.string().regex(IMAGE_REF, "\u0622\u062F\u0631\u0633 \u062A\u0635\u0648\u06CC\u0631 \u0645\u062C\u0627\u0632 \u0646\u06CC\u0633\u062A.").nullable().default(null),
  body: external_exports.string().trim().max(5e3).default(""),
  brandName: external_exports.string().trim().max(60).nullable().default(null),
  active: external_exports.boolean().default(true),
  cost: external_exports.number().int().min(0).max(1e10).default(0)
});
app.post("/api/admin/products", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const body = await readBody(c, productSchema);
  if (body.comparePrice !== null && body.comparePrice <= body.price) return fail(c, 400, "\u0642\u06CC\u0645\u062A \u0642\u0628\u0644 \u0627\u0632 \u062A\u062E\u0641\u06CC\u0641 \u0628\u0627\u06CC\u062F \u0628\u06CC\u0634\u062A\u0631 \u0627\u0632 \u0642\u06CC\u0645\u062A \u0641\u0631\u0648\u0634 \u0628\u0627\u0634\u062F.");
  try {
    await sql`insert into products (slug, title, category, price, compare_price, stock, image, body, brand_name, active, cost, custom)
      values (${body.slug}, ${body.title}, ${body.category}, ${body.price}, ${body.comparePrice}, ${body.stock}, ${body.image}, ${body.body}, ${body.brandName}, ${body.active}, ${body.cost}, true)`;
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "\u0645\u062D\u0635\u0648\u0644\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0634\u0646\u0627\u0633\u0647 \u0648\u062C\u0648\u062F \u062F\u0627\u0631\u062F.");
    throw error;
  }
  await audit(Number(admin.id), "product.create", { slug: body.slug }, c.get("ip"));
  return c.json({ products: await customProducts(true) });
});
app.delete("/api/admin/products/:slug", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const slug = c.req.param("slug");
  const [row] = await sql`select custom from products where slug = ${slug}`;
  if (!row) return fail(c, 404, "\u0645\u062D\u0635\u0648\u0644 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  if (!row.custom) return fail(c, 409, "\u0645\u062D\u0635\u0648\u0644\u0627\u062A \u067E\u0627\u06CC\u0647 \u06A9\u0627\u062A\u0627\u0644\u0648\u06AF \u062D\u0630\u0641 \u0646\u0645\u06CC\u200C\u0634\u0648\u0646\u062F\u061B \u0622\u0646 \u0631\u0627 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u06A9\u0646\u06CC\u062F.");
  await sql`delete from products where slug = ${slug}`;
  await audit(Number(admin.id), "product.delete", { slug }, c.get("ip"));
  return c.json({ ok: true });
});
app.post("/api/admin/products/bulk", async (c) => {
  const admin = requireAdmin(c, "products", true);
  const body = await readBody(c, external_exports.object({
    slugs: external_exports.array(external_exports.string().max(120)).min(1).max(500),
    action: external_exports.enum(["price_percent", "price_set", "stock_set", "stock_add", "activate", "deactivate", "compare_clear"]),
    value: external_exports.number().optional()
  }));
  const value = body.value ?? 0;
  if (body.action === "price_percent" && (value < -90 || value > 500)) return fail(c, 400, "\u062F\u0631\u0635\u062F \u062A\u063A\u06CC\u06CC\u0631 \u0642\u06CC\u0645\u062A \u0628\u0627\u06CC\u062F \u0628\u06CC\u0646 \u200E-\u06F9\u06F0 \u062A\u0627 \u06F5\u06F0\u06F0 \u0628\u0627\u0634\u062F.");
  if ((body.action === "price_set" || body.action === "stock_set") && value < 0) return fail(c, 400, "\u0645\u0642\u062F\u0627\u0631 \u0646\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0645\u0646\u0641\u06CC \u0628\u0627\u0634\u062F.");
  const result = await sql.begin(async (tx) => {
    let changed = 0;
    for (const slug of body.slugs) {
      const [row] = await tx`select price, stock from products where slug = ${slug} for update`;
      if (!row) continue;
      if (body.action === "price_percent") await tx`update products set price = greatest(1000, round(price * (1 + ${value}::numeric / 100) / 10000) * 10000)::int, updated_at = now() where slug = ${slug}`;
      else if (body.action === "price_set") await tx`update products set price = ${Math.round(value)}, updated_at = now() where slug = ${slug}`;
      else if (body.action === "stock_set") await tx`update products set stock = ${Math.round(value)}, updated_at = now() where slug = ${slug}`;
      else if (body.action === "stock_add") await tx`update products set stock = greatest(0, stock + ${Math.round(value)}), updated_at = now() where slug = ${slug}`;
      else if (body.action === "activate") await tx`update products set active = true, updated_at = now() where slug = ${slug}`;
      else if (body.action === "deactivate") await tx`update products set active = false, updated_at = now() where slug = ${slug}`;
      else if (body.action === "compare_clear") await tx`update products set compare_price = null, updated_at = now() where slug = ${slug}`;
      changed++;
    }
    return changed;
  });
  await audit(Number(admin.id), "product.bulk", { action: body.action, value, count: result }, c.get("ip"));
  const [overrides, custom2] = await Promise.all([productOverrides(), customProducts(true)]);
  return c.json({ changed: result, productOverrides: overrides, customProducts: custom2 });
});
app.get("/api/admin/orders", async (c) => {
  requireAdmin(c, "orders");
  const rows = await sql`select * from orders order by created_at desc limit 500`;
  return c.json({ orders: rows.map(mapAdminOrder) });
});
app.get("/api/admin/orders/:code/events", async (c) => {
  requireAdmin(c, "orders");
  const rows = await sql`
    select e.id, e.kind, e.detail, e.created_at, a.email from order_events e join orders o on o.id = e.order_id left join admins a on a.id = e.admin_id
    where o.code = ${c.req.param("code")} order by e.created_at desc limit 100`;
  return c.json({ events: rows.map((r) => ({ id: r.id, kind: r.kind, detail: r.detail, by: r.email, at: r.created_at.toISOString() })) });
});
app.post("/api/admin/orders/bulk", async (c) => {
  const admin = requireAdmin(c, "orders", true);
  const body = await readBody(c, external_exports.object({ codes: external_exports.array(external_exports.string().max(20)).min(1).max(200), status: external_exports.enum(ORDER_STATUSES) }));
  let changed = 0;
  await sql.begin(async (tx) => {
    for (const code of body.codes) {
      const [order2] = await tx`select * from orders where code = ${code} for update`;
      if (!order2 || order2.status === body.status || order2.status === "cancelled") continue;
      if (body.status === "cancelled") for (const item of order2.items) await tx`update products set stock = stock + ${item.qty} where slug = ${item.slug}`;
      await tx`update orders set status = ${body.status}, updated_at = now() where id = ${order2.id}`;
      await tx`insert into order_events (order_id, admin_id, kind, detail) values (${order2.id}, ${admin.id}, 'status', ${`\u062A\u063A\u06CC\u06CC\u0631 \u06AF\u0631\u0648\u0647\u06CC \u0648\u0636\u0639\u06CC\u062A \u0628\u0647 ${body.status}`})`;
      changed++;
    }
  });
  await audit(Number(admin.id), "order.bulk_status", { count: changed, status: body.status }, c.get("ip"));
  return c.json({ changed });
});
app.patch("/api/admin/orders/:code", async (c) => {
  const admin = requireAdmin(c, "orders", true);
  const code = c.req.param("code");
  const body = await readBody(c, external_exports.object({
    status: external_exports.enum(ORDER_STATUSES).optional(),
    payment: external_exports.enum(["paid", "pending", "cod", "refunded"]).optional(),
    tracking: external_exports.string().trim().max(60).optional(),
    note: external_exports.string().trim().max(1e3).optional()
  }));
  const updated = await sql.begin(async (tx) => {
    const [order2] = await tx`select * from orders where code = ${code} for update`;
    if (!order2) throw new HttpError(404, "\u0633\u0641\u0627\u0631\u0634 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
    if (body.status && order2.status === "cancelled" && body.status !== "cancelled") throw new HttpError(409, "\u0633\u0641\u0627\u0631\u0634 \u0644\u063A\u0648\u0634\u062F\u0647 \u0642\u0627\u0628\u0644 \u0628\u0627\u0632\u06AF\u0634\u062A \u0646\u06CC\u0633\u062A\u061B \u0633\u0641\u0627\u0631\u0634 \u062C\u062F\u06CC\u062F \u062B\u0628\u062A \u06A9\u0646\u06CC\u062F.");
    if (body.status === "cancelled" && order2.status !== "cancelled") {
      for (const item of order2.items) await tx`update products set stock = stock + ${item.qty} where slug = ${item.slug}`;
    }
    const [row] = await tx`update orders set
        status = coalesce(${body.status ?? null}, status),
        payment_status = coalesce(${body.payment ?? null}, payment_status),
        expires_at = case when ${body.payment === "paid" || body.status === "cancelled"} then null else expires_at end,
        tracking = coalesce(${body.tracking ?? null}, tracking),
        note = coalesce(${body.note ?? null}, note),
        updated_at = now()
      where id = ${order2.id} returning *`;
    const detail = [
      body.status && body.status !== order2.status ? `\u0648\u0636\u0639\u06CC\u062A: ${order2.status} \u2192 ${body.status}` : null,
      body.payment && body.payment !== order2.payment_status ? `\u067E\u0631\u062F\u0627\u062E\u062A: ${order2.payment_status} \u2192 ${body.payment}` : null,
      body.tracking && body.tracking !== order2.tracking ? `\u06A9\u062F \u0631\u0647\u06AF\u06CC\u0631\u06CC: ${body.tracking}` : null,
      body.note !== void 0 && body.note !== order2.note ? "\u06CC\u0627\u062F\u062F\u0627\u0634\u062A \u062F\u0627\u062E\u0644\u06CC \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0634\u062F" : null
    ].filter(Boolean).join(" \xB7 ");
    if (detail) await tx`insert into order_events (order_id, admin_id, kind, detail) values (${order2.id}, ${admin.id}, 'update', ${detail})`;
    return row;
  });
  await audit(Number(admin.id), "order.update", { code, ...body }, c.get("ip"));
  return c.json({ order: mapAdminOrder(updated) });
});
app.put("/api/admin/gateways/:id", async (c) => {
  const admin = requireAdmin(c, "payments", true);
  const id = c.req.param("id");
  if (!GATEWAY_IDS.includes(id)) return fail(c, 404, "\u062F\u0631\u06AF\u0627\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A.");
  const body = await readBody(c, external_exports.object({
    enabled: external_exports.boolean(),
    mode: external_exports.enum(["sandbox", "production"]),
    currency: external_exports.enum(["IRT", "IRR"]),
    position: external_exports.number().int().min(1).max(20),
    fields: external_exports.record(external_exports.string().max(500)).default({}),
    secrets: external_exports.record(external_exports.string().max(500)).default({})
  }));
  const current = await loadGateway(id);
  const fields = { ...current.fields };
  for (const [k, v] of Object.entries(body.fields)) if (!k.startsWith("__")) fields[k] = v.trim();
  for (const [k, v] of Object.entries(body.secrets)) if ((SECRET_FIELDS[id] ?? []).includes(k) && v.trim()) fields[k] = v.trim();
  if (id === "card" && fields.cardNumber) fields.cardNumber = normalizeDigits(fields.cardNumber).replace(/\D/g, "");
  if (body.enabled) {
    const required = id === "card" ? ["owner", "cardNumber"] : REQUIRED_FIELDS[id];
    const missing = required.filter((f) => !fields[f]);
    if (missing.length && !(id === "zibal" && body.mode === "sandbox")) return fail(c, 400, `\u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u0627\u0644\u0632\u0627\u0645\u06CC \u06A9\u0627\u0645\u0644 \u0646\u06CC\u0633\u062A: ${missing.join("\u060C ")}`);
    if (id === "card" && fields.cardNumber.length !== 16) return fail(c, 400, "\u0634\u0645\u0627\u0631\u0647 \u06A9\u0627\u0631\u062A \u0628\u0627\u06CC\u062F \u06F1\u06F6 \u0631\u0642\u0645 \u0628\u0627\u0634\u062F.");
    if (id === "sadad") {
      const keyLen = Buffer.from(fields.secretKey ?? "", "base64").length;
      if (keyLen !== 24 && keyLen !== 16) return fail(c, 400, "\u06A9\u0644\u06CC\u062F \u062A\u0631\u0645\u06CC\u0646\u0627\u0644 \u0633\u062F\u0627\u062F \u0628\u0627\u06CC\u062F Base64 \u0645\u0639\u062A\u0628\u0631 \u0628\u0627\u0634\u062F.");
    }
  }
  const meta = { enabled: body.enabled, mode: body.mode, currency: body.currency, position: body.position };
  await sql`insert into vault (key, value_enc, meta) values (${`gateway:${id}`}, ${encrypt(JSON.stringify(fields))}, ${sql.json(meta)})
    on conflict (key) do update set value_enc = excluded.value_enc, meta = excluded.meta, updated_at = now()`;
  await audit(Number(admin.id), "gateway.update", { id, ...meta }, c.get("ip"));
  return c.json({ gateways: await adminGateways() });
});
var mapMedia = (m) => ({
  id: m.id,
  name: m.name,
  mime: m.mime,
  size: m.size,
  width: m.width,
  height: m.height,
  alt: m.alt,
  folder: m.folder,
  tags: m.tags,
  dataUrl: `/media/${m.id}`,
  createdAt: m.created_at.toISOString(),
  updatedAt: m.updated_at.toISOString()
});
app.get("/api/admin/media", async (c) => {
  requireAdmin(c, "media");
  const rows = await sql`select id, name, mime, size, width, height, alt, folder, tags, created_at, updated_at from media order by created_at desc limit 1000`;
  return c.json({ media: rows.map(mapMedia) });
});
app.post("/api/admin/media", async (c) => {
  const admin = requireAdmin(c, "media", true);
  const limited = limit(c, `upload:${admin.id}`, 60, 36e5);
  if (limited) return limited;
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return fail(c, 400, "\u0641\u0627\u06CC\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.");
  if (file.size > 5 * 1024 * 1024) return fail(c, 413, "\u062D\u062C\u0645 \u062A\u0635\u0648\u06CC\u0631 \u0628\u0627\u06CC\u062F \u06A9\u0645\u062A\u0631 \u0627\u0632 \u06F5 \u0645\u06AF\u0627\u0628\u0627\u06CC\u062A \u0628\u0627\u0634\u062F.");
  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 4e7 }).metadata();
  } catch {
    return fail(c, 400, "\u0641\u0627\u06CC\u0644 \u062A\u0635\u0648\u06CC\u0631 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A.");
  }
  if (!meta.format || !["jpeg", "png", "webp", "gif", "avif", "heif"].includes(meta.format)) return fail(c, 400, "\u0641\u0642\u0637 JPG\u060C PNG\u060C WebP\u060C GIF \u06CC\u0627 AVIF \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.");
  const { data, info } = await sharp(input, { limitInputPixels: 4e7 }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const id = randomToken(12);
  const name = String(form.name ?? file.name).replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120).replace(/\.[^.]+$/, "") + ".webp";
  const folder = String(form.folder ?? "\u0639\u0645\u0648\u0645\u06CC").trim().slice(0, 60) || "\u0639\u0645\u0648\u0645\u06CC";
  const [row] = await sql`insert into media (id, name, mime, size, width, height, alt, folder, data)
    values (${id}, ${name}, 'image/webp', ${data.length}, ${info.width}, ${info.height}, ${name.replace(/\.webp$/, "")}, ${folder}, ${data})
    returning id, name, mime, size, width, height, alt, folder, tags, created_at, updated_at`;
  await audit(Number(admin.id), "media.upload", { id, name }, c.get("ip"));
  return c.json({ asset: mapMedia(row) });
});
app.patch("/api/admin/media/:id", async (c) => {
  requireAdmin(c, "media", true);
  const body = await readBody(c, external_exports.object({ name: external_exports.string().trim().min(1).max(120).optional(), alt: external_exports.string().max(300).optional(), folder: external_exports.string().trim().max(60).optional(), tags: external_exports.array(external_exports.string().max(40)).max(20).optional() }));
  const [row] = await sql`update media set name = coalesce(${body.name ?? null}, name), alt = coalesce(${body.alt ?? null}, alt),
      folder = coalesce(${body.folder ?? null}, folder), tags = coalesce(${body.tags ? sql.json(body.tags) : null}, tags), updated_at = now()
    where id = ${c.req.param("id")} returning id, name, mime, size, width, height, alt, folder, tags, created_at, updated_at`;
  if (!row) return fail(c, 404, "\u062A\u0635\u0648\u06CC\u0631 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  return c.json({ asset: mapMedia(row) });
});
app.delete("/api/admin/media/:id", async (c) => {
  const admin = requireAdmin(c, "media", true);
  const id = c.req.param("id");
  const [inUse] = await sql`select slug from products where image = ${`/media/${id}`} limit 1`;
  if (inUse) return fail(c, 409, `\u0627\u06CC\u0646 \u062A\u0635\u0648\u06CC\u0631 \u0631\u0648\u06CC \u0645\u062D\u0635\u0648\u0644 \xAB${inUse.slug}\xBB \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0634\u062F\u0647 \u0627\u0633\u062A.`);
  await sql`delete from media where id = ${id}`;
  await audit(Number(admin.id), "media.delete", { id }, c.get("ip"));
  return c.json({ ok: true });
});
app.get("/media/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return c.notFound();
  const [row] = await sql`select data, mime from media where id = ${id}`;
  if (!row) return c.notFound();
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" }
  });
});
var mapCoupon = (r) => ({ code: r.code, label: r.label, percent: r.percent, minAmount: r.min_amount, maxUses: r.max_uses, uses: r.uses, active: r.active, createdAt: r.created_at.toISOString() });
var couponSchema = external_exports.object({
  code: external_exports.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/, "\u06A9\u062F \u0628\u0627\u06CC\u062F \u06F3 \u062A\u0627 \u06F2\u06F4 \u062D\u0631\u0641 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC \u0628\u0632\u0631\u06AF\u060C \u0639\u062F\u062F \u06CC\u0627 \u062E\u0637 \u062A\u06CC\u0631\u0647 \u0628\u0627\u0634\u062F."),
  label: external_exports.string().trim().max(60).default(""),
  percent: external_exports.number().int().min(1).max(90),
  minAmount: external_exports.number().int().min(0).max(1e10).default(0),
  maxUses: external_exports.number().int().min(1).max(1e6).nullable().default(null),
  active: external_exports.boolean().default(true),
  uses: external_exports.number().int().min(0).max(1e6).optional()
});
app.get("/api/admin/coupons", async (c) => {
  requireAdmin(c, "coupons");
  const rows = await sql`select * from coupons order by created_at desc`;
  return c.json({ coupons: rows.map(mapCoupon) });
});
app.post("/api/admin/coupons", async (c) => {
  const admin = requireAdmin(c, "coupons", true);
  const body = await readBody(c, couponSchema);
  try {
    const [row] = await sql`insert into coupons (code, label, percent, min_amount, max_uses, active, uses)
      values (${body.code}, ${body.label}, ${body.percent}, ${body.minAmount}, ${body.maxUses}, ${body.active}, ${body.uses ?? 0}) returning *`;
    await audit(Number(admin.id), "coupon.create", { code: body.code }, c.get("ip"));
    return c.json({ coupon: mapCoupon(row) });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "\u0627\u06CC\u0646 \u06A9\u062F \u062A\u062E\u0641\u06CC\u0641 \u0642\u0628\u0644\u0627\u064B \u0633\u0627\u062E\u062A\u0647 \u0634\u062F\u0647 \u0627\u0633\u062A.");
    throw error;
  }
});
app.patch("/api/admin/coupons/:code", async (c) => {
  const admin = requireAdmin(c, "coupons", true);
  const code = c.req.param("code").toUpperCase();
  const body = await readBody(c, couponSchema.partial().omit({ code: true, uses: true }));
  const [row] = await sql`update coupons set
      label = coalesce(${body.label ?? null}, label),
      percent = coalesce(${body.percent ?? null}, percent),
      min_amount = coalesce(${body.minAmount ?? null}, min_amount),
      max_uses = case when ${body.maxUses !== void 0} then ${body.maxUses ?? null}::int else max_uses end,
      active = coalesce(${body.active ?? null}, active)
    where code = ${code} returning *`;
  if (!row) return fail(c, 404, "\u06A9\u062F \u062A\u062E\u0641\u06CC\u0641 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  await audit(Number(admin.id), "coupon.update", { code, ...body }, c.get("ip"));
  return c.json({ coupon: mapCoupon(row) });
});
app.delete("/api/admin/coupons/:code", async (c) => {
  const admin = requireAdmin(c, "coupons", true);
  const code = c.req.param("code").toUpperCase();
  const [row] = await sql`delete from coupons where code = ${code} returning *`;
  if (!row) return fail(c, 404, "\u06A9\u062F \u062A\u062E\u0641\u06CC\u0641 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  await audit(Number(admin.id), "coupon.delete", { code }, c.get("ip"));
  return c.json({ deleted: mapCoupon(row) });
});
var mapReview = (r) => ({ id: r.id, slug: r.slug, name: r.name, rating: r.rating, comment: r.comment, status: r.status, date: r.created_at.toISOString() });
app.get("/api/admin/reviews", async (c) => {
  requireAdmin(c, "reviews");
  const rows = await sql`select * from reviews order by created_at desc limit 500`;
  return c.json({ reviews: rows.map(mapReview) });
});
app.patch("/api/admin/reviews/:id", async (c) => {
  const admin = requireAdmin(c, "reviews", true);
  const body = await readBody(c, external_exports.object({ status: external_exports.enum(["pending", "approved", "rejected"]) }));
  const [row] = await sql`update reviews set status = ${body.status} where id = ${c.req.param("id")} returning *`;
  if (!row) return fail(c, 404, "\u0646\u0638\u0631 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  await audit(Number(admin.id), "review.moderate", { id: row.id, status: body.status }, c.get("ip"));
  return c.json({ review: mapReview(row) });
});
app.delete("/api/admin/reviews/:id", async (c) => {
  const admin = requireAdmin(c, "reviews", true);
  await sql`delete from reviews where id = ${c.req.param("id")}`;
  await audit(Number(admin.id), "review.delete", { id: c.req.param("id") }, c.get("ip"));
  return c.json({ ok: true });
});
var permsSchema = external_exports.record(external_exports.enum(MODULES), external_exports.object({ read: external_exports.boolean(), write: external_exports.boolean() })).transform((perms) => Object.fromEntries(Object.entries(perms).map(([k, v]) => [k, { read: v.read || v.write, write: v.write }])));
function requireOwner(c) {
  const admin = requireAdmin(c);
  if (admin.role !== "owner") throw new HttpError(403, "\u0627\u06CC\u0646 \u0639\u0645\u0644\u06CC\u0627\u062A \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0645\u062F\u06CC\u0631 \u0627\u0635\u0644\u06CC \u0627\u0633\u062A.");
  return admin;
}
app.get("/api/admin/staff", async (c) => {
  requireOwner(c);
  const rows = await sql`
    select id, email, name, active, permissions, totp_enabled, created_at from admins where role = 'staff' order by created_at`;
  return c.json({ staff: rows.map((r) => ({ id: r.id, email: r.email, name: r.name, active: r.active, permissions: r.permissions, totpEnabled: r.totp_enabled, createdAt: r.created_at.toISOString() })) });
});
app.post("/api/admin/staff", async (c) => {
  const owner = requireOwner(c);
  const body = await readBody(c, external_exports.object({
    name: external_exports.string().trim().min(3).max(80),
    email,
    password: external_exports.string().min(12, "\u0631\u0645\u0632 \u06A9\u0627\u0631\u0645\u0646\u062F \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F1\u06F2 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F.").max(200),
    permissions: permsSchema.default({})
  }));
  try {
    const [row] = await sql`insert into admins (email, name, password_hash, role, permissions)
      values (${body.email}, ${body.name}, ${await hashPassword(body.password)}, 'staff', ${sql.json(body.permissions)}) returning id`;
    await audit(Number(owner.id), "staff.create", { id: row.id, email: body.email }, c.get("ip"));
    return c.json({ id: row.id });
  } catch (error) {
    if (isUnique(error)) return fail(c, 409, "\u0627\u06CC\u0646 \u0627\u06CC\u0645\u06CC\u0644 \u0642\u0628\u0644\u0627\u064B \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A.");
    throw error;
  }
});
app.patch("/api/admin/staff/:id", async (c) => {
  const owner = requireOwner(c);
  const body = await readBody(c, external_exports.object({
    name: external_exports.string().trim().min(3).max(80).optional(),
    active: external_exports.boolean().optional(),
    permissions: permsSchema.optional(),
    password: external_exports.string().min(12, "\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F1\u06F2 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F.").max(200).optional()
  }));
  const [target] = await sql`select id, role from admins where id = ${c.req.param("id")}`;
  if (!target || target.role !== "staff") return fail(c, 404, "\u06A9\u0627\u0631\u0645\u0646\u062F \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  await sql`update admins set
      name = coalesce(${body.name ?? null}, name),
      active = coalesce(${body.active ?? null}, active),
      permissions = coalesce(${body.permissions ? sql.json(body.permissions) : null}, permissions),
      password_hash = coalesce(${body.password ? await hashPassword(body.password) : null}, password_hash),
      failed_logins = case when ${body.password !== void 0 || body.active === false} then 0 else failed_logins end,
      locked_until = case when ${body.password !== void 0} then null else locked_until end
    where id = ${target.id}`;
  if (body.password !== void 0 || body.active === false) await sql`delete from sessions where kind = 'admin' and subject_id = ${target.id}`;
  await audit(Number(owner.id), "staff.update", { id: target.id, active: body.active, passwordReset: body.password !== void 0 }, c.get("ip"));
  return c.json({ ok: true });
});
app.delete("/api/admin/staff/:id", async (c) => {
  const owner = requireOwner(c);
  const [target] = await sql`select id, role from admins where id = ${c.req.param("id")}`;
  if (!target || target.role !== "staff") return fail(c, 404, "\u06A9\u0627\u0631\u0645\u0646\u062F \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  await sql`delete from sessions where kind = 'admin' and subject_id = ${target.id}`;
  await sql`delete from admins where id = ${target.id}`;
  await audit(Number(owner.id), "staff.delete", { id: target.id }, c.get("ip"));
  return c.json({ ok: true });
});
app.post("/api/admin/customers/reset-password", async (c) => {
  const owner = requireOwner(c);
  const limited = limit(c, `cust-reset:${owner.id}`, 10, 36e5);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({ phone }));
  const [user] = await sql`select id, name from users where phone = ${body.phone}`;
  if (!user) return fail(c, 404, "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.");
  const tempPassword = `S${randomDigits(8)}x`;
  await sql`update users set password_hash = ${await hashPassword(tempPassword)}, failed_logins = 0, locked_until = null where id = ${user.id}`;
  await sql`delete from sessions where kind = 'user' and subject_id = ${user.id}`;
  await audit(Number(owner.id), "customer.password_reset", { userId: user.id }, c.get("ip"));
  return c.json({ name: user.name, tempPassword });
});
app.put("/api/admin/ai/keys", async (c) => {
  const admin = requireAdmin(c, "agents", true);
  const body = await readBody(c, external_exports.object({ provider: external_exports.enum(["openai", "anthropic"]), apiKey: external_exports.string().trim().min(20).max(300) }));
  await sql`insert into vault (key, value_enc) values (${`ai:${body.provider}`}, ${encrypt(body.apiKey)})
    on conflict (key) do update set value_enc = excluded.value_enc, updated_at = now()`;
  await audit(Number(admin.id), "ai.key_saved", { provider: body.provider }, c.get("ip"));
  return c.json({ ok: true });
});
app.post("/api/admin/ai/run", async (c) => {
  const admin = requireAdmin(c, "agents");
  const limited = limit(c, `ai:${admin.id}`, 30, 6e4);
  if (limited) return limited;
  const body = await readBody(c, external_exports.object({
    provider: external_exports.enum(["openai", "anthropic"]),
    model: external_exports.string().regex(/^[A-Za-z0-9._:-]{1,80}$/, "\u0646\u0627\u0645 \u0645\u062F\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A."),
    system: external_exports.string().max(8e3),
    input: external_exports.string().min(1).max(4e4),
    temperature: external_exports.number().min(0).max(1),
    maxTokens: external_exports.number().int().min(16).max(4e3)
  }));
  const [stored] = await sql`select value_enc from vault where key = ${`ai:${body.provider}`}`;
  const apiKey = stored ? decrypt(stored.value_enc) : body.provider === "openai" ? config.openaiKey : config.anthropicKey;
  if (!apiKey) return fail(c, 400, "\u06A9\u0644\u06CC\u062F API \u0627\u06CC\u0646 \u0633\u0631\u0648\u06CC\u0633 \u0631\u0648\u06CC \u0633\u0631\u0648\u0631 \u062A\u0646\u0638\u06CC\u0645 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.");
  const started = Date.now();
  const response = body.provider === "openai" ? await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(9e4),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: body.model, temperature: body.temperature, max_tokens: body.maxTokens, messages: [{ role: "system", content: body.system }, { role: "user", content: body.input }] })
  }) : await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(9e4),
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: body.model, system: body.system, temperature: body.temperature, max_tokens: body.maxTokens, messages: [{ role: "user", content: body.input }] })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return fail(c, 502, String(data?.error?.message ?? `\u062E\u0637\u0627\u06CC \u0633\u0631\u0648\u06CC\u0633 \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC (HTTP ${response.status})`));
  const text = body.provider === "openai" ? String(data?.choices?.[0]?.message?.content ?? "") : (Array.isArray(data?.content) ? data.content : []).filter((b2) => b2.type === "text").map((b2) => b2.text ?? "").join("\n");
  const tokens = body.provider === "openai" ? data?.usage?.total_tokens ?? null : (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0) || null;
  await audit(Number(admin.id), "ai.run", { provider: body.provider, model: body.model, tokens }, c.get("ip"));
  return c.json({ text, tokens, durationMs: Date.now() - started });
});
app.get("/api/admin/audit", async (c) => {
  const admin = requireAdmin(c);
  if (admin.role !== "owner") return fail(c, 403, "\u0641\u0642\u0637 \u0645\u062F\u06CC\u0631 \u0627\u0635\u0644\u06CC \u0628\u0647 \u06AF\u0632\u0627\u0631\u0634 \u0627\u0645\u0646\u06CC\u062A\u06CC \u062F\u0633\u062A\u0631\u0633\u06CC \u062F\u0627\u0631\u062F.");
  const rows = await sql`select l.id, l.action, l.meta, l.ip, l.created_at, a.email from audit_log l left join admins a on a.id = l.admin_id order by l.created_at desc limit 300`;
  return c.json({ entries: rows });
});
app.all("/api/*", (c) => fail(c, 404, "\u0645\u0633\u06CC\u0631 API \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F."));
app.get("*", (c) => serveStatic(c.req.path, c.req.header("accept-encoding") ?? "", c.req.header("if-none-match")) ?? c.text("Not found", 404));

// server/index.ts
async function main() {
  await migrate();
  loadStatic(config.staticDir);
  await expireUnpaidOrders();
  const timer2 = setInterval(() => expireUnpaidOrders().catch((error) => console.error("expire job failed:", error)), 5 * 6e4);
  const handler = async (request, env2) => {
    if (request.method !== "HEAD") return app.fetch(request, env2);
    const res = await app.fetch(new Request(request.url, { method: "GET", headers: request.headers }), env2);
    return new Response(null, { status: res.status, headers: res.headers });
  };
  const server = serve({ fetch: handler, port: config.port, hostname: "0.0.0.0" }, (info) => {
    console.log(`\u2713 50500.shop server listening on :${info.port} (${config.production ? "production" : "development"})`);
  });
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down\u2026`);
    clearInterval(timer2);
    server.close(() => void sql.end({ timeout: 5 }).finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 1e4).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
main().catch((error) => {
  console.error("\u274C startup failed:", error);
  process.exit(1);
});
