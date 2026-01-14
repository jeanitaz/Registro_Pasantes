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
        return <Navigate to="/login" replace />;
    }

    if (userRole && !allowedRoles.includes(userRole)) {
        // Redirect to a safe page if authorized but wrong role
        // For now, redirect to login or home. 
        // Ideally: <Navigate to="/unauthorized" /> but we don't have that page yet.
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
