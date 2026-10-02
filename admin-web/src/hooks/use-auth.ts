'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';
import { showToast } from '@/hooks/use-toast';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: Record<string, string>) => authService.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth-me'], data.user);
      showToast('success', 'Welcome back!', `Signed in as ${data.user.email}`);
      router.push('/dashboard');
    },
    onError: (err: Error) => {
      showToast('error', 'Authentication Failed', err.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      showToast('info', 'Logged Out', 'You have been signed out.');
      router.push('/login');
    },
    onError: (err: Error) => {
      showToast('error', 'Logout Failed', err.message);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'),
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refetchUser: refetch,
  };
}
