import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
    allowedRoles: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role"); // 'Administrador', 'Pasante', 'Seguridad', etc.
    // Also check for 'rol' as a fallback if consistent naming is an issue, though Login.tsx sets 'role'
    // const userRole = localStorage.getItem("role") || localStorage.getItem("rol");

    if (!token) {
        return <Navigate to="/unauthorized" replace />;
    }

    if (userRole && !allowedRoles.includes(userRole)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
