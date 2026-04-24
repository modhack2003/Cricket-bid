import { Redis } from "@upstash/redis";

let redis;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith("http") &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_TOKEN !== "your_upstash_token_here"
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  // In-memory fallback for local dev without Redis
  const store = {};
  redis = {
    get: async (key) => {
      const val = store[key];
      return val ? JSON.parse(JSON.stringify(val)) : null;
    },
    set: async (key, value) => {
      store[key] = JSON.parse(JSON.stringify(value));
      return "OK";
    },
    del: async (key) => {
      delete store[key];
      return 1;
    },
  };
}

export default redis;
