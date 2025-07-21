import { Platform } from 'react-native';

// API Configuration
export const API_CONFIG = {
  // Local development server IP
  LOCAL_IP: '192.168.1.26',
  LOCAL_PORT: '8080',
  
  // ngrok URL (update this when you start ngrok)
  // Run: ngrok http 8080
  // Then copy the https URL here
  NGROK_URL: '', // e.g., 'https://abc123.ngrok.io'
  
  // Production server URL
  PRODUCTION_URL: '', // e.g., 'https://your-api.com'
};

// API Base URL Selection
export const getApiBaseUrl = (): string => {
  // For production, use production URL
  if (__DEV__ === false && API_CONFIG.PRODUCTION_URL) {
    return `${API_CONFIG.PRODUCTION_URL}/api`;
  }
  
  // For development
  if (Platform.OS === 'web') {
    // Web can access localhost/local IP directly
    return `http://${API_CONFIG.LOCAL_IP}:${API_CONFIG.LOCAL_PORT}/api`;
  } else {
    // Mobile development - prioritize ngrok if available
    if (API_CONFIG.NGROK_URL) {
      return `${API_CONFIG.NGROK_URL}/api`;
    } else {
      // Fallback to local IP (might not work on some networks)
      return `http://${API_CONFIG.LOCAL_IP}:${API_CONFIG.LOCAL_PORT}/api`;
    }
  }
};

export const API_ENDPOINTS = {
  LEAVES: '/leaves',
  COMPLAINTS: '/complaints',
  HEALTH: '/health'
};
