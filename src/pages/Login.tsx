import { useState, useEffect, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, GraduationCap, Send } from 'lucide-react'; 
import '../styles/Login.css';

const Login = () => {
    const [activeRole, setActiveRole] = useState('pasante');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false); 

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showFinishedModal, setShowFinishedModal] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    
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

    // --- FUNCIÓN RECUPERAR MODIFICADA ---
    const handleRecovery = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        if (!email.trim()) {
            alert("⚠️ Escribe tu usuario o correo en el campo de texto para saber a quién recuperar.");
            return;
        }

        // 1. CREAR LA ALERTA
        const nuevaSolicitud = {
            id: Date.now(), // ID único basado en milisegundos
            usuario: email,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            tipo: 'Recuperación de Contraseña',
            leido: false
        };

        // 2. GUARDAR EN EL "BUZÓN" (LocalStorage)
        // Leemos lo que ya hay, agregamos lo nuevo y guardamos
        const solicitudesPrevias = JSON.parse(localStorage.getItem('alertasRRHH') || '[]');
        solicitudesPrevias.push(nuevaSolicitud);
        localStorage.setItem('alertasRRHH', JSON.stringify(solicitudesPrevias));

        // 3. MOSTRAR MODAL DE ÉXITO
        setShowRecoveryModal(true);
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

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
                
                const usuarioEncontrado = data.find((user: any) => {
                    const inputUser = email.trim().toLowerCase();
                    const inputPass = password.trim();
                    const dbUser = (user.usuario || '').trim().toLowerCase();
                    const dbEmail = (user.email || '').trim().toLowerCase();
                    const dbPass = (user.password || '').trim();

                    return (dbUser === inputUser || dbEmail === inputUser) && (dbPass === inputPass);
                });

                if (usuarioEncontrado) {
                    const rolMap: Record<string, string> = {
                        'human_resources': 'Talento Humano',
                        'security': 'Seguridad',
                        'pasante': 'Pasante'
                    };

                    if (activeRole !== 'pasante') {
                        const rolBD = (usuarioEncontrado.rol || '').toLowerCase();
                        const rolRequerido = (rolMap[activeRole] || '').toLowerCase();
                        if (rolBD !== rolRequerido) {
                            alert(`Error: Rol incorrecto.`);
                            return;
                        }
                    }

                    const estado = (usuarioEncontrado.estado || '').trim();

                    if (estado === 'Finalizado') {
                        setShowFinishedModal(true);
                        return;
                    }

                    if (estado === 'No habilitado' || estado === 'Inactivo') {
                        setShowStatusModal(true);
                        return; 
                    }

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

            {/* MODALES (Naranja, Azul, Verde) - Se mantienen igual que antes */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}><X size={20} /></button>
                        <div className="modal-icon-wrapper"><AlertCircle size={48} className="icon-warning" /></div>
                        <h3>Acceso Restringido</h3>
                        <p className="modal-message">Tu cuenta se encuentra en estado <strong>"No Habilitado"</strong>.<br/><br/>Espera a que Talento Humano active tu perfil.</p>
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
                        <p className="modal-message">Tu periodo de pasantías ha concluido.<br/><br/>¡Gracias por tu colaboración en el <strong>INAMHI</strong>!</p>
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
                        <p className="modal-message">Se ha notificado a <strong>Talento Humano</strong> sobre tu solicitud de recuperación para: <span className="email-highlight">{email}</span></p>
                        <button className="btn-modal-action-green" onClick={() => setShowRecoveryModal(false)}>Listo, gracias</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;