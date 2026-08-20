import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import SplashScreen from "./pages/SplashScreen";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Player from "./pages/Player";
import RecordMode from "./pages/RecordMode";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
                <Route path="/player/:id" element={<ProtectedRoute><Player /></ProtectedRoute>} />
                <Route path="/record/:id" element={<ProtectedRoute><RecordMode /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
