import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, AlertTriangle, LogOut, 
  Briefcase, Calendar, FileText, 
  Upload, CheckCircle, ChevronRight,
  Activity, Bell
} from 'lucide-react';
import '../styles/PasanteHome.css';

interface HistorialItem {
  fecha: string;
  tipo: string;
  detalle: string;
  estado: string;
}

interface PasanteData {
  nombre: string; // Used for display (combined from login)
  nombres: string; // Raw data
  apellidos: string; // Raw data
  carrera: string;
  estado: string;
  horasRequeridas: number;
  horasCompletadas: number; // This might not be in initial creation, so we default it
  faltas: number;
  atrasos: number;
  llamadosAtencion: number;
  historialReciente: HistorialItem[];
}

const PasanteHome = () => {
  const navigate = useNavigate();
  const [pasante, setPasante] = useState<PasanteData | null>(null);

  // --- LOAD USER DATA FROM LOCAL STORAGE ---
  useEffect(() => {
    // 1. Get the user object saved during Login
    const storedUser = localStorage.getItem('user');
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      
      // 2. Set state with real data + defaults for missing dashboard fields
      setPasante({
        ...userData,
        // If 'nombre' exists use it, otherwise combine names
        nombre: userData.nombre || `${userData.nombres} ${userData.apellidos}`,
        // Default values for dashboard metrics (since creation form doesn't set them)
        horasCompletadas: userData.horasCompletadas || 0,
        // Ensure horasRequeridas is a number
        horasRequeridas: Number(userData.horasRequeridas) || 0,
        faltas: userData.faltas || 0,
        atrasos: userData.atrasos || 0,
        llamadosAtencion: userData.llamadosAtencion || 0,
        historialReciente: userData.historialReciente || [
            // Default mock history if none exists
            { fecha: '2024-01-20', tipo: 'Sistema', detalle: 'Cuenta creada exitosamente', estado: 'ok' }
        ]
      });
    } else {
      // If no user found, redirect to login
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("¿Deseas cerrar tu sesión?")) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    }
  };

  // Show loading state while checking auth
  if (!pasante) return <div className="loading-screen">Cargando perfil...</div>;

  // --- CALCULATIONS ---
  const porcentaje = pasante.horasRequeridas > 0 
    ? Math.min((pasante.horasCompletadas / pasante.horasRequeridas) * 100, 100) 
    : 0;
    
  const esCompletado = porcentaje >= 100;
  const limiteLlamados = 3;
  const esCritico = pasante.llamadosAtencion >= limiteLlamados;

  return (
    <div className="layout-wrapper">
      
      {/* SIDEBAR */}
      <aside className="modern-sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
            <Briefcase size={24} />
          </div>
          <span className="logo-text">InternApp</span>
        </div>

        <div className="nav-links">
          <button className="nav-item active">
            <div className="nav-icon"><Activity size={20}/></div>
            <span>Dashboard</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon"><Calendar size={20}/></div>
            <span>Historial</span>
          </button>
          <button className="nav-item">
            <div className="nav-icon"><Bell size={20}/></div>
            <span>Notificaciones</span>
          </button>

          <div className="nav-separator"></div>

          <button onClick={handleLogout} className="nav-item logout-item">
            <div className="nav-icon"><LogOut size={20} /></div>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-area">
        
        {/* HEADER */}
        <header className="top-header">
          <div>
            {/* Display first name only for greeting */}
            <h1>Hola, {pasante.nombre.split(' ')[0]} 👋</h1>
            <p className="subtitle">Resumen de tu pasantía en {pasante.carrera}</p>
          </div>
          <div className="profile-pill">
            <div className={`status-dot ${esCritico ? 'dot-red' : 'dot-green'}`}></div>
            <span>{pasante.estado || "Activo"}</span>
            <div className="avatar-circle">{pasante.nombre.charAt(0)}</div>
          </div>
        </header>

        {/* GRID DASHBOARD */}
        <div className="dashboard-grid">
          
          {/* 1. TARJETA PROGRESO */}
          <div className="card hero-card">
            <div className="hero-content">
              <h3>Progreso General</h3>
              <p>Has completado el <strong>{porcentaje.toFixed(1)}%</strong> de tus horas.</p>
              
              <div className="stats-row">
                <div className="stat-item">
                  <span className="label">Completadas</span>
                  <span className="value">{pasante.horasCompletadas}h</span>
                </div>
                <div className="stat-separator">/</div>
                <div className="stat-item">
                  <span className="label">Meta</span>
                  <span className="value">{pasante.horasRequeridas}h</span>
                </div>
              </div>
            </div>

            <div className="circular-chart-wrapper">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" 
                  strokeDasharray={`${porcentaje}, 100`} 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                />
              </svg>
              <div className="percentage-text">
                {esCompletado ? <CheckCircle size={32} color="#10b981"/> : <Clock size={32} color="#6366f1"/>}
              </div>
            </div>
          </div>

          {/* 2. KPIs */}
          <div className="kpi-column">
            
            <div className={`card kpi-card ${esCritico ? 'danger-theme' : ''}`}>
              <div className="kpi-icon-bg bg-orange">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="kpi-label">Sanciones</span>
                <div className="kpi-value-row">
                  <span className="kpi-number">{pasante.llamadosAtencion}</span>
                  <span className="kpi-total">/ {limiteLlamados}</span>
                </div>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon-bg bg-blue">
                <Clock size={20} />
              </div>
              <div>
                <span className="kpi-label">Atrasos</span>
                <div className="kpi-value-row">
                  <span className="kpi-number">{pasante.atrasos}</span>
                </div>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon-bg bg-purple">
                <Calendar size={20} />
              </div>
              <div>
                <span className="kpi-label">Faltas</span>
                <div className="kpi-value-row">
                  <span className="kpi-number">{pasante.faltas}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. ACTIVIDAD */}
          <div className="card list-card">
            <div className="card-header-row">
              <h3>Actividad Reciente</h3>
              <button className="btn-link">Ver historial</button>
            </div>
            <div className="activity-list">
              {pasante.historialReciente.map((item, idx) => (
                <div key={idx} className="activity-item">
                  <div className={`activity-dot ${item.estado}`}></div>
                  <div className="activity-info">
                    <span className="act-type">{item.tipo}</span>
                    <span className="act-detail">{item.detalle}</span>
                  </div>
                  <span className="act-date">{item.fecha}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. ACCIONES */}
          <div className="card actions-card">
            <div className="card-header-row">
              <h3>Gestión de Cierre</h3>
            </div>
            <div className="actions-grid">
              <button disabled={!esCompletado} className="action-btn primary">
                <div className="icon-box"><Upload size={24}/></div>
                <div className="text-box">
                  <span className="btn-title">Subir Informe Final</span>
                  <span className="btn-desc">PDF firmado (Máx 5MB)</span>
                </div>
                <ChevronRight size={20} className="chevron"/>
              </button>

              <button className="action-btn secondary">
                <div className="icon-box"><FileText size={24}/></div>
                <div className="text-box">
                  <span className="btn-title">Descargar Plantilla</span>
                  <span className="btn-desc">Formato oficial horas</span>
                </div>
                <ChevronRight size={20} className="chevron"/>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default PasanteHome;