import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
