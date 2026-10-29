import { AxiosRequestConfig } from "axios";
import { api } from "./appClient";

export { navigationRef } from "../commonComponents/helper/navigationService";

export const POST_API = async (body?: any, endpoint?: string, config: AxiosRequestConfig = {}) => {
  try {
    const res = await api.post(endpoint || "", body, config);
    return res;
  } catch (error: any) {
    return error?.response || error;
  }
};

export const GET_API = async (endpoint?: string, config: AxiosRequestConfig = {}) => {
  try {
    const res = await api.get(endpoint || "", config);
    return res;
  } catch (error: any) {
    return error?.response || error;
  }
};

export const DELETE_API = async (endpoint?: string, config: AxiosRequestConfig = {}) => {
  try {
    const res = await api.delete(endpoint || "", config);
    return res;
  } catch (error: any) {
    return error?.response || error;
  }
};

export const PUT_API = async (body?: any, endpoint?: string, config: AxiosRequestConfig = {}) => {
  try {
    const res = await api.put(endpoint || "", body, config);
    return res;
  } catch (error: any) {
    return error?.response || error;
  }
};
