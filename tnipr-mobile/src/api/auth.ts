import client from './client';

export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  operatorId: number | null;
}

export async function login(email: string, password: string) {
  const { data } = await client.post('/auth/login', { email, password });
  return data.data as { accessToken: string; refreshToken: string; user: User };
}
