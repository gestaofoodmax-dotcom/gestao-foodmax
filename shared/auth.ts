// Shared types for authentication API

export interface User {
  id: number;
  email: string;
  role: string;
  ativo: boolean;
  onboarding: boolean;
  data_cadastro: string;
  nome?: string;
}

export interface UserContact {
  id: number;
  usuario_id: number;
  nome: string;
  ddi: string;
  telefone: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais: string;
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface OnboardingRequest {
  nome: string;
  ddi: string;
  telefone: string;
  selectedPlan: "free" | "paid";
}

// Response types
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface LoginResponse extends AuthResponse {
  needsOnboarding?: boolean;
}

export interface RegisterResponse extends AuthResponse {
  redirectTo?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface OnboardingResponse extends AuthResponse {
  redirectTo?: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  details?: any[];
  code?: string;
}

// Login attempt tracking
export interface LoginAttemptInfo {
  attemptsRemaining: number;
  blockedUntil?: string;
  message: string;
}
