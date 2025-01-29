import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useRequireAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/');
          return false;
        }
        return true;
      } catch (error) {
        router.replace('/');
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isLoading };
} 