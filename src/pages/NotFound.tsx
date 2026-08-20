import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 safe-area-padding">
      <div className="text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">404</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Button asChild className="touch-target">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
