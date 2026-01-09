import { useState, useEffect, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, Send, ShieldAlert } from 'lucide-react';
import '../styles/Login.css';

const Login = () => {
    // Default active tab (visual only, logic relies on DB response)
    const [activeRole, setActiveRole] = useState('pasante');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Modals state
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showFinishedModal, setShowFinishedModal] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [showAttendedModal, setShowAttendedModal] = useState(false);

    // Estado para guardar la razón específica del bloqueo
    const [blockReason, setBlockReason] = useState('');

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
        const endpoint = tempUser.role === 'Pasante' ? 'pasantes' : 'usuarios';
        
        try {
            await fetch(`http://localhost:3001/${endpoint}/${tempUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoRecuperacion: 'Completado' })
            });
            
            saveSessionData(tempUser);
            setShowAttendedModal(false);
            redirectBasedOnRole(tempUser.role || tempUser.rol);

        } catch (error) {
            console.error(error);
        }
    };

    // --- LOGICA DE REDIRECCIÓN Y BLOQUEO ---
    const redirectBasedOnRole = (roleName: string, userData?: any) => {
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
                navigate('/dashboard'); 
                break;
            case 'Pasante':
                if (userData) {
                    const estado = userData.estado;

                    // Lista de estados que bloquean el acceso por finalización/sanción
                    const estadosBloqueo = [
                        'Finalizado por cumplimiento de las horas',
                        'Retiro anticipado',
                        'Finalizado por faltas excedidas',
                        'Finalizado por atrasos excedidos',
                        'Finalizado por llamado de atención'
                    ];

                    if (estadosBloqueo.includes(estado)) {
                        setBlockReason(estado); // Guardamos la razón para mostrarla en el modal
                        setShowFinishedModal(true);
                    } else if (estado && estado !== 'Activo') {
                        // Para estados como "No habilitado" (Aún no empieza)
                        setShowStatusModal(true);
                    } else {
                        // Estado 'Activo'
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
                console.log("Login successful:", data);

                if (data.estadoRecuperacion === 'Atendido') {
                    setTempUser(data);
                    setShowAttendedModal(true);
                    return;
                }

                // Guardamos sesión pero NO redirigimos todavía si es pasante bloqueado
                // La función redirectBasedOnRole decidirá si navegar o mostrar modal
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
        const {
            docHojaVida, docCartaSolicitud, docAcuerdoConfidencialidad,
            docCopiaCedula, informeUrl, ...userSafe
        } = userData;

        try {
            localStorage.setItem('user', JSON.stringify(userSafe));
            localStorage.setItem('role', userSafe.role || userSafe.rol);
            localStorage.setItem('token', 'dummy-token'); 

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
                <div className="brand-tagline">INAMHI sistema de monitoreo de pasantes</div>
            </div>

            <div className="form-section">
                <button className="btn-back-simple" onClick={() => navigate('/')}>← Volver</button>
                <div className="form-container-wide">
                    <div className="form-header">
                        <h2>Iniciar Sesión</h2>
                        <p>Selecciona tu rol de acceso</p>
                    </div>
                    
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
            
            {/* Modal para No Habilitado (Aún no activo) */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}><X size={20} /></button>
                        <div className="modal-icon-wrapper"><AlertCircle size={48} className="icon-warning" /></div>
                        <h3>Acceso Restringido</h3>
                        <p className="modal-message">Tu cuenta aún <strong>no ha sido activada</strong> por Talento Humano.</p>
                        <button className="btn-modal-action" onClick={() => setShowStatusModal(false)}>Entendido</button>
                    </div>
                </div>
            )}

            {/* Modal para FINALIZADO / BLOQUEADO (Lógica Nueva) */}
            {showFinishedModal && (
                <div className="modal-overlay">
                    <div className="modal-content-finished" style={{borderTop: '5px solid #ef4444'}}>
                        <button className="close-modal-btn" onClick={() => setShowFinishedModal(false)}><X size={20} /></button>
                        <div className="modal-icon-finished" style={{background: '#fef2f2'}}>
                            <ShieldAlert size={48} color="#ef4444" />
                        </div>
                        <h3 style={{color: '#ef4444'}}>Acceso Denegado</h3>
                        <p className="modal-message" style={{marginBottom:'5px'}}>
                            Tu periodo de pasantías ha concluido.
                        </p>
                        <div style={{
                            background: '#f8fafc', 
                            padding: '10px', 
                            borderRadius: '8px', 
                            margin: '10px 0',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            color: '#1e293b'
                        }}>
                            <strong>Motivo:</strong> {blockReason || 'Finalizado'}
                        </div>
                        <p style={{fontSize: '0.8rem', color:'#64748b'}}>
                            Si crees que esto es un error, contacta a Talento Humano.
                        </p>
                        <button className="btn-modal-action-blue" style={{background:'#ef4444', border:'none'}} onClick={() => setShowFinishedModal(false)}>Cerrar</button>
                    </div>
                </div>
            )}

            {/* Otros modales (Recuperación y Atendido) se mantienen igual... */}
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