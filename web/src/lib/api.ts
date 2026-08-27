const API_BASE = '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: any[];
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('torque_token');
  const activeBusinessId = localStorage.getItem('torque_business_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeBusinessId) {
    headers['x-business-id'] = activeBusinessId;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as any;
  }

  if (!response.ok) {
    const error: ApiError = data?.error || {
      code: 'UNKNOWN_ERROR',
      message: response.statusText || 'An unexpected error occurred.',
    };
    throw error;
  }

  return data as T;
}
