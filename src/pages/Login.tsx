import { useState, useEffect, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, GraduationCap, Send, Key } from 'lucide-react'; 
import '../styles/Login.css';

const Login = () => {
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

    const roles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'human_resources', label: 'RR.HH.' },
        { id: 'security', label: 'Seguridad' },
        { id: 'pasante', label: 'Pasante' }
    ];

    useEffect(() => {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleRecovery = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!email.trim()) {
            alert("⚠️ Escribe tu usuario o correo en el campo de texto para saber a quién recuperar.");
            return;
        }
        const nuevaSolicitud = {
            id: Date.now(),
            usuario: email,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            tipo: 'Recuperación de Contraseña',
            leido: false
        };
        const solicitudesPrevias = JSON.parse(localStorage.getItem('alertasRRHH') || '[]');
        solicitudesPrevias.push(nuevaSolicitud);
        localStorage.setItem('alertasRRHH', JSON.stringify(solicitudesPrevias));
        setShowRecoveryModal(true);
    };

    const handleConfirmAttended = async () => {
        if (!tempUser) return;
        const endpoint = activeRole === 'pasante' ? 'pasantes' : 'usuarios';
        try {
            await fetch(`http://localhost:3001/${endpoint}/${tempUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoRecuperacion: 'Completado' }) 
            });
            saveSessionData(tempUser);
            setShowAttendedModal(false);
            
            // Redirección directa tras confirmar
            switch (activeRole) {
                case 'human_resources': navigate('/rrhh'); break;
                case 'security': navigate('/seguridad'); break;
                case 'pasante': navigate('/pasante'); break;
                default: navigate('/dashboard');
            }
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("Hubo un error al procesar tu ingreso. Intenta de nuevo.");
        }
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 1. Lógica especial para Super Admin (Hardcoded)
        if (activeRole === 'admin') {
            if (email === 'admin@inamhi.gob.ec' && password === 'admin123') {
                saveSessionData({ nombre: 'Super Admin', rol: 'admin' });
                navigate('/admin');
            } else {
                alert("Credenciales de Administrador incorrectas.");
            }
            return;
        }

        const endpoint = activeRole === 'pasante' ? 'pasantes' : 'usuarios';

        try {
            const response = await fetch(`http://localhost:3001/${endpoint}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Buscar usuario (por user o email) y contraseña
                const usuarioEncontrado = data.find((user: any) => {
                    const inputUser = email.trim().toLowerCase();
                    const inputPass = password.trim();
                    const dbUser = (user.usuario || '').trim().toLowerCase();
                    const dbEmail = (user.email || '').trim().toLowerCase();
                    const dbPass = (user.password || '').trim();
                    return (dbUser === inputUser || dbEmail === inputUser) && (dbPass === inputPass);
                });

                if (usuarioEncontrado) {
                    // Validar Rol Correcto (Excepto para pasantes que es la tabla directa)
                    if (activeRole !== 'pasante') {
                        const rolMap: Record<string, string> = {
                            'human_resources': 'Talento Humano',
                            'security': 'Seguridad'
                        };
                        const rolBD = (usuarioEncontrado.rol || '').toLowerCase();
                        const rolRequerido = (rolMap[activeRole] || '').toLowerCase();
                        if (rolBD !== rolRequerido) {
                            alert(`Error: Este usuario no tiene perfil de ${rolMap[activeRole]}.`);
                            return;
                        }
                    }

                    // --- VALIDACIONES DE ESTADO (ORDEN CRÍTICO) ---

                    // 1. Recuperación de contraseña (Prioridad alta)
                    if (usuarioEncontrado.estadoRecuperacion === 'Atendida') {
                        setTempUser(usuarioEncontrado);
                        setShowAttendedModal(true);
                        return;
                    }

                    const estado = (usuarioEncontrado.estado || '').trim();

                    // 2. Pasantía Finalizada
                    if (estado === 'Finalizado') {
                        setShowFinishedModal(true);
                        return;
                    }

                    // 3. BLOQUEO ESTRICTO: Si no es 'Activo', NO entra.
                    // Esto bloqueará "Pendiente Doc.", "No habilitado", "Inactivo", etc.
                    if (estado !== 'Activo') {
                        setShowStatusModal(true);
                        return; 
                    }

                    // --- LOGIN EXITOSO ---
                    saveSessionData(usuarioEncontrado);
                    switch (activeRole) {
                        case 'human_resources': navigate('/rrhh'); break;
                        case 'security': navigate('/seguridad'); break;
                        case 'pasante': navigate('/pasante'); break;
                    }

                } else {
                    alert("Usuario o contraseña incorrectos.");
                }
            } else {
                alert("Error de conexión.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("No se pudo conectar con el servidor.");
        }
    };

    const saveSessionData = (userData: any) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('role', activeRole);
        if (rememberMe) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
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
                <h1>SYSTEM<br/>ACCESS</h1>
                <div className="brand-tagline">INAMHI Monitoring System<br />v.4.0.2 Stable Release</div>
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

            {/* --- MODALES --- */}

            {/* 1. Modal NO HABILITADO (Bloqueo general) */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}><X size={20} /></button>
                        <div className="modal-icon-wrapper"><AlertCircle size={48} className="icon-warning" /></div>
                        <h3>Acceso Restringido</h3>
                        <p className="modal-message">
                            Tu cuenta aún no está <strong>Activa</strong>.
                            <br/><br/>
                            Asegúrate de haber entregado toda la documentación en Talento Humano para habilitar tu ingreso.
                        </p>
                        <button className="btn-modal-action" onClick={() => setShowStatusModal(false)}>Entendido</button>
                    </div>
                </div>
            )}

            {/* 2. Modal FINALIZADO */}
            {showFinishedModal && (
                <div className="modal-overlay">
                    <div className="modal-content-finished">
                        <button className="close-modal-btn" onClick={() => setShowFinishedModal(false)}><X size={20} /></button>
                        <div className="modal-icon-finished"><GraduationCap size={48} className="icon-info" /></div>
                        <h3>Pasantía Finalizada</h3>
                        <p className="modal-message">Tu periodo de pasantías ha concluido.<br/><br/>¡Gracias por tu colaboración en el <strong>INAMHI</strong>!</p>
                        <button className="btn-modal-action-blue" onClick={() => setShowFinishedModal(false)}>Cerrar</button>
                    </div>
                </div>
            )}

            {/* 3. Modal RECUPERACIÓN SOLICITADA */}
            {showRecoveryModal && (
                <div className="modal-overlay">
                    <div className="modal-content-success">
                        <button className="close-modal-btn" onClick={() => setShowRecoveryModal(false)}><X size={20} /></button>
                        <div className="modal-icon-success"><Send size={40} className="icon-success" /></div>
                        <h3>Solicitud Enviada</h3>
                        <p className="modal-message">Se ha notificado a <strong>Talento Humano</strong> sobre tu solicitud de recuperación para: <span className="email-highlight">{email}</span></p>
                        <button className="btn-modal-action-green" onClick={() => setShowRecoveryModal(false)}>Listo, gracias</button>
                    </div>
                </div>
            )}

            {/* 4. Modal RECUPERACIÓN ATENDIDA (Nueva contraseña) */}
            {showAttendedModal && (
                <div className="modal-overlay">
                    <div className="modal-content-success" style={{ borderColor: '#8b5cf6' }}> 
                        <button className="close-modal-btn" onClick={() => setShowAttendedModal(false)}><X size={20} /></button>
                        <div className="modal-icon-success" style={{ backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
                            <Key size={40} />
                        </div>
                        <h3 style={{ color: '#6d28d9' }}>Recuperación Atendida</h3>
                        <p className="modal-message">
                            Tu solicitud ha sido procesada.
                            <br /><br />
                            Al dar clic en "Ingresar", se actualizará tu estado y accederás al sistema.
                        </p>
                        <button 
                            className="btn-modal-action-green" 
                            style={{ backgroundColor: '#8b5cf6' }} 
                            onClick={handleConfirmAttended} 
                        >
                            Entendido, Ingresar
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Login;