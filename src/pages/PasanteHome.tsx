import { useState } from 'react';
import { 
  Clock, AlertTriangle, LogOut, 
  Briefcase, Calendar, FileText, 
  Upload, CheckCircle, ChevronRight,
  Activity, Bell
} from 'lucide-react';
import '../styles/PasanteHome.css';

const PasanteHome = () => {
  // --- MOCK DATA ---
  const [pasante] = useState({
    nombre: "Juan Pérez",
    carrera: "Desarrollo de Software",
    estado: "Activo", 
    horasRequeridas: 400,
    horasCompletadas: 320,
    faltas: 1,
    atrasos: 6,
    llamadosAtencion: 1,
    historialReciente: [
      { fecha: '2024-01-20', tipo: 'Asistencia', detalle: 'Entrada: 08:00 - Salida: 14:00', estado: 'ok' },
      { fecha: '2024-01-19', tipo: 'Atraso', detalle: 'Entrada: 08:15 (+15 min)', estado: 'warn' },
      { fecha: '2024-01-18', tipo: 'Asistencia', detalle: 'Entrada: 08:00 - Salida: 14:00', estado: 'ok' },
    ]
  });

  const porcentaje = Math.min((pasante.horasCompletadas / pasante.horasRequeridas) * 100, 100);
  const esCompletado = porcentaje >= 100;
  const limiteLlamados = 3;
  const esCritico = pasante.llamadosAtencion >= limiteLlamados;

  const handleLogout = () => {
    if (window.confirm("¿Deseas cerrar tu sesión?")) {
      window.location.href = "/login";
    }
  };

  return (
    <div className="layout-wrapper">
      
      {/* SIDEBAR (Con botón salir integrado arriba) */}
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

          {/* SEPARADOR VISUAL */}
          <div className="nav-separator"></div>

          {/* BOTÓN SALIR (Integrado en el flujo) */}
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
            <h1>Hola, {pasante.nombre.split(' ')[0]} 👋</h1>
            <p className="subtitle">Resumen de tu pasantía en {pasante.carrera}</p>
          </div>
          <div className="profile-pill">
            <div className={`status-dot ${esCritico ? 'dot-red' : 'dot-green'}`}></div>
            <span>{pasante.estado}</span>
            <div className="avatar-circle">{pasante.nombre.charAt(0)}</div>
          </div>
        </header>

        {/* GRID DASHBOARD */}
        <div className="dashboard-grid">
          
          {/* 1. TARJETA PROGRESO (Hero) */}
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

            {/* Gráfico Circular SVG */}
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