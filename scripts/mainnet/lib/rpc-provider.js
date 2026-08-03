"use strict";

const { ethers } = require("ethers");

const PLACEHOLDER_PATTERN = /^(?:tbd|todo|null|undefined|placeholder|changeme|replace[_-]?me|example|your(?:[_-].*)?|<[^>]*>)$/i;
const AUTH_MODES = new Set(["none", "bearer", "x-api-key", "custom"]);

function value(env, name) {
  return String(env[name] || "").trim();
}

function rejectPlaceholder(input, name) {
  if (!input || PLACEHOLDER_PATTERN.test(input)) {
    throw new Error(`${name} must not be empty or a placeholder`);
  }
  return input;
}

function maskSecret(input) {
  if (!input) return undefined;
  return "***";
}

function maskRpcUrl(input) {
  try {
    const url = new URL(input);
    url.username = "";
    url.password = "";
    url.pathname = url.pathname === "/" ? "/***" : "/***";
    if (url.search) url.search = "?***=masked";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch (_) {
    return "<masked-invalid-rpc-url>";
  }
}

function sanitizeRpcError(error, env = process.env) {
  let message = String(error?.shortMessage || error?.message || error || "unknown error")
    .replace(/https?:\/\/[^\s)\]}]+/gi, "<masked-rpc-url>");
  for (const name of ["RPC_BEARER_TOKEN", "RPC_X_API_KEY", "RPC_AUTH_HEADER_VALUE"]) {
    const secret = value(env, name);
    if (secret) message = message.split(secret).join("***");
  }
  return message;
}

function checkedHeaderValue(input, name) {
  const headerValue = rejectPlaceholder(input, name);
  if (/[\r\n]/.test(headerValue)) throw new Error(`${name} must not contain newline characters`);
  return headerValue;
}

function loadRpcConfig(env = process.env, urlName = "RPC_URL", { requireHttps = true } = {}) {
  const rpcUrl = rejectPlaceholder(value(env, urlName), urlName);
  let parsed;
  try {
    parsed = new URL(rpcUrl);
  } catch (_) {
    throw new Error(`${urlName} must be a valid ${requireHttps ? "HTTPS" : "HTTP(S)"} URL`);
  }
  if (requireHttps ? parsed.protocol !== "https:" : !/^https?:$/.test(parsed.protocol)) {
    throw new Error(`${urlName} must use ${requireHttps ? "HTTPS" : "HTTP or HTTPS"}`);
  }
  if (parsed.username || parsed.password) throw new Error(`${urlName} must not contain URL user credentials`);

  const authMode = value(env, "RPC_AUTH_MODE") || "none";
  if (!AUTH_MODES.has(authMode)) throw new Error("RPC_AUTH_MODE must be none, bearer, x-api-key, or custom");
  let headerName;
  let headerValue;
  let authSecret;
  if (authMode === "bearer") {
    headerName = "Authorization";
    authSecret = checkedHeaderValue(value(env, "RPC_BEARER_TOKEN"), "RPC_BEARER_TOKEN");
    headerValue = `Bearer ${authSecret}`;
  } else if (authMode === "x-api-key") {
    headerName = "X-API-Key";
    authSecret = checkedHeaderValue(value(env, "RPC_X_API_KEY"), "RPC_X_API_KEY");
    headerValue = authSecret;
  } else if (authMode === "custom") {
    headerName = rejectPlaceholder(value(env, "RPC_AUTH_HEADER_NAME"), "RPC_AUTH_HEADER_NAME");
    authSecret = checkedHeaderValue(value(env, "RPC_AUTH_HEADER_VALUE"), "RPC_AUTH_HEADER_VALUE");
    headerValue = authSecret;
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(headerName)) throw new Error("RPC_AUTH_HEADER_NAME must be a valid HTTP header name");
  }
  if (authSecret && (rpcUrl.includes(authSecret) || decodeURIComponent(rpcUrl).includes(authSecret))) {
    throw new Error(`${urlName} must not contain the configured RPC auth value`);
  }
  return {
    rpcUrl,
    rpcMasked: maskRpcUrl(rpcUrl),
    authMode,
    authProvided: authMode !== "none",
    authMasked: authMode === "none" ? undefined : { headerName, headerValue: maskSecret(headerValue) },
    headerName,
    headerValue,
    parsed,
  };
}

function createRpcProvider(config, network, providerOptions = {}) {
  const request = new ethers.FetchRequest(config.rpcUrl);
  if (config.authProvided) request.setHeader(config.headerName, config.headerValue);
  return new ethers.JsonRpcProvider(request, network, { ...providerOptions, batchMaxCount: 1 });
}

module.exports = { AUTH_MODES, createRpcProvider, loadRpcConfig, maskRpcUrl, maskSecret, sanitizeRpcError };