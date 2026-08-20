import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

const Index = () => {
  const navigate = useNavigate();
  const settings = getSettings();
  const { loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (settings.onboardingComplete) {
      navigate('/home', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, navigate, settings.onboardingComplete]);

  return null;
};

export default Index;
