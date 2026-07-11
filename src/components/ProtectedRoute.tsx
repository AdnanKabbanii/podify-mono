import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#90CAF9",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page while saving the attempted URL
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
