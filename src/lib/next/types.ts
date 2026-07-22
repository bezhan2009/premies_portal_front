export interface PortalSession {
  username: string;
  roles: number[];
}

export interface WorkerUser {
  id: number | string | null;
  username: string;
  fullName: string;
  email: string;
}

export interface WorkerMetric {
  mobileBankConnects: number;
  cardTurnoverPremium: number;
  activeCardsPremium: number;
  cardSalesPremium: number;
  salaryProject: number;
  serviceScore: number;
  testScore: number;
}

export interface Worker {
  id: number | string;
  salary: number;
  officeName: string;
  user: WorkerUser;
  metric: WorkerMetric;
  premium: number;
}

export interface BackendWorker {
  [key: string]: unknown;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  role_ids?: number | string | Array<number | string>;
}

export interface ApiProblem {
  error: string;
  code?: string;
  status?: number;
}
