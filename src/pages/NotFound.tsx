import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShieldAlert, WifiOff } from 'lucide-react';
import '../styles/NotFound.css';

const NotFound = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isUnauthorized = location.pathname === '/unauthorized';
    
    return (
        <div className="notfound-container">
            <div className="space-stars"></div>
            <div className="notfound-content">
                <div className="radar-scanner-wrapper">
                    <svg className="radar-svg" viewBox="0 0 200 200">
                        <defs>
                            <linearGradient id="sweepGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.4" />
                            </linearGradient>
                        </defs>
                        
                        {/* Radar grid circles */}
                        <circle cx="100" cy="100" r="90" className="radar-grid outer" />
                        <circle cx="100" cy="100" r="65" className="radar-grid middle" />
                        <circle cx="100" cy="100" r="40" className="radar-grid inner" />
                        
                        {/* Radar axes */}
                        <line x1="10" y1="100" x2="190" y2="100" className="radar-axis" />
                        <line x1="100" y1="10" x2="100" y2="190" className="radar-axis" />
                        
                        {/* Rotating scanner beam */}
                        <g className="radar-sweep-g">
                            <polygon points="100,100 100,10 135,15 160,30" fill="url(#sweepGrad)" />
                            <line x1="100" y1="100" x2="100" y2="10" className="radar-sweep-edge" />
                        </g>

                        {/* Blinking markers showing warning blips */}
                        <circle cx="60" cy="70" r="5" className="blip blip-lost" />
                        <circle cx="140" cy="130" r="4" className="blip blip-lost-2" />
                    </svg>
                    
                    {/* Atmospheric coordinates matching Quito INAMHI HQ */}
                    <div className="radar-coordinates top-left">LAT: 0.1807° S</div>
                    <div className="radar-coordinates top-right">LON: 78.4678° W</div>
                    <div className="radar-coordinates bottom-left">ELEV: 2790m</div>
                    <div className="radar-coordinates bottom-right">INAMHI_NET: ERR_LOST</div>
                </div>

                <div className="notfound-card">
                    <div className="error-badge">
                        {isUnauthorized ? <ShieldAlert size={16} /> : <WifiOff size={16} />}
                        <span>{isUnauthorized ? "ACCESO DENEGADO" : "SEÑAL PERDIDA"}</span>
                    </div>
                    <h1 className="error-code">{isUnauthorized ? "403" : "404"}</h1>
                    <h2>{isUnauthorized ? "Sección Restringida" : "Ruta No Encontrada"}</h2>
                    <p>
                        {isUnauthorized 
                            ? "No tienes los privilegios necesarios para acceder a esta área del sistema. Verifica tus credenciales o consulta con el departamento de tecnología."
                            : "El satélite no pudo encontrar la página que buscas. Es posible que la dirección sea incorrecta o haya sido reubicada temporalmente."
                        }
                    </p>
                    <button className="btn-notfound-home" onClick={() => navigate('/')}>
                        <Home size={18} />
                        <span>Volver al Inicio</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
