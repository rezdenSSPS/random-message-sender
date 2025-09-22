import { useState, useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    if (localStorage.getItem("isAuthenticated") === "true") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = (username: string, password: string) => {
    if (username === "admin" && password === "admin") {
      localStorage.setItem("isAuthenticated", "true");
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Please use admin/admin");
    }
  };

  return <LoginForm onLogin={handleLogin} error={error} />;
};

export default Login;