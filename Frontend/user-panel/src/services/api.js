
// // user-panel/src/services/api.js

// import axios from 'axios';
// import { toast } from 'sonner';
// import tokenService from '../utils/tokenService';

// // --- API Service URLs ---
// const AUTH_API_URL = import.meta.env.VITE_API_GATEWAY_URL ;
// const REWARDS_API_URL = import.meta.env.VITE_BACKEND_REWARDS_URL || 'http://localhost:3002/api/rewards';

// // --- Axios Clients ---
// // Use separate clients for different microservices
// const authApiClient = axios.create({
//   baseURL: AUTH_API_URL,
//   timeout: 15000,
// });

// const rewardsApiClient = axios.create({
//   baseURL: REWARDS_API_URL,
//   timeout: 30000,
// });

// // --- Axios Interceptor Logic ---
// const ongoingRequests = new Set();

// const setupInterceptors = (apiClient) => {
//   apiClient.interceptors.request.use(
//     (config) => {
//       const token = tokenService.getToken();
//       if (token) {
//         config.headers['Authorization'] = `Bearer ${token}`;
//       }
//       config.metadata = { startTime: new Date() };
//       return config;
//     },
//     (error) => {
//       toast.error('Failed to setup request. Please check your connection.');
//       return Promise.reject(error);
//     }
//   );

//   apiClient.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//       const originalRequest = error.config;
//       const { status, data } = error.response || {};
      
//       // Handle 401 for token refresh
//       if (status === 401 && !originalRequest._retry) {
//         originalRequest._retry = true;
//         if (ongoingRequests.has('token-refresh')) {
//           return new Promise(resolve => setTimeout(() => resolve(apiClient(originalRequest)), 1000));
//         }
//         ongoingRequests.add('token-refresh');
//         let refreshToastId = toast.loading('Session expired. Attempting to refresh...');
//         try {
//           const refreshResult = await tokenService.ensureValidToken();
//           if (refreshResult.success) {
//             toast.success('Session refreshed.', { id: refreshToastId });
//             apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokenService.getToken()}`;
//             originalRequest.headers['Authorization'] = `Bearer ${tokenService.getToken()}`;
//             return apiClient(originalRequest);
//           } else {
//             throw new Error('Automatic token refresh failed.');
//           }
//         } catch (refreshError) {
//           toast.error('Your session has expired. Please login again.', { id: refreshToastId });
//           tokenService.clearTokens();
//           // Optional: Force redirect
//           // window.location.href = '/login';
//           return Promise.reject(error);
//         } finally {
//             ongoingRequests.delete('token-refresh');
//         }
//       }

//       // Handle other common errors
//       const errorMessage = data?.message || error.message || 'An unknown error occurred.';
//       if (status !== 401) { // Avoid double-toasting 401 errors
//         toast.error(errorMessage);
//       }
      
//       return Promise.reject(error);
//     }
//   );
// };

// // Apply interceptors to both clients
// setupInterceptors(authApiClient);
// setupInterceptors(rewardsApiClient);

// // --- EXPORTED API FUNCTIONS ---

// /**
//  * Submits new service data with images.
//  */
// export const submitServiceDataApi = async (serviceType, data, imageFiles, onUploadProgressCallback) => {
//   const formData = new FormData();
//   formData.append('serviceType', serviceType);
//   formData.append('data', JSON.stringify(data));
//   imageFiles.forEach(file => formData.append('images', file));

//   return rewardsApiClient.post('/submissions', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//     timeout: 180000, // 3-minute timeout for large uploads
//     onUploadProgress: (progressEvent) => {
//       if (onUploadProgressCallback && progressEvent.total) {
//         const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
//         onUploadProgressCallback(percentCompleted);
//       }
//     },
//   });
// };

// /**
//  * Fetches the user's submission history from the rewards service.
//  * @param {object} params - Pagination and filter parameters.
//  */
// export const getMySubmissions = (params) => {
//     return rewardsApiClient.get('/submissions/me', { params });
// };

// /**
//  * Fetches the user's reward redemption history from the auth service.
//  */
// export const getMyRedemptions = () => {
//     return authApiClient.get('/api/auth/redeemed-rewards');
// };

// /**
//  * Fetches the user's spin wheel win history from the auth service.
//  */
// export const getMySpinHistory = () => {
//     return authApiClient.get('/api/spin/history');
// };

// /**
//  * Fetches the user's profile information from the auth service.
//  */
// export const getMyProfile = () => {
//     return authApiClient.get('/auth/profile');
// };

// /**
//  * Fetches the user's available spin count from the auth service.
//  */
// export const getSpinStatus = () => {
//     return authApiClient.get('/spin/status');
// };

// /**
//  * Consumes one spin and gets the prize from the auth service.
//  */
// export const consumeSpin = () => {
//     return authApiClient.post('/spin/consume');
// };

// /**
//  * Redeems a level-based reward.
//  */
// export const redeemReward = (levelData) => {
//     return authApiClient.post('/auth/redeem-reward', levelData);
// };



import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService'; // Assuming you have a token utility

// --- Base Configuration ---
// The single entry point for all backend requests, configured in your .env file.
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

// --- Centralized Axios Client ---
// One client for all requests, as they all go through the gateway.
const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  timeout: 30000, // 30-second default timeout
});

// --- Axios Interceptor for Authentication and Error Handling ---
const ongoingRequests = new Set();

// Request Interceptor: Injects the auth token into every outgoing request.
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken(); // Fetches token from localStorage
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    toast.error('Failed to prepare request. Please check your network.');
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles token refresh and global error notifications.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { status, data } = error.response || {};

    // Handles 401 Unauthorized errors by attempting to refresh the token.
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark to prevent infinite refresh loops

      // Prevents multiple refresh attempts if many requests fail at once.
      if (ongoingRequests.has('token-refresh')) {
        return new Promise(resolve => setTimeout(() => resolve(apiClient(originalRequest)), 1000));
      }
      ongoingRequests.add('token-refresh');
      
      let refreshToastId = toast.loading('Session expired. Attempting to refresh...');
      try {
        const refreshResult = await tokenService.ensureValidToken();
        if (refreshResult.success) {
          toast.success('Session refreshed successfully!', { id: refreshToastId });
          originalRequest.headers['Authorization'] = `Bearer ${tokenService.getToken()}`;
          return apiClient(originalRequest); // Retry the original request with the new token
        } else {
          throw new Error('Could not refresh token.');
        }
      } catch (refreshError) {
        toast.error('Your session has expired. Please log in again.', { id: refreshToastId });
        tokenService.clearTokens();
        window.location.href = '/login'; // Force a redirect to the login page
        return Promise.reject(error);
      } finally {
        ongoingRequests.delete('token-refresh');
      }
    }

    // For all other errors, show a generic error toast.
    const errorMessage = data?.message || error.message || 'An unknown error occurred.';
    if (status !== 401) {
      toast.error(errorMessage);
    }
    
    return Promise.reject(error);
  }
);


// ===============================================
// EXPORTED API FUNCTIONS
// Each function now uses a logical path that the gateway will route.
// ===============================================

// --- Submission & Rewards (rewards-service) ---

export const submitServiceDataApi = async (serviceType, data, imageFiles, onUploadProgressCallback) => {
  const formData = new FormData();
  formData.append('serviceType', serviceType);
  formData.append('data', JSON.stringify(data));
  imageFiles.forEach(file => formData.append('images', file));

  // The path `/api/rewards/submissions` tells the gateway to forward this to the rewards-service.
  return apiClient.post('/api/rewards/submissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000, // 3-minute timeout for large uploads
    onUploadProgress: (progressEvent) => {
      if (onUploadProgressCallback && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgressCallback(percentCompleted);
      }
    },
  });
};

export const getMySubmissions = (params) => {
    // Path: /api/rewards/submissions/me -> rewards-service
    return apiClient.get('/api/rewards/submissions/me', { params });
};

// --- Authentication & User (auth-service) ---

export const getMyProfile = () => {
    // Path: /api/auth/profile -> auth-service
    return apiClient.get('/api/auth/profile');
};

export const getMyRedemptions = () => {
    // Path: /api/auth/redeemed-rewards -> auth-service
    return apiClient.get('/api/auth/redeemed-rewards');
};

export const getMySpinHistory = () => {
    // Path: /api/auth/spin/history -> auth-service
    return apiClient.get('/api/auth/spin/history');
};

export const getSpinStatus = () => {
    // Path: /api/auth/spin/status -> auth-service
    return apiClient.get('/api/auth/spin/status');
};

export const consumeSpin = () => {
    // Path: /api/auth/spin/consume -> auth-service
    return apiClient.post('/api/auth/spin/consume');
};

export const redeemReward = (levelData) => {
    // Path: /api/auth/redeem-reward -> auth-service
    return apiClient.post('/api/auth/redeem-reward', levelData);
};

// --- Public / Unprotected ---

export const getPlatformStats = () => {
    // Path: /api/auth/stats/platform -> auth-service
    // No token is needed, the interceptor will simply not add one.
    return apiClient.get('/api/auth/stats/platform');
}


