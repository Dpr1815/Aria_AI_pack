/**
 * Configuration Types
 *
 * Type definitions for application configuration.
 */

// ============================================
// Database Configuration
// ============================================

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  poolSize?: number;
  connectTimeoutMs?: number;
  socketTimeoutMs?: number;
}

// ============================================
// Google Cloud Configuration
// ============================================

export interface GoogleSTTConfig {
  encoding: 'WEBM_OPUS' | 'LINEAR16' | 'FLAC';
  sampleRateHertz: number;
  languageCode: string;
  enableAutomaticPunctuation?: boolean;
  model?: string;
}

export interface GoogleTTSConfig {
  audioEncoding: 'LINEAR16' | 'MP3' | 'OGG_OPUS';
  sampleRateHertz: number;
  effectsProfileId?: string[];
}

export interface GoogleConfig {
  credentialsPath: string;
  stt: GoogleSTTConfig;
  tts: GoogleTTSConfig;
}

// ============================================
// OpenAI Configuration
// ============================================

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs?: number;
}

// ============================================
// Rhubarb Lip Sync Configuration
// ============================================

export interface RhubarbConfig {
  executablePath: string;
  timeoutMs: number;
  recognizer?: 'pocketSphinx' | 'phonetic';
}

// ============================================
// Server Configuration
// ============================================

export interface ServerConfig {
  port: number;
  host?: string;
  jwtSecret: string;
  wsPath?: string;
  pingIntervalMs: number;
  pongTimeoutMs: number;
}

// ============================================
// App Configuration (Aggregate)
// ============================================

export interface AppConfig {
  database: DatabaseConfig;
  google: GoogleConfig;
  openai: OpenAIConfig;
  rhubarb: RhubarbConfig;
  server: ServerConfig;
  nodeEnv: 'development' | 'production' | 'test';
}
