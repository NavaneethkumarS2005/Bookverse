import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
// @ts-ignore
import { API_URL } from '../config';

interface UseApiOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: AxiosError) => void;
}

interface UseApiResult<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
    request: (config: AxiosRequestConfig) => Promise<T | void>;
    get: (url: string, config?: AxiosRequestConfig) => Promise<T | void>;
    post: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<T | void>;
    put: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<T | void>;
    del: (url: string, config?: AxiosRequestConfig) => Promise<T | void>;
}

const useApi = <T = any>(options?: UseApiOptions<T>): UseApiResult<T> => {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // Create axios instance with base URL
    const apiClient = axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request Interceptor: Inject Token from LocalStorage
    apiClient.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response Interceptor: Global Error Handling
    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            // Examples of global error handling
            if (error.response?.status === 401) {
                // console.warn('Unauthorized - Token might be expired');
                // Optional: Trigger a logout or redirect action here
            }
            if (error.code === 'ERR_NETWORK') {
                // console.error('Network Error - Server might be down');
            }
            return Promise.reject(error);
        }
    );

    const request = useCallback(async (config: AxiosRequestConfig) => {
        setLoading(true);
        setError(null);
        try {
            const response: AxiosResponse<T> = await apiClient.request(config);
            setData(response.data);
            options?.onSuccess?.(response.data);
            return response.data;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Something went wrong';
            setError(errorMessage);
            options?.onError?.(err);
        } finally {
            setLoading(false);
        }
    }, [options]);

    // Convenience methods
    const get = useCallback((url: string, config?: AxiosRequestConfig) => request({ ...config, method: 'GET', url }), [request]);
    const post = useCallback((url: string, data?: any, config?: AxiosRequestConfig) => request({ ...config, method: 'POST', url, data }), [request]);
    const put = useCallback((url: string, data?: any, config?: AxiosRequestConfig) => request({ ...config, method: 'PUT', url, data }), [request]);
    const del = useCallback((url: string, config?: AxiosRequestConfig) => request({ ...config, method: 'DELETE', url }), [request]);

    return { data, error, loading, request, get, post, put, del };
};

export default useApi;
