import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import '../styles/Home.css'; 
import logoInamhi from '../assets/lgo.png'; 

const Home = () => {
    const navigate = useNavigate();
    const [showDocsModal, setShowDocsModal] = useState(false);

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
                        
                        <button 
                            className="btn-secondary-outline"
                            onClick={() => setShowDocsModal(true)}
                        >
                            Documentación y Reglas
                        </button>
                    </div>
                </div>

                <footer className="simple-footer">
                    <p>© 2025 INAMHI — Departamento de Tecnología</p>
                </footer>
            </section>

            {/* --- COLUMNA DERECHA: VISUAL ABSTRACTO --- */}
            <section className="visual-side">
                <div className="abstract-shape shape-1"></div>
                <div className="abstract-shape shape-2"></div>
                <div className="abstract-shape shape-3"></div>
                
                <div className="glass-panel">
                    <img 
                        src={logoInamhi} 
                        alt="Logo INAMHI" 
                        className="glass-logo" 
                    />
                </div>
            </section>

            {/* --- MODAL DE DOCUMENTACIÓN Y REGLAS --- */}
            {showDocsModal && (
                <div className="modal-overlay" onClick={() => setShowDocsModal(false)}>
                    <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowDocsModal(false)}>
                            <X size={24} />
                        </button>
                        
                        <div className="modal-header">
                            <h2>Guía del Pasante</h2>
                        </div>

                        <div className="modal-scroll-body">
                            {/* SECCIÓN 1: REQUISITOS ACTIVACIÓN */}
                            <section className="info-section">
                                <h3 className="section-title"><CheckCircle size={20} className="icon-green"/> Requisitos para Activación</h3>
                                <div className="info-card">
                                    <p>Para pasar de estado <strong>"No Habilitado"</strong> a <strong>"Activo"</strong>, debes subir los siguientes documentos en formato PDF:</p>
                                    <ul className="checklist">
                                        <li>Hoja de Vida actualizada</li>
                                        <li>Carta de Solicitud de Pasantías (Firmada)</li>
                                        <li>Acuerdo de Confidencialidad</li>
                                        <li>Copia de Cédula de Identidad</li>
                                    </ul>
                                </div>
                            </section>

                            {/* SECCIÓN 2: ESTADOS DEL SISTEMA */}
                            <section className="info-section">
                                <h3 className="section-title"><FileText size={20} className="icon-blue"/> Estados del Sistema</h3>
                                <div className="grid-estados">
                                    <div className="estado-item">
                                        <span className="badge gray">No habilitado</span>
                                        <p>Documentación incompleta. No puede timbrar.</p>
                                    </div>
                                    <div className="estado-item">
                                        <span className="badge green">Habilitado / Activo</span>
                                        <p>Checklist completo. Puede registrar asistencia.</p>
                                    </div>
                                    <div className="estado-item">
                                        <span className="badge blue">Aprobado</span>
                                        <p>Automático al completar el 100% de las horas requeridas.</p>
                                    </div>
                                    <div className="estado-item">
                                        <span className="badge red">Finalizado (Sanción)</span>
                                        <p>Por faltas, atrasos o llamados de atención excedidos.</p>
                                    </div>
                                </div>
                            </section>

                            {/* SECCIÓN 3: REGLAS DE ASISTENCIA */}
                            <section className="info-section">
                                <h3 className="section-title"><AlertTriangle size={20} className="icon-orange"/> Normativa de Sanciones</h3>
                                <div className="rules-grid">
                                    <div className="rule-card">
                                        <h4><Clock size={16}/> Atrasos</h4>
                                        <ul>
                                            <li>Máximo <strong>5 atrasos</strong> de mayor a 15 minutos en entrada.</li>
                                            <li>Máximo <strong>5 atrasos</strong> de mayor a 10 minutos en regreso de almuerzo.</li>
                                            <li>Exceder límite = <strong>Finalizado por atrasos</strong>.</li>
                                        </ul>
                                    </div>
                                    <div className="rule-card">
                                        <h4><AlertTriangle size={16}/> Faltas</h4>
                                        <ul>
                                            <li>Máximo <strong>3 faltas</strong> injustificadas.</li>
                                            <li>Justificables solo con documento médico/legal entregado a TH.</li>
                                            <li>Exceder límite = <strong>Finalizado por faltas</strong>.</li>
                                        </ul>
                                    </div>
                                    <div className="rule-card">
                                        <h4><FileText size={16}/> Llamados de Atención</h4>
                                        <ul>
                                            <li>Máximo <strong>3 llamados</strong> leves.</li>
                                            <li>1 falta grave = Finalización inmediata.</li>
                                            <li>Exceder límite = <strong>Finalizado por disciplina</strong>.</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section className="info-section">
                                <h3 className="section-title"><Clock size={20} className="icon-purple"/> Cálculo de Horas</h3>
                                <div className="info-card-simple">
                                    <p>El tiempo de almuerzo (30 min) <strong>NO</strong> se cuenta como hora laboral.</p>
                                    <p><em>Ejemplo: Entrada 12:00, Salida Almuerzo 13:00, Retorno 13:30, Salida 16:30 = <strong>4 Horas efectivas</strong>.</em></p>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Home;
