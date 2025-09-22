import { EmailDashboard } from "@/components/EmailDashboard";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/");
  };

  return <EmailDashboard onLogout={handleLogout} />;
};

export default Dashboard;