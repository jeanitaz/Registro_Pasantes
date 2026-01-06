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
    const [showAttendedModal, setShowAttendedModal] = useState(false);

    const [tempUser, setTempUser] = useState<any>(null);

    const navigate = useNavigate();

    const roles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'human_resources', label: 'RR.HH.' },
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
        const endpoint = activeRole === 'pasante' ? 'pasantes' : 'usuarios';
        try {
            await fetch(`http://localhost:3001/${endpoint}/${tempUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoRecuperacion: 'Completado' })
            });
            saveSessionData(tempUser);
            setShowAttendedModal(false);

            if (activeRole === 'pasante') navigate('/pasante');
            else navigate('/dashboard');

        } catch (error) {
            console.error(error);
        }
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 1. Super Admin (Hardcoded - Esto se mantiene igual por seguridad básica)
        if (activeRole === 'admin') {
            if (email === 'admin@inamhi.gob.ec' && password === 'admin123') {
                saveSessionData({ nombre: 'Super Admin', rol: 'admin' });
                navigate('/admin');
            } else {
                alert("Credenciales de Administrador incorrectas.");
            }
            return;
        }

        // Determinar endpoint según el rol seleccionado
        const endpoint = activeRole === 'pasante' ? 'pasantes' : 'usuarios';

        try {
            // --- CAMBIO CLAVE PARA MYSQL ---
            // Enviamos las credenciales como query params para que el backend filtre
            const queryParams = new URLSearchParams({
                usuario: email.trim(), // Enviamos lo que escribió el usuario (puede ser user o email)
                password: password.trim()
            });

            const response = await fetch(`http://localhost:3001/${endpoint}?${queryParams}`);

            if (response.ok) {
                const data = await response.json();

                // Si el array tiene datos, significa que encontró al usuario
                if (data.length > 0) {
                    const usuarioEncontrado = data[0]; // Tomamos el primero que coincida

                    // --- VALIDACIÓN DE ROL ---
                    if (activeRole !== 'pasante') {
                        const rolMap: Record<string, string> = {
                            'human_resources': 'Talento Humano',
                            'seguridad': 'Seguridad'
                        };

                        const rolEsperado = rolMap[activeRole];
                        const rolReal = usuarioEncontrado.rol;

                        if (rolReal !== rolEsperado) {
                            alert(`Error: Este usuario no tiene permisos de ${activeRole === 'human_resources' ? 'RR.HH.' : activeRole}.`);
                            return;
                        }
                    }

                    // --- VALIDACIÓN DE ESTADO ---
                    const estado = (usuarioEncontrado.estado || 'Activo').toLowerCase();

                    if (estado !== 'activo') {
                        if (activeRole === 'pasante') {
                            if (estado === 'finalizado') setShowFinishedModal(true);
                            else setShowStatusModal(true);
                        } else {
                            alert("Acceso denegado: Su cuenta está inactiva.");
                        }
                        return;
                    }

                    // --- VERIFICAR RECUPERACIÓN ---
                    if (usuarioEncontrado.estadoRecuperacion === 'Atendido') {
                        setTempUser(usuarioEncontrado);
                        setShowAttendedModal(true);
                        return;
                    }

                    // --- LOGIN EXITOSO ---
                    saveSessionData(usuarioEncontrado);

                    if (activeRole === 'pasante') navigate('/pasante');
                    else if (activeRole === 'human_resources') navigate('/rrhh');
                    else navigate('/dashboard');

                } else {
                    // Si el array está vacío, no encontró coincidencias
                    alert("Usuario o contraseña incorrectos.");
                }
            } else {
                alert("Error al conectar con la base de datos.");
            }
        } catch (error) {
            console.error(error);
            alert("El servidor no responde. Asegúrate de correr 'npm run dev:all'.");
        }
    };

    const saveSessionData = (userData: any) => {
        const {
            docHojaVida,
            docCartaSolicitud,
            docAcuerdoConfidencialidad,
            docCopiaCedula,
            informeUrl,
            ...userSafe
        } = userData;

        console.log("Guardando sesión...");

        try {
            localStorage.setItem('user', JSON.stringify(userSafe));
            localStorage.setItem('role', activeRole);

            if (rememberMe) localStorage.setItem('savedEmail', email);
            else localStorage.removeItem('savedEmail');
        } catch (e) {
            console.warn("LocalStorage lleno. Intentando limpiar...");
            localStorage.clear();
            try {
                localStorage.setItem('user', JSON.stringify(userSafe));
                localStorage.setItem('role', activeRole);
            } catch (err) {
                alert("Tu foto de perfil es demasiado pesada para guardarse en la sesión. Se omitirá.");
                const { fotoUrl, ...userNoPhoto } = userSafe;
                localStorage.setItem('user', JSON.stringify(userNoPhoto));
                localStorage.setItem('role', activeRole);
            }
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
                <h1>SYSTEM<br />ACCESS</h1>
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

            {/* MODALES */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}><X size={20} /></button>
                        <div className="modal-icon-wrapper"><AlertCircle size={48} className="icon-warning" /></div>
                        <h3>Acceso Restringido</h3>
                        <p className="modal-message">
                            Tu cuenta aún <strong>no ha sido activada</strong>.
                            <br /><br />
                            Debes esperar a que Talento Humano valide y suba tu documentación habilitante para poder ingresar al sistema.
                        </p>
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
                        <p className="modal-message">Tu periodo de pasantías ha concluido.<br /><br />¡Gracias por tu colaboración en el <strong>INAMHI</strong>!</p>
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
                            El administrador de RR.HH ha recibido tu solicitud de recuperación para: <strong>{email}</strong>
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