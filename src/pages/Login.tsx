import { useState, useEffect, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, GraduationCap, Send } from 'lucide-react';
import '../styles/Login.css';

const Login = () => {
    // Default active tab (visual only, logic relies on DB response)
    const [activeRole, setActiveRole] = useState('pasante');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showFinishedModal, setShowFinishedModal] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [showAttendedModal, setShowAttendedModal] = useState(false);

    const [tempUser, setTempUser] = useState<any>(null);

    const navigate = useNavigate();

    // Roles for visual selector
    const roles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'human_resources', label: 'RR.HH.' },
        { id: 'security', label: 'Seguridad' }, 
        { id: 'pasante', label: 'Pasante' }
    ];

    useEffect(() => {
        try {
            const savedEmail = localStorage.getItem('savedEmail');
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberMe(true);
            }
        } catch (e) {
            localStorage.clear();
        }
    }, []);

    const handleRecovery = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!email.trim()) {
            alert("⚠️ Escribe tu usuario o correo para recuperar.");
            return;
        }
        const alertasGuardadas = JSON.parse(localStorage.getItem('alertasRRHH') || "[]");
        const nuevaAlerta = {
            id: Date.now(),
            usuario: email,
            fecha: new Date().toLocaleString(),
            tipo: 'Recuperación de Clave',
            leido: false
        };
        localStorage.setItem('alertasRRHH', JSON.stringify([...alertasGuardadas, nuevaAlerta]));
        setShowRecoveryModal(true);
    };

    const handleConfirmAttended = async () => {
        if (!tempUser) return;
        // Determine endpoint based on the role we already fetched
        const endpoint = tempUser.role === 'Pasante' ? 'pasantes' : 'usuarios';
        
        try {
            await fetch(`http://localhost:3001/${endpoint}/${tempUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoRecuperacion: 'Completado' })
            });
            
            // Save session and redirect
            saveSessionData(tempUser);
            setShowAttendedModal(false);
            redirectBasedOnRole(tempUser.role || tempUser.rol);

        } catch (error) {
            console.error(error);
        }
    };

    // --- HELPER: REDIRECTION LOGIC ---
    const redirectBasedOnRole = (roleName: string, userData?: any) => {
        // Normalize role string just in case
        const role = roleName ? roleName.trim() : '';

        console.log(`🔄 Redirecting user with role: ${role}`);

        switch(role) {
            case 'Seguridad':
                navigate('/seguridad');
                break;
            case 'Talento Humano':
                navigate('/rrhh');
                break;
            case 'Administrador':
                navigate('/dashboard'); // Or /admin depending on your routes
                break;
            case 'Pasante':
                if (userData) {
                    if (userData.estado === 'Finalizado') {
                        setShowFinishedModal(true);
                    } else if (userData.estado && userData.estado !== 'Activo') {
                        setShowStatusModal(true);
                    } else {
                        navigate('/pasante');
                    }
                } else {
                    navigate('/pasante');
                }
                break;
            default:
                console.warn("Role not recognized:", role);
                alert(`Error: Rol desconocido (${role}). Contacte a soporte.`);
        }
    };

    // --- MAIN LOGIN HANDLER ---
    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 1. Super Admin Bypass
        if (email === 'admin@inamhi.gob.ec' && password === 'admin123') {
            saveSessionData({ nombre: 'Super Admin', rol: 'Administrador' });
            navigate('/admin');
            return;
        }

        try {
            // We use the generic /login endpoint from server.js
            const response = await fetch('http://localhost:3001/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: email.trim(),
                    password: password.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                // User found! 'data' contains { id, role, name, ... }
                console.log("Login successful:", data);

                // --- CHECK STATUS ---
                // For admin/security/rrhh, usually 'estado' is checked. 
                // If the backend didn't return 'estado', we assume active or fetch details.
                // Assuming backend returns basics.

                // --- CHECK RECOVERY ---
                if (data.estadoRecuperacion === 'Atendido') {
                    setTempUser(data);
                    setShowAttendedModal(true);
                    return;
                }

                // --- SAVE & REDIRECT ---
                // We use the ROLE from the database, NOT the button state
                saveSessionData(data);
                redirectBasedOnRole(data.role, data);

            } else {
                alert(data.error || "Credenciales incorrectas");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión con el servidor backend (Puerto 3001).");
        }
    };

    const saveSessionData = (userData: any) => {
        // Strip heavy fields if present
        const {
            docHojaVida, docCartaSolicitud, docAcuerdoConfidencialidad,
            docCopiaCedula, informeUrl, ...userSafe
        } = userData;

        console.log("Saving session for:", userSafe.role);

        try {
            localStorage.setItem('user', JSON.stringify(userSafe));
            localStorage.setItem('role', userSafe.role || userSafe.rol);
            localStorage.setItem('token', 'dummy-token'); // Required for protected routes

            if (rememberMe) localStorage.setItem('savedEmail', email);
            else localStorage.removeItem('savedEmail');
        } catch (e) {
            console.warn("Storage quota exceeded, clearing...");
            localStorage.clear();
            localStorage.setItem('user', JSON.stringify(userSafe));
            localStorage.setItem('role', userSafe.role || userSafe.rol);
            localStorage.setItem('token', 'dummy-token');
        }
    };

    return (
        <div className="split-screen-container">
            <div className="brand-section">
                <div className="radar-blip"></div>
                <div className="brand-logo-large">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '50px', height: '50px', color: '#67e8f9' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                </div>
                <h1>SISTEMA DE<br />ACCESO</h1>
                <div className="brand-tagline">INAMHI sistema de monitoreo</div>
            </div>

            <div className="form-section">
                <button className="btn-back-simple" onClick={() => navigate('/')}>← Volver</button>
                <div className="form-container-wide">
                    <div className="form-header">
                        <h2>Iniciar Sesión</h2>
                        <p>Selecciona tu rol de acceso</p>
                    </div>
                    
                    {/* Visual Role Selector - Does not affect logic anymore */}
                    <div className="role-selector-wide">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                className={`role-btn ${activeRole === role.id ? 'active' : ''}`}
                                onClick={() => setActiveRole(role.id)}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>

                    <form className="enterprise-form" onSubmit={handleLogin}>
                        <div className="input-block">
                            <label>USUARIO / CORREO</label>
                            <input
                                type="text"
                                name="username"
                                autoComplete="username"
                                placeholder={activeRole === 'admin' ? "admin@inamhi.gob.ec" : "Ej: jperez"}
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-block">
                            <label>CONTRASEÑA</label>
                            <input
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                placeholder="••••••••••••"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <label className="checkbox-simple">
                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                                Recordar usuario
                            </label>
                            <a href="#" className="link-recover" onClick={handleRecovery}>Recuperar acceso</a>
                        </div>
                        <button type="submit" className="btn-submit-wide">Ingresar al Sistema</button>
                    </form>
                    <footer className="form-footer">© 2025 INAMHI - Departamento de Tecnología</footer>
                </div>
            </div>

            {/* MODALS */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}><X size={20} /></button>
                        <div className="modal-icon-wrapper"><AlertCircle size={48} className="icon-warning" /></div>
                        <h3>Acceso Restringido</h3>
                        <p className="modal-message">Tu cuenta aún <strong>no ha sido activada</strong>.</p>
                        <button className="btn-modal-action" onClick={() => setShowStatusModal(false)}>Entendido</button>
                    </div>
                </div>
            )}

            {showFinishedModal && (
                <div className="modal-overlay">
                    <div className="modal-content-finished">
                        <button className="close-modal-btn" onClick={() => setShowFinishedModal(false)}><X size={20} /></button>
                        <div className="modal-icon-finished"><GraduationCap size={48} className="icon-info" /></div>
                        <h3>Pasantía Finalizada</h3>
                        <p className="modal-message">Tu periodo de pasantías ha concluido.</p>
                        <button className="btn-modal-action-blue" onClick={() => setShowFinishedModal(false)}>Cerrar</button>
                    </div>
                </div>
            )}

            {showRecoveryModal && (
                <div className="modal-overlay">
                    <div className="modal-content-success">
                        <button className="close-modal-btn" onClick={() => setShowRecoveryModal(false)}><X size={20} /></button>
                        <div className="modal-icon-success"><Send size={40} className="icon-success" /></div>
                        <h3>Solicitud Enviada</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                            Solicitud enviada para: <strong>{email}</strong>
                        </p>
                        <button className="btn-modal-action-green" onClick={() => setShowRecoveryModal(false)}>Listo</button>
                    </div>
                </div>
            )}

            {showAttendedModal && (
                <div className="modal-overlay">
                    <div className="modal-content-success">
                        <button className="close-modal-btn" onClick={() => setShowAttendedModal(false)}><X size={20} /></button>
                        <h3>Recuperación Atendida</h3>
                        <button className="btn-modal-action-green" onClick={handleConfirmAttended}>Ingresar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;