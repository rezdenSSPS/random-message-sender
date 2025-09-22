import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated, redirect to dashboard
    if (localStorage.getItem("isAuthenticated") === "true") {
      navigate("/dashboard");
    } else {
      // Otherwise redirect to login
      navigate("/login");
    }
  }, [navigate]);

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default Index;
