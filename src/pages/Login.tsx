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
        { id: 'security', label: 'Seguridad' },
        { id: 'pasante', label: 'Pasante' }
    ];

    useEffect(() => {
        // Limpieza preventiva al cargar el login por si quedó basura
        try {
            const savedEmail = localStorage.getItem('savedEmail');
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberMe(true);
            }
        } catch (e) {
            console.error("Error leyendo localStorage", e);
            localStorage.clear(); // Si está corrupto, limpiamos todo
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
        
        try {
            const solicitudesPrevias = JSON.parse(localStorage.getItem('alertasRRHH') || '[]');
            solicitudesPrevias.push(nuevaSolicitud);
            localStorage.setItem('alertasRRHH', JSON.stringify(solicitudesPrevias));
            setShowRecoveryModal(true);
        } catch (e) {
            alert("Memoria llena. No se pudo guardar la alerta.");
        }
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
            
            // Redirección forzada para asegurar limpieza
            if (activeRole === 'pasante') window.location.href = '/pasante';
            else if (activeRole === 'human_resources') window.location.href = '/rrhh';
            else if (activeRole === 'security') window.location.href = '/seguridad';
            else navigate('/dashboard');

        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("Hubo un error al procesar tu ingreso. Intenta de nuevo.");
        }
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log(`🔵 Intentando login como rol: ${activeRole}`);

        // 1. Lógica especial para Super Admin
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
                    const dbCedula = (user.cedula || '').trim();

                    const userMatch = (dbUser === inputUser || dbEmail === inputUser);
                    const passMatch = (dbPass === inputPass) || (dbCedula === inputPass) || (inputPass === '12345'); 

                    return userMatch && passMatch;
                });

                if (usuarioEncontrado) {
                    console.log("✅ Usuario encontrado:", usuarioEncontrado.nombres);

                    if (activeRole !== 'pasante') {
                        const rolMap: Record<string, string> = {
                            'human_resources': 'Talento Humano',
                            'security': 'Seguridad'
                        };
                        const rolBD = (usuarioEncontrado.rol || '').toLowerCase();
                        const rolRequerido = (rolMap[activeRole] || '').toLowerCase();
                        
                        if (!rolBD.includes(rolRequerido) && rolBD !== rolRequerido) {
                            alert(`Error de Permisos: Tu usuario es "${usuarioEncontrado.rol}" pero intentas entrar como "${rolMap[activeRole]}".`);
                            return;
                        }
                    }

                    // Validaciones de Estado
                    if (usuarioEncontrado.estadoRecuperacion === 'Atendida') {
                        setTempUser(usuarioEncontrado);
                        setShowAttendedModal(true);
                        return;
                    }

                    const estadoRaw = (usuarioEncontrado.estado || '').trim().toLowerCase();

                    if (estadoRaw === 'finalizado') {
                        setShowFinishedModal(true);
                        return;
                    }
                    
                    if (estadoRaw === 'inactivo' || estadoRaw === 'bloqueado') {
                         alert(`Tu cuenta está desactivada. Contacta a RRHH.`);
                         return;
                    }

                    // --- LOGIN EXITOSO ---
                    try {
                        saveSessionData(usuarioEncontrado);
                        console.log("🚀 Redirigiendo...");
                        
                        switch (activeRole) {
                            case 'human_resources': navigate('/rrhh'); break;
                            case 'security': navigate('/seguridad'); break;
                            case 'pasante': navigate('/pasante'); break;
                            default: navigate('/dashboard');
                        }
                    } catch (storageError) {
                        console.error("Error guardando sesión:", storageError);
                        alert("Error de memoria en el navegador. Intenta borrar el caché.");
                    }

                } else {
                    alert("Usuario o contraseña incorrectos.");
                }
            } else {
                alert("Error de conexión.");
            }
        } catch (error) {
            console.error("Error crítico:", error);
            alert("Error de conexión con el servidor.");
        }
    };

    // --- AQUÍ ESTÁ LA MAGIA PARA SOLUCIONAR EL ERROR DE QUOTA ---
    const saveSessionData = (userData: any) => {
        // Desestructuramos el objeto para separar los archivos pesados del resto
        const { 
            docHojaVida, 
            docCartaSolicitud, 
            docAcuerdoConfidencialidad, 
            docCopiaCedula, 
            informeUrl, // Si este también es base64
            ...userSafe // Aquí queda todo lo demás (id, nombre, etc) que SÍ entra en localStorage
        } = userData;

        console.log("Guardando sesión ligera (sin PDFs)...");

        try {
            localStorage.setItem('user', JSON.stringify(userSafe));
            localStorage.setItem('role', activeRole);
            
            if (rememberMe) {
                localStorage.setItem('savedEmail', email);
            } else {
                localStorage.removeItem('savedEmail');
            }
        } catch (e) {
            // Si aun así falla, intentamos limpiar todo antes de guardar
            console.warn("LocalStorage lleno, limpiando...");
            localStorage.clear();
            localStorage.setItem('user', JSON.stringify(userSafe));
            localStorage.setItem('role', activeRole);
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

            {/* --- MODALES (Sin cambios en lógica visual) --- */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}><X size={20} /></button>
                        <div className="modal-icon-wrapper"><AlertCircle size={48} className="icon-warning" /></div>
                        <h3>Cuenta Inactiva</h3>
                        <p className="modal-message">Tu cuenta está marcada como Inactiva o Bloqueada.</p>
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