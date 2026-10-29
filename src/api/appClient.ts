

import axios from "axios";
import { URL, API_HOST_HEADER, ENABLE_GLOBAL_RATE_LIMIT, ENABLE_ENDPOINT_THROTTLE } from "./config";
import { getValue, clearValue } from "../utils/localstorage/index";
import { isThrottled } from "./requestThrottler";
// import { isGlobalRateLimited } from "./ratelimitter";
import { navigationRef } from "./methods";
import { notificationHelper } from "../commonComponents";
import { isGlobalRateLimited } from "./rateLimiter";
// import { notificationHelper } from "@src/commonComponent";

export const api = axios.create({
  baseURL: `${URL}/api/`,
});

let apiCallCount = 0;
let lastGlobalWarningTime = 0; // Throttle toast popups too

api.interceptors.request.use(
  async (config) => {
    try {
      const isWhitelisted = config.url && (
        config.url.includes("language") ||
        config.url.includes("translate") ||
        config.url.includes("settings") ||
        config.url.includes("home-screen") ||
        config.url.includes("self")
      );

      // 1. GLOBAL RATE LIMIT (Burst protection: 20 per 10s)
      if (ENABLE_GLOBAL_RATE_LIMIT && !isWhitelisted && isGlobalRateLimited()) {
        const now = Date.now();
        if (now - lastGlobalWarningTime > 3000) { // Don't spam the toast itself
          notificationHelper("", "Too many attempts. Please wait a minute before trying again", "error");
          lastGlobalWarningTime = now;
        }
        const error: any = new Error(`[GlobalLimit] Overload: 20/10s`);
        error.response = { status: 429, data: { message: "Too many attempts" } };
        return Promise.reject(error);
      }

      // 2. PER-ENDPOINT THROTTLER (Same URL spam: 1 per 2s)
      if (ENABLE_ENDPOINT_THROTTLE && config.url && !isWhitelisted && isThrottled(config.url)) {
        const error: any = new Error(`[Throttler] Blocked duplicate: ${config.url}`);
        error.response = { status: 429, data: { message: "Too many requests" } };
        return Promise.reject(error);
      }

      const token = await getValue("token");
      const language = await getValue("selectedLanguage");
      const defaultLng = await getValue("defaultLanguage");
      const currentLng = language || defaultLng;

      config.headers = config.headers || {};

      if (API_HOST_HEADER) {
        config.headers.Host = API_HOST_HEADER;
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      config.headers["Accept-Lang"] = currentLng;
      config.headers["Content-Type"] = "application/json";
      config.headers.Accept = "application/json";

      const callTime = new Date().toLocaleTimeString();
      ;

      return config;
    } catch (e: any) {
      console.error(`[API Request Error]`, e);
      return Promise.reject(e);
    }
  },
  (error) => {
    console.error(`[API Request Interceptor Error]`, error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    // Log response details
    return response;
  },
  async (error) => {
    // Log specifically if the error is from the response (status code etc)
    if (error.response) {
      console.error(
        `[API Response Error] ${error.response.status} ${error.config.url}`,
        error.response.data,
      );
    } else {
      console.error(`[API Network/Unknown Error] ${error.message || 'No message'}`, error);
    }

    if (error.name === "AbortError") {
      return Promise.reject(new Error("Request cancelled"));
    }

    if (error.response?.status === 429) {
      notificationHelper("", "Too many requests from server", "error");
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      const token = await getValue("token");
      if (token) {
        await clearValue();
        notificationHelper("", "Session Expired", "error");
        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        }
      }
    }

    return Promise.reject(error);
  },
);
