import { useNavigate } from 'react-router-dom';
import '../styles/Home.css'; 
import logoInamhi from '../assets/lgo.png'; 

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="split-wrapper">
            
            {/* --- COLUMNA IZQUIERDA: CONTENIDO --- */}
            <section className="content-side">
                <header className="nav-header">
                    <span className="pill-badge">Portal Institucional 2025</span>
                </header>

                <div className="text-content">
                    <div className="brand-line">
                        <h1 className="brand-name">INAMHI</h1>
                    </div>

                    <h2 className="display-title">
                        Centro control de <br />
                        <span className="text-gradient">Pasantes</span>
                    </h2>

                    <p className="description-text">
                        Bienvenido al ecosistema de gestión de pasantes. 
                        Centralizamos la asistencia, evaluación y seguimiento 
                        en una plataforma segura y escalable.
                    </p>

                    <div className="action-area">
                        <button 
                            className="btn-primary-solid" 
                            onClick={() => navigate('/login')}
                        >
                            Iniciar Sesión
                            <span className="arrow">→</span>
                        </button>
                        
                        <button className="btn-secondary-outline">
                            Documentación
                        </button>
                    </div>
                </div>

                <footer className="simple-footer">
                    <p>© 2025 INAMHI — Departamento de Tecnología</p>
                </footer>
            </section>

            {/* --- COLUMNA DERECHA: VISUAL ABSTRACTO (MEJORADO) --- */}
            <section className="visual-side">
                {/* Formas orgánicas animadas */}
                <div className="abstract-shape shape-1"></div>
                <div className="abstract-shape shape-2"></div>
                <div className="abstract-shape shape-3"></div>
                
                {/* Panel de Vidrio Premium con el Logo */}
                <div className="glass-panel">
                    <img 
                        src={logoInamhi} 
                        alt="Logo INAMHI" 
                        className="glass-logo" 
                    />
                </div>
            </section>

        </div>
    );
};

export default Home;