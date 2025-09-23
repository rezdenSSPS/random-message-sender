import { useState, useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = (username: string, password: string) => {
    // UPDATED: Changed login credentials
    if (username === "denis" && password === "admin") {
      localStorage.setItem("isAuthenticated", "true");
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return <LoginForm onLogin={handleLogin} error={error} />;
};

export default Login;