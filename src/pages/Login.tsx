import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const Login = () => {
    const [activeRole, setActiveRole] = useState('pasante');
    const navigate = useNavigate();

    const roles = [
        { id: 'admin', label: 'Administrador' },
        { id: 'human_resources', label: 'RR.HH.' },
        { id: 'pasante', label: 'Pasante' }
    ];

    const handleLogin = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        switch (activeRole) {
            case 'admin':
                navigate('/admin'); 
                break;
            case 'human_resources':
                navigate('/rrhh'); 
                break;
            case 'pasante':
                navigate('/pasante'); 
                break;
            default:
                navigate('/'); 
                break;
        }
    };

    return (
        <div className="split-screen-container">

            {/* SECCIÓN IZQUIERDA: RADAR / SONAR */}
            <div className="brand-section">
                
                {/* El "Blip" - Punto detectado por el radar */}
                <div className="radar-blip"></div> 

                {/* Logo Flotante */}
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

            {/* SECCIÓN DERECHA: FORMULARIO */}
            <div className="form-section">

                <button className="btn-back-simple" onClick={() => navigate('/')}>
                    ← Volver
                </button>

                <div className="form-container-wide">
                    <div className="form-header">
                        <h2>Iniciar Sesión</h2>
                        <p>Selecciona tu rol de acceso</p>
                    </div>

                    {/* Selector de Rol (Tabs Estilo Sonar) */}
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

                    {/* FORMULARIO */}
                    <form className="enterprise-form" onSubmit={handleLogin}>

                        <div className="input-block">
                            <label>ID DE USUARIO / CORREO</label>
                            <input
                                type="email"
                                placeholder="usuario@inamhi.gob.ec"
                                className="input-field"
                                required 
                            />
                        </div>

                        <div className="input-block">
                            <label>CLAVE DE ACCESO</label>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                className="input-field"
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