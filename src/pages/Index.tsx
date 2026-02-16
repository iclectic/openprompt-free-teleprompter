import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '@/lib/storage';

const Index = () => {
  const navigate = useNavigate();
  const settings = getSettings();

  useEffect(() => {
    if (settings.onboardingComplete) {
      navigate('/home', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, []);

  return null;
};

export default Index;
