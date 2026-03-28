import assert from "node:assert/strict";
import test from "node:test";

import { loadEnv } from "./env.js";

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("loads defaults for local development", () => {
  resetEnv({
    PORT: undefined,
    HOST: undefined,
    NODE_ENV: undefined,
    STELLAR_NETWORK: undefined,
    SOROBAN_RPC_URL: undefined,
    HORIZON_URL: undefined,
    CONTRACT_ID: undefined,
    VITE_WS_URL: undefined,
  });

  const env = loadEnv();

  assert.equal(env.port, 8787);
  assert.equal(env.host, "0.0.0.0");
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.stellarNetwork, "testnet");
  assert.deepEqual(env.corsOrigin, ["*"]);
});

test("loads CORS_ORIGIN for development", () => {
  resetEnv({
    CORS_ORIGIN: "http://localhost:5173, http://localhost:3000",
  });

  const env = loadEnv();

  assert.deepEqual(env.corsOrigin, [
    "http://localhost:5173",
    "http://localhost:3000",
  ]);
});

test("requires CORS_ORIGIN in production", () => {
  resetEnv({
    NODE_ENV: "production",
    CORS_ORIGIN: undefined,
  });

  assert.throws(
    () => loadEnv(),
    /CORS_ORIGIN is required in production environment/i,
  );
});

test("throws a clear error for an invalid port", () => {
  resetEnv({ PORT: "abc" });

  assert.throws(
    () => loadEnv(),
    /PORT must be an integer between 1 and 65535/i,
  );
});

test("throws a clear error for an invalid RPC URL", () => {
  resetEnv({ SOROBAN_RPC_URL: "not-a-url" });

  assert.throws(() => loadEnv(), /SOROBAN_RPC_URL must be a valid URL/i);
});

test("rejects the example contract id in production", () => {
  resetEnv({
    NODE_ENV: "production",
    CONTRACT_ID: "CDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  });

  assert.throws(
    () => loadEnv(),
    /CONTRACT_ID must be set to a deployed contract value/i,
  );
});

test("throws when SOROBAN_RPC_URL has invalid protocol", () => {
  resetEnv({
    SOROBAN_RPC_URL: "ftp://example.com",
  });

  assert.throws(
    () => loadEnv(),
    /SOROBAN_RPC_URL must use one of these protocols/i,
  );
});

test("throws when port is out of range", () => {
  resetEnv({ PORT: "70000" });

  assert.throws(
    () => loadEnv(),
    /PORT must be an integer between 1 and 65535/i,
  );
});

test("throws when STELLAR_NETWORK has unknown value", () => {
  resetEnv({ STELLAR_NETWORK: "invalid" });

  assert.throws(
    () => loadEnv(),
    /STELLAR_NETWORK must be one of:/i,
  );
});

test("requires API_KEY in production", () => {
  resetEnv({
    NODE_ENV: "production",
    CORS_ORIGIN: "https://example.com",
    CONTRACT_ID: "CD123",
    API_KEY: undefined,
  });

  assert.throws(
    () => loadEnv(),
    /API_KEY is required in production environment/i,
  );
});

test("loads API_KEY from environment", () => {
  resetEnv({
    API_KEY: "my-secret-key",
  });

  const env = loadEnv();
  assert.equal(env.apiKey, "my-secret-key");
});
