import client from './client';

export interface UpdateProfilePayload {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const { data } = await client.patch('/auth/profile', payload);
  return data.data as { fullName: string; email: string };
}
