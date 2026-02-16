import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { saveSettings } from '@/lib/storage';
import { Play, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const slides = [
  {
    icon: Play,
    title: 'Your words, your pace',
    description: 'OpenPrompt is a free teleprompter built for creators, speakers, and professionals. Paste your script and start prompting in seconds.',
    accent: 'Teleprompter features, actually free.',
  },
  {
    icon: Sparkles,
    title: 'Everything you need',
    description: 'Mirror mode for reflective glass, camera preview for recording, adjustable speed, font, themes, and a countdown timer — all free, no paywall.',
    accent: 'Mirror · Camera · Themes · Export',
  },
  {
    icon: Shield,
    title: 'Your scripts stay yours',
    description: 'All scripts are stored locally on your device. No account required, no tracking, fully offline. Your data never leaves your phone.',
    accent: 'Local-first · Offline · Private',
  },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const finish = () => {
    saveSettings({ onboardingComplete: true });
    navigate('/home');
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-padding">
      <div className="flex justify-end p-4">
        <Button variant="ghost" onClick={finish} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
              {slide.title}
            </h1>
            <p className="mb-4 max-w-sm text-lg text-muted-foreground leading-relaxed">
              {slide.description}
            </p>
            <p className="text-sm font-semibold text-primary">
              {slide.accent}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-6 px-8 pb-12">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <Button
          className="w-full max-w-sm touch-target text-base font-semibold"
          size="lg"
          onClick={() => {
            if (current < slides.length - 1) setCurrent(current + 1);
            else finish();
          }}
        >
          {current < slides.length - 1 ? 'Next' : 'Get Started'}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
