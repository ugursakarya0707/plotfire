// Environment variable utility
// This file provides a safe way to access environment variables in the browser

interface EnvConfig {
  VIDEO_CONFERENCE_API_URL: string;
  LIVEKIT_URL: string;
}

// Default values as fallbacks
const defaultConfig: EnvConfig = {
  VIDEO_CONFERENCE_API_URL: 'http://localhost:3008/api',
  LIVEKIT_URL: 'wss://postply-s2s0711i.livekit.cloud'
};

// Get environment variables or use defaults
export const envConfig: EnvConfig = {
  VIDEO_CONFERENCE_API_URL: process.env.REACT_APP_VIDEO_CONFERENCE_API_URL || defaultConfig.VIDEO_CONFERENCE_API_URL,
  LIVEKIT_URL: process.env.REACT_APP_LIVEKIT_URL || defaultConfig.LIVEKIT_URL
};

// This function is safe to use in the browser
export const getEnvVariable = (key: keyof EnvConfig): string => {
  // In development, process.env is available at build time
  // In production, we use the defaultConfig values
  return envConfig[key];
};
