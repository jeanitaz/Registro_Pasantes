import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, GraduationCap } from 'lucide-react'; // Ensure you have lucide-react installed
import '../styles/Login.css';

const Login = () => {
    const [activeRole, setActiveRole] = useState('pasante');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // --- MODAL STATES ---
    const [showStatusModal, setShowStatusModal] = useState(false);   // For "No habilitado" / "Inactivo"
    const [showFinishedModal, setShowFinishedModal] = useState(false); // For "Finalizado"
    
    const navigate = useNavigate();

    const roles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'human_resources', label: 'RR.HH.' },
        { id: 'security', label: 'Seguridad' },
        { id: 'pasante', label: 'Pasante' }
    ];

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // ---------------------------------------------------------
        // 1. ADMIN LOGIC (HARDCODED)
        // ---------------------------------------------------------
        if (activeRole === 'admin') {
            if (email === 'admin@inamhi.gob.ec' && password === 'admin123') {
                localStorage.setItem('user', JSON.stringify({ nombre: 'Super Admin', rol: 'admin' }));
                localStorage.setItem('role', 'admin');
                navigate('/admin');
            } else {
                alert("Credenciales de Administrador incorrectas.");
            }
            return;
        }

        // ---------------------------------------------------------
        // 2. DATABASE LOGIC (Interns, HR, Security)
        // ---------------------------------------------------------
        const endpoint = activeRole === 'pasante' ? 'pasantes' : 'usuarios';

        try {
            // Fetch all users from the endpoint to filter safely on the client side
            const response = await fetch(`http://localhost:3001/${endpoint}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Smart Search: Case insensitive & trimmed
                const usuarioEncontrado = data.find((user: any) => {
                    const inputUser = email.trim().toLowerCase();
                    const inputPass = password.trim();
                    
                    const dbUser = (user.usuario || '').trim().toLowerCase();
                    const dbEmail = (user.email || '').trim().toLowerCase();
                    const dbPass = (user.password || '').trim();

                    // Match User OR Email AND Password
                    return (dbUser === inputUser || dbEmail === inputUser) && (dbPass === inputPass);
                });

                if (usuarioEncontrado) {
                    
                    // --- ROLE VALIDATION ---
                    const rolMap: Record<string, string> = {
                        'human_resources': 'Talento Humano',
                        'security': 'Seguridad',
                        'pasante': 'Pasante'
                    };

                    if (activeRole !== 'pasante') {
                        const rolBD = (usuarioEncontrado.rol || '').toLowerCase();
                        const rolRequerido = (rolMap[activeRole] || '').toLowerCase();
                        
                        if (rolBD !== rolRequerido) {
                            alert(`Error: Estas credenciales pertenecen al rol "${usuarioEncontrado.rol}". Por favor cambia de pestaña.`);
                            return;
                        }
                    }

                    // --- STATUS VALIDATION ---
                    const estadoNormalizado = (usuarioEncontrado.estado || '').toLowerCase().trim();

                    // CASE 1: FINALIZED -> Blue Modal
                    if (estadoNormalizado === 'finalizado') {
                        setShowFinishedModal(true);
                        return; // Stop login process
                    }

                    // CASE 2: NOT ENABLED / INACTIVE -> Orange Modal
                    if (estadoNormalizado === 'no habilitado' || estadoNormalizado === 'inactivo') {
                        setShowStatusModal(true);
                        return; // Stop login process
                    }

                    // --- LOGIN SUCCESS ---
                    localStorage.setItem('user', JSON.stringify(usuarioEncontrado));
                    localStorage.setItem('role', activeRole);
                    
                    switch (activeRole) {
                        case 'human_resources': navigate('/rrhh'); break;
                        case 'security': navigate('/seguridad'); break;
                        case 'pasante': navigate('/pasante'); break;
                    }

                } else {
                    alert("Usuario o contraseña incorrectos.");
                }
            } else {
                alert("Error al conectar con la base de datos.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("No se pudo conectar con el servidor (db.json).");
        }
    };

    return (
        <div className="split-screen-container">

            {/* LEFT SECTION (RADAR) */}
            <div className="brand-section">
                <div className="radar-blip"></div> 
                <div className="brand-logo-large">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '50px', height: '50px', color: '#67e8f9' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                </div>
                <h1>SYSTEM<br/>ACCESS</h1>
                <div className="brand-tagline">
                    INAMHI Monitoring System<br />
                    v.4.0.2 Stable Release
                </div>
            </div>

            {/* RIGHT SECTION (FORM) */}
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
                                placeholder="••••••••••••"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <label className="checkbox-simple">
                                <input type="checkbox" /> Recordar sesión
                            </label>
                            <a href="#" className="link-recover">Recuperar acceso</a>
                        </div>

                        <button type="submit" className="btn-submit-wide">
                            Ingresar al Sistema
                        </button>
                    </form>

                    <footer className="form-footer">
                        © 2025 INAMHI - Departamento de Tecnología
                    </footer>
                </div>
            </div>

            {/* --- MODAL 1: ACCOUNT NOT ENABLED (Orange) --- */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content-warning">
                        <button className="close-modal-btn" onClick={() => setShowStatusModal(false)}>
                            <X size={20} />
                        </button>
                        <div className="modal-icon-wrapper">
                            <AlertCircle size={48} className="icon-warning" />
                        </div>
                        <h3>Acceso Restringido</h3>
                        <p className="modal-message">
                            Tu cuenta se encuentra en estado <strong>"No Habilitado"</strong>.
                            <br/><br/>
                            Espera a que Talento Humano active tu perfil.
                        </p>
                        <button className="btn-modal-action" onClick={() => setShowStatusModal(false)}>
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: INTERNSHIP FINISHED (Blue) --- */}
            {showFinishedModal && (
                <div className="modal-overlay">
                    <div className="modal-content-finished">
                        <button className="close-modal-btn" onClick={() => setShowFinishedModal(false)}>
                            <X size={20} />
                        </button>
                        
                        <div className="modal-icon-finished">
                            <GraduationCap size={48} className="icon-info" />
                        </div>
                        
                        <h3>Pasantía Finalizada</h3>
                        <p className="modal-message">
                            Tu periodo de pasantías ha concluido exitosamente y tu cuenta ha sido cerrada.
                            <br/><br/>
                            ¡Gracias por tu colaboración en el <strong>INAMHI</strong>!
                        </p>
                        
                        <button className="btn-modal-action-blue" onClick={() => setShowFinishedModal(false)}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Login;