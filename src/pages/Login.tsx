import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const Login = () => {
    const [activeRole, setActiveRole] = useState('pasante');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const roles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'human_resources', label: 'RR.HH.' },
        { id: 'security', label: 'Seguridad' }, // Nuevo rol agregado
        { id: 'pasante', label: 'Pasante' }
    ];

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // ---------------------------------------------------------
        // CASO 1: ADMINISTRADOR (CUENTA QUEMADA / HARDCODED)
        // ---------------------------------------------------------
        if (activeRole === 'admin') {
            // Solo entra si coincide exactamente con esto
            if (email === 'admin@inamhi.gob.ec' && password === 'admin123') {
                localStorage.setItem('user', JSON.stringify({ nombre: 'Super Admin', rol: 'admin' }));
                localStorage.setItem('role', 'admin');
                alert("Bienvenido, Administrador.");
                navigate('/admin');
            } else {
                alert("Credenciales de Administrador incorrectas.");
            }
            return; // Detenemos la ejecución aquí, no buscamos en la BD
        }

        // ---------------------------------------------------------
        // CASO 2: RRHH, SEGURIDAD Y PASANTES (BASE DE DATOS)
        // ---------------------------------------------------------
        
        // Determinar en qué colección buscar (pasantes vs usuarios)
        const endpoint = activeRole === 'pasante' ? 'pasantes' : 'usuarios';

        try {
            // Buscamos coincidencia en la base de datos local
            const response = await fetch(`http://localhost:3001/${endpoint}?q=${email}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Validación estricta de usuario/email y contraseña
                const usuarioEncontrado = data.find((user: any) => 
                    (user.usuario === email || user.email === email) && user.password === password
                );

                if (usuarioEncontrado) {
                    
                    // VALIDACIÓN DE ROL (Para asegurar que un Guardia no entre como RRHH)
                    // Mapa: ID del botón -> Valor en la Base de Datos
                    const rolMap: Record<string, string> = {
                        'human_resources': 'Talento Humano',
                        'security': 'Seguridad',
                        'pasante': 'Pasante' // (Opcional si tu pasante no tiene campo rol, el endpoint ya filtra)
                    };

                    // Si no es pasante (que ya filtramos por endpoint), verificamos el rol exacto
                    if (activeRole !== 'pasante' && usuarioEncontrado.rol !== rolMap[activeRole]) {
                        alert(`Error: Estas credenciales pertenecen a ${usuarioEncontrado.rol}, no a ${roles.find(r => r.id === activeRole)?.label}.`);
                        return;
                    }

                    // Verificar estado activo
                    if (usuarioEncontrado.estado === 'Inactivo' || usuarioEncontrado.estado === 'No habilitado') {
                        alert("Su cuenta se encuentra inactiva o deshabilitada.");
                        return;
                    }

                    // --- LOGIN EXITOSO ---
                    localStorage.setItem('user', JSON.stringify(usuarioEncontrado));
                    localStorage.setItem('role', activeRole);
                    
                    // Redirecciones
                    switch (activeRole) {
                        case 'human_resources':
                            navigate('/rrhh');
                            break;
                        case 'security':
                            navigate('/seguridad'); // Asegúrate de crear esta ruta
                            break;
                        case 'pasante':
                            navigate('/pasante');
                            break;
                    }

                } else {
                    alert("Usuario o contraseña incorrectos.");
                }
            } else {
                alert("Error al consultar la base de datos.");
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            alert("No se pudo conectar con el servidor. Asegúrese de que 'npm run server' esté ejecutándose.");
        }
    };

    return (
        <div className="split-screen-container">

            {/* SECCIÓN IZQUIERDA */}
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

            {/* SECCIÓN DERECHA */}
            <div className="form-section">
                <button className="btn-back-simple" onClick={() => navigate('/')}>
                    ← Volver
                </button>

                <div className="form-container-wide">
                    <div className="form-header">
                        <h2>Iniciar Sesión</h2>
                        <p>Selecciona tu rol de acceso</p>
                    </div>

                    {/* Selector de Rol Actualizado */}
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
        </div>
    );
};

export default Login;