import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Users,
    LogOut, LayoutGrid, Bell,
    CheckCircle2,
    KeyRound, X,
    History, FileText, Download, UploadCloud, Eye, ExternalLink,
    Gavel, Ban
} from 'lucide-react';
import '../styles/RRHHHome.css';

// LÍMITES SEGÚN REGLAS DE NEGOCIO
const LIMITES = {
    ATRASOS: 5,
    FALTAS: 3,
    LLAMADOS: 3
};

interface Documento { id: string; nombre: string; validado: boolean; }

interface Pasante {
    id: number; nombre: string; cedula: string; carrera: string; estado: string;
    progresoHoras: number; horasRequeridas: number;
    faltas: number; atrasos: number; llamadosAtencion: number;
    fechasFaltas: string[]; documentos: Documento[];
    informeFinalSubido: boolean;
    informeUrl?: string;
    institucion?: string;
}

interface Alerta { id: number; usuario: string; fecha: string; tipo: string; leido: boolean; }

const ToastItem = ({ alerta, onClose }: { alerta: Alerta; onClose: (id: number) => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(alerta.id), 10000);
        return () => clearTimeout(timer);
    }, [alerta.id, onClose]);
    return (
        <div className="clean-toast">
            <div className="clean-toast-icon"><KeyRound size={18} /></div>
            <div className="clean-toast-content">
                <h4>Recuperación de Clave</h4>
                <p><strong>{alerta.usuario}</strong> solicitó acceso.</p>
                <span>{alerta.fecha}</span>
            </div>
            <button onClick={() => onClose(alerta.id)}><X size={16} /></button>
        </div>
    );
};

const RRHHModern = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPasante, setSelectedPasante] = useState<Pasante | null>(null);
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [dismissedIds, setDismissedIds] = useState<number[]>([]);

    const [showPdfModal, setShowPdfModal] = useState(false);

    // --- LÓGICA DE ESTADOS AUTOMÁTICA ---
    const determinarEstado = (p: Pasante): string => {
        if (p.atrasos > LIMITES.ATRASOS) return "Finalizado por atrasos excedidos";
        if (p.faltas > LIMITES.FALTAS) return "Finalizado por faltas excedidas";
        if (p.llamadosAtencion > LIMITES.LLAMADOS) return "Finalizado por llamado de atención";

        // Si estaba finalizado y se corrigieron los contadores, vuelve a activo
        if (p.estado.includes("Finalizado")) return "Activo";

        if (p.horasRequeridas > 0 && p.progresoHoras >= p.horasRequeridas) return "Aprobado";

        const docsCompletos = p.documentos.every(d => d.validado);
        if (docsCompletos && p.estado === "No habilitado") return "Activo";

        return p.estado;
    };

    // --- CARGA DE DATOS (POLLING + MAPEO SEGURO) ---
    const fetchPasantes = async () => {
        try {
            const response = await fetch('/api/pasantes');
            if (response.ok) {
                const data = await response.json();

                const pasantesAdaptados = data.map((p: any) => {
                    const docsDinamicos = [
                        { id: 'd1', nombre: 'Hoja de Vida', validado: !!p.docHojaVida },
                        { id: 'd2', nombre: 'Carta de Solicitud', validado: !!p.docCartaSolicitud },
                        { id: 'd3', nombre: 'Acuerdo de Confidencialidad', validado: !!p.docAcuerdoConfidencialidad },
                        { id: 'd4', nombre: 'Copia de Cédula', validado: !!p.docCopiaCedula },
                        { id: 'd5', nombre: 'Carta de Convenio', validado: !!p.docCartaConvenio },
                    ];

                    return {
                        id: p.id,
                        nombre: p.nombre || `${p.nombres} ${p.apellidos}`,
                        cedula: p.cedula,
                        carrera: p.carrera,
                        institucion: p.institucion || 'Inamhi', // Default to Inamhi if not present
                        estado: p.estado || "No habilitado",
                        // AQUÍ ESTÁ LA CORRECCIÓN CLAVE PARA LAS HORAS:
                        progresoHoras: Number(p.horasCompletadas ?? p.horas_completadas ?? 0),
                        horasRequeridas: Number(p.horasRequeridas ?? p.horas_requeridas ?? 0),
                        faltas: p.faltas ?? 0,
                        atrasos: p.atrasos ?? 0,
                        llamadosAtencion: p.llamadosAtencion ?? p.llamados_atencion ?? 0,
                        fechasFaltas: p.fechasFaltas || [],
                        documentos: docsDinamicos,
                        informeFinalSubido: !!(p.informeUrl || p.informe_url),
                        informeUrl: p.informeUrl || p.informe_url
                    };
                });
                setPasantes(pasantesAdaptados);
            }
        } catch (error) { console.error("Error loading interns:", error); }
    };

    useEffect(() => {
        fetchPasantes();
        // Actualizar cada 5 segundos para ver cambios en tiempo real
        const interval = setInterval(fetchPasantes, 5000);
        return () => clearInterval(interval);
    }, []);

    // --- SINCRONIZACIÓN AUTOMÁTICA DEL PANEL DERECHO ---
    useEffect(() => {
        if (selectedPasante) {
            const actualizado = pasantes.find(p => p.id === selectedPasante.id);
            // Si hay cambios en los datos del pasante seleccionado, actualizar la vista
            if (actualizado && JSON.stringify(actualizado) !== JSON.stringify(selectedPasante)) {
                setSelectedPasante(actualizado);
            }
        }
    }, [pasantes, selectedPasante]);

    useEffect(() => {
        const revisarBuzon = () => {
            const buzón = localStorage.getItem('alertasRRHH');
            if (buzón) {
                const listaAlertas: Alerta[] = JSON.parse(buzón);
                setAlertas(prev => (JSON.stringify(prev) !== JSON.stringify(listaAlertas)) ? listaAlertas : prev);
            }
        };
        revisarBuzon();
        const intervalo = setInterval(revisarBuzon, 2000);
        return () => clearInterval(intervalo);
    }, []);

    const ocultarToast = (id: number) => setDismissedIds(prev => [...prev, id]);

    const filteredPasantes = pasantes.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm)
    );

    // --- GESTIÓN DE CONTADORES ---
    const updateContador = async (tipo: 'faltas' | 'atrasos' | 'llamadosAtencion', delta: number) => {
        if (!selectedPasante) return;

        const nuevoValor = Math.max(0, selectedPasante[tipo] + delta);

        // Objeto temporal para recalcular estado
        const pasanteTemporal = { ...selectedPasante, [tipo]: nuevoValor };
        const nuevoEstado = determinarEstado(pasanteTemporal);

        // Mapeo para enviar al backend
        const bodyToSend = {
            [tipo]: nuevoValor,
            estado: nuevoEstado
        };

        try {
            await fetch(`/api/pasantes/${selectedPasante.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyToSend)
            });
            // No necesitamos actualizar el estado local manualmente aquí porque
            // el fetchPasantes (polling) o el useEffect de sincronización lo harán.
            // Pero para respuesta inmediata visual:
            const pasanteActualizado = { ...pasanteTemporal, estado: nuevoEstado };
            setPasantes(prev => prev.map(p => p.id === pasanteActualizado.id ? pasanteActualizado : p));
            setSelectedPasante(pasanteActualizado);

        } catch (error) {
            console.error("Error actualizando contador:", error);
            alert("Error de conexión al actualizar.");
        }
    };

    const handleLogout = () => {
        if (window.confirm("¿Cerrar sesión de administrador?")) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const handleDescargarInforme = () => {
        if (selectedPasante?.informeUrl) {
            const link = document.createElement('a');
            link.href = selectedPasante.informeUrl;
            link.download = `Informe_${selectedPasante.nombre.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("No hay documento disponible.");
        }
    };

    const handleVerInforme = () => {
        if (selectedPasante?.informeUrl) {
            setShowPdfModal(true);
        }
    };

    const calcularProgresoDocs = () => {
        if (!selectedPasante) return 0;
        const validados = selectedPasante.documentos.filter(d => d.validado).length;
        return (validados / selectedPasante.documentos.length) * 100;
    };

    const getStatusColor = (estado: string) => {
        if (estado.includes("Finalizado")) return "pill-danger";
        if (estado === "Aprobado") return "pill-blue";
        if (estado === "Activo") return "pill-success";
        return "pill-warning";
    };

    const handleEarlyTermination = async () => {
        if (!selectedPasante) return;
        const confirmMsg = "⚠ ¿Está seguro de finalizar la pasantía SIN CONCLUSIÓN?\n\nEsta acción:\n1. Bloqueará el acceso al sistema de timbrado.\n2. Cambiará el estado a 'Retirado'.\n3. Habilitará la generación del informe de retiro.";
        if (!window.confirm(confirmMsg)) return;

        try {
            const bodyToSend = { estado: "Retirado" };
            await fetch(`/api/pasantes/${selectedPasante.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyToSend)
            });

            // Actualizar estado local
            const pasanteActualizado = { ...selectedPasante, estado: "Retirado" };
            setPasantes(prev => prev.map(p => p.id === pasanteActualizado.id ? pasanteActualizado : p));
            setSelectedPasante(pasanteActualizado);
            alert("Pasantía finalizada anticipadamente. Ahora puede generar el informe de retiro.");
        } catch (error) {
            console.error("Error finalizando pasantía:", error);
            alert("Error al finalizar pasantía.");
        }
    };

    const handlePrintTermination = () => {
        if (!selectedPasante) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Permita ventanas emergentes para imprimir.");

        const htmlContent = `
    <html>
      <head>
          <title>Acta de Finalización Anticipada - ${selectedPasante.nombre}</title>
          <style>
              @page { size: A4; margin: 20mm; }
              body { 
                  font-family: 'Arial', sans-serif; 
                  color: #333; 
                  line-height: 1.5; 
                  margin: 0; 
                  padding: 0;
              }
              .document-container {
                  padding: 30px;
                  border: 1px solid #eee;
                  position: relative;
              }
              @media print {
                  .document-container { border: none; padding: 0; }
                  body { margin: 0; }
              }

              /* --- ENCABEZADO CON LOGO --- */
              .header { 
                  display: flex; 
                  align-items: center; 
                  justify-content: space-between; /* Separa logo y texto */
                  border-bottom: 3px solid #1a3a5a; 
                  padding-bottom: 10px; 
                  margin-bottom: 30px;
              }
              .header-logo img {
                  max-height: 70px; /* Tamaño controlado del logo */
                  width: auto;
                  display: block;
              }
              .header-text { 
                  flex-grow: 1; 
                  text-align: right; /* Alineación a la derecha se ve más formal */
                  margin-left: 20px;
              }
              .header-text h1 { 
                  font-size: 15px; 
                  margin: 0; 
                  color: #1a3a5a; 
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }
              .header-text h2 { 
                  font-size: 12px; 
                  margin: 4px 0 0; 
                  font-weight: normal; 
                  color: #555;
              }

              /* Título del Documento */
              .title-section { text-align: center; margin-bottom: 40px; }
              .title-section h3 { 
                  font-size: 18px; 
                  text-decoration: underline; 
                  margin-bottom: 8px;
                  color: #000;
                  text-transform: uppercase;
              }
              .doc-number { font-size: 12px; color: #666; font-weight: bold; }

              /* Cuerpo del acta */
              .content-text { font-family: 'Times New Roman', serif; font-size: 15px; text-align: justify; margin-bottom: 25px; line-height: 1.6; }

              /* Tabla de Datos */
              .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .info-table td { padding: 8px 5px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
              .label { font-weight: bold; color: #1a3a5a; width: 35%; font-size: 13px; text-transform: uppercase; }
              .value { font-size: 14px; color: #333; }

              /* Cuadro de Estadísticas */
              .stats-container { 
                  background-color: #f8f9fa; 
                  border-left: 5px solid #1a3a5a; 
                  padding: 15px 20px; 
                  margin: 30px 0;
                  border-radius: 0 4px 4px 0;
              }
              .stats-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; display: block; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #1a3a5a; text-transform: uppercase; }
              .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }

              /* Firmas */
              .signature-section { 
                  margin-top: 60px; 
                  display: flex; 
                  justify-content: space-between; /* Mejor distribución */
                  page-break-inside: avoid;
              }
              .signature-box { 
                  text-align: center; 
                  width: 45%; 
              }
              .signature-line { 
                  border-top: 1px solid #000; 
                  margin-bottom: 8px; 
                  width: 80%;
                  margin-left: auto; margin-right: auto;
              }
              .signature-name { font-weight: bold; font-size: 12px; margin: 0; }
              .signature-role { font-size: 11px; color: #555; text-transform: uppercase; margin-top: 2px; }
          </style>
      </head>
      <body>
          <div class="document-container">
              
              <div class="header">
                  <div class="header-logo">
                      <img src="https://i.postimg.cc/j2p691mH/Captura-de-pantalla-2026-01-09-130055.png" alt="Logo INAMHI" />
                  </div>
              </div>

              <div class="title-section">
                  <h3>Acta de Finalización Anticipada</h3>
                  
              </div>

              <div class="content-text">
                  En la ciudad de Quito, con fecha <strong>${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>, se suscribe la presente acta de finalización anticipada de pasantía pre-profesional, conforme a los registros que constan en el Sistema de Gestión Institucional:
              </div>

              <table class="info-table">
                  <tr>
                      <td class="label">Apellidos y Nombres:</td>
                      <td class="value">${selectedPasante.nombre}</td>
                  </tr>
                  <tr>
                      <td class="label">Cédula de Identidad:</td>
                      <td class="value">${selectedPasante.cedula || 'N/A'}</td>
                  </tr>
                  <tr>
                      <td class="label">Institución Educativa:</td>
                      <td class="value">${selectedPasante.institucion || 'No Registrada'}</td>
                  </tr>
                  <tr>
                      <td class="label">Carrera:</td>
                      <td class="value">${selectedPasante.carrera || 'No Registrada'}</td>
                  </tr>
                  <tr>
                      <td class="label">Estado de Cierre:</td>
                      <td class="value" style="color: #e11d48;"><strong>${selectedPasante.estado.toUpperCase()}</strong></td>
                  </tr>
              </table>

              <div class="stats-container">
                  <span class="stats-title">Resumen de Desempeño y Asistencia</span>
                  <div class="stats-grid">
                      <div><strong>Horas Realizadas:</strong> ${Number(selectedPasante.progresoHoras || 0).toFixed(2)} / ${selectedPasante.horasRequeridas} h</div>
                      <div><strong>Atrasos Registrados:</strong> ${selectedPasante.atrasos || 0}/5</div>
                      <div><strong>Faltas Injustificadas:</strong> ${selectedPasante.faltas || 0}/3</div>
                      <div><strong>Llamados de Atención:</strong> ${selectedPasante.llamadosAtencion || 0}/3</div>
                  </div>
              </div>

              <div class="content-text" style="font-size: 13px;">
                  <strong>OBSERVACIONES:</strong> Se deja constancia que la relación de pasantía termina antes del plazo previsto originalmente debido a las causales indicadas en el estado de cierre. El INAMHI certifica únicamente las horas validadas mediante el registro biométrico y de actividades hasta la presente fecha.
              </div>

              <div class="signature-section">
                  <div class="signature-box">
                      <div class="signature-line"></div>
                      <p class="signature-name">Delegado de Talento Humano</p>
                      <p class="signature-role">INAMHI</p>
                  </div>
                  <div class="signature-box">
                      <div class="signature-line"></div>
                      <p class="signature-name">${selectedPasante.nombre}</p>
                      <p class="signature-role">Pasante / Practicante</p>
                      <p class="signature-role" style="font-size: 10px;">C.I: ${selectedPasante.cedula || 'N/A'}</p>
                  </div>
              </div> 
          </div>
      </body>
      </html>
`;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    return (
        <div className="layout-wrapper">
            <aside className="modern-sidebar">
                <div className="sidebar-header">
                    <div className="logo-box"><Users size={24} /></div>
                    <span className="logo-text">RRHH INAMHI</span>
                </div>
                <div className="nav-links">
                    <button className="nav-item active">
                        <div className="nav-icon"><LayoutGrid size={20} /></div>
                        <span>Dashboard</span>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/historialAlertas')}>
                        <div className="nav-icon" style={{ position: 'relative' }}>
                            <Bell size={20} />
                            {alertas.some(a => !a.leido) && <span className="notification-dot"></span>}
                        </div>
                        <span>Alertas</span>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/Registro')}>
                        <div className="nav-icon"><Users size={20} /></div>
                        <span>Creacion Pasante</span>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/historialP')}>
                        <div className="nav-icon"><History size={20} /></div>
                        <span>Admin. de Pasantes</span>
                    </button>
                    <div className="nav-separator"></div>
                    <button onClick={handleLogout} className="nav-item logout-item">
                        <div className="nav-icon"><LogOut size={20} /></div>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            <section className={`clean-list-panel ${selectedPasante ? 'mobile-hidden' : ''}`}>
                <div className="clean-search-area">
                    <div className="search-input-wrapper">
                        <Search size={16} className="text-gray-400" />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="clean-list-content">
                    <h3 className="list-title">Estudiantes ({filteredPasantes.length})</h3>
                    <div className="list-scroll">
                        {filteredPasantes.map(pasante => (
                            <div key={pasante.id} onClick={() => setSelectedPasante(pasante)} className={`clean-list-item ${selectedPasante?.id === pasante.id ? 'selected' : ''}`}>
                                <div className="item-avatar">{pasante.nombre.charAt(0)}</div>
                                <div className="item-info">
                                    <span className="item-name">{pasante.nombre}</span>
                                    <span className="item-cedula">{pasante.cedula}</span>
                                </div>
                                <div className={`item-dot ${pasante.estado === 'Activo' ? 'bg-emerald' : 'bg-amber'}`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <main className={`clean-main-area ${!selectedPasante ? 'mobile-hidden' : ''}`}>
                <div className="toast-wrapper">
                    {alertas.filter(a => !a.leido && !dismissedIds.includes(a.id)).map(alerta => (
                        <ToastItem key={alerta.id} alerta={alerta} onClose={ocultarToast} />
                    ))}
                </div>

                {selectedPasante ? (
                    <div className="clean-content-fade">
                        <header className="clean-header">
                            <button className="back-btn-mobile" onClick={() => setSelectedPasante(null)}>←</button>
                            <div className="header-profile">
                                <h1>{selectedPasante.nombre}</h1>
                                <div className="header-badges">
                                    <span className="badge-pill">{selectedPasante.carrera}</span>
                                    <span className={`badge-pill ${getStatusColor(selectedPasante.estado)}`}>
                                        {selectedPasante.estado}
                                    </span>
                                </div>
                            </div>
                        </header>

                        <div className="clean-dashboard-grid">
                            <div className="grid-left">
                                {/* CARD: DOCUMENTACIÓN */}
                                <div className="clean-card">
                                    <div
                                        className="card-top interactive-header"
                                        onClick={() => navigate(`/documentacion/${selectedPasante.id}`)}
                                        style={{ cursor: 'pointer' }}
                                        title="Ir al gestor de documentación"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="card-label" style={{ color: '#2563eb' }}>Documentación</span>
                                            <ExternalLink size={14} className="text-blue-500" />
                                        </div>
                                    </div>
                                    <div className="progress-circular">
                                        <div className="progress-text">{calcularProgresoDocs().toFixed(0)}%</div>
                                        <svg viewBox="0 0 36 36" className="circular-chart">
                                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="circle" strokeDasharray={`${calcularProgresoDocs()}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                    </div>
                                    <div className="checklist-mini">
                                        {selectedPasante.documentos.map(doc => (
                                            <div key={doc.id} className="check-row">
                                                <div className={`check-box ${doc.validado ? 'checked' : ''}`}>{doc.validado && <CheckCircle2 size={12} color="white" />}</div>
                                                <span className={doc.validado ? 'text-strike' : ''}>{doc.nombre}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* CARD: CONTROL DISCIPLINARIO (COMPLETO) */}
                                <div className="clean-card">
                                    <div className="card-top">
                                        <span className="card-label">Control Disciplinario</span>
                                        <Gavel size={18} className="text-red-500" />
                                    </div>

                                    <div className="discipline-grid">
                                        {/* Atrasos */}
                                        <div className="control-item">
                                            <div className="control-header">
                                                <span className="control-title">Atrasos</span>
                                                <span className={`control-val ${selectedPasante.atrasos > LIMITES.ATRASOS ? 'text-danger' : ''}`}>
                                                    {selectedPasante.atrasos}/{LIMITES.ATRASOS}
                                                </span>
                                            </div>
                                            <div className="control-buttons">
                                                <button onClick={() => updateContador('atrasos', -1)}>-</button>
                                                <button onClick={() => updateContador('atrasos', 1)}>+</button>
                                            </div>
                                        </div>

                                        {/* Faltas */}
                                        <div className="control-item">
                                            <div className="control-header">
                                                <span className="control-title">Faltas</span>
                                                <span className={`control-val ${selectedPasante.faltas > LIMITES.FALTAS ? 'text-danger' : ''}`}>
                                                    {selectedPasante.faltas}/{LIMITES.FALTAS}
                                                </span>
                                            </div>
                                            <div className="control-buttons">
                                                <button onClick={() => updateContador('faltas', -1)}>-</button>
                                                <button onClick={() => updateContador('faltas', 1)}>+</button>
                                            </div>
                                        </div>

                                        {/* Llamados */}
                                        <div className="control-item">
                                            <div className="control-header">
                                                <span className="control-title">Llamados</span>
                                                <span className={`control-val ${selectedPasante.llamadosAtencion > LIMITES.LLAMADOS ? 'text-danger' : ''}`}>
                                                    {selectedPasante.llamadosAtencion}/{LIMITES.LLAMADOS}
                                                </span>
                                            </div>
                                            <div className="control-buttons">
                                                <button onClick={() => updateContador('llamadosAtencion', -1)}>-</button>
                                                <button onClick={() => updateContador('llamadosAtencion', 1)}>+</button>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedPasante.estado.includes("Finalizado") && (
                                        <div className="alert-box-danger">
                                            <Ban size={16} />
                                            <span>Estado Crítico: {selectedPasante.estado}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid-right">
                                <div className="clean-card card-full-height">
                                    <div className="card-top"><span className="card-label">Cierre de Pasantías</span></div>

                                    <div className="stats-row mb-4" style={{ justifyContent: 'center', gap: '20px' }}>
                                        <div className="stat-item">
                                            {/* CORREGIDO: Mostrando decimales exactos */}
                                            <span className="stat-num">{Number(selectedPasante.progresoHoras).toFixed(2)}</span>
                                            <span className="stat-desc">Horas Realizadas</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-num">{selectedPasante.horasRequeridas}</span>
                                            <span className="stat-desc">Meta</span>
                                        </div>
                                    </div>

                                    <div className="informe-status-area">
                                        {selectedPasante.informeFinalSubido ? (
                                            <>
                                                <div className="pdf-preview-container" onClick={handleVerInforme}>
                                                    <div className="pdf-icon-overlay">
                                                        <Eye size={32} className="text-white" />
                                                        <span>Ver Documento</span>
                                                    </div>
                                                    <div className="pdf-mockup">
                                                        <FileText size={64} className="text-gray-300" />
                                                    </div>
                                                </div>
                                                <h3 className="mt-4">Informe Cargado</h3>
                                                <p className="text-sm text-gray mb-4">Listo para revisión y cierre.</p>
                                                <div className="flex gap-2 w-full">
                                                    <button className="btn-clean btn-outline flex-1" onClick={handleVerInforme}><Eye size={16} /> Ver</button>
                                                    <button className="btn-clean btn-primary flex-1" onClick={handleDescargarInforme}><Download size={16} /> Bajar</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="status-icon-large"><UploadCloud size={40} className="text-gray-300" /></div>
                                                <h3>Informe Pendiente</h3>
                                                <p>El estudiante debe cargar su informe final para proceder con el cierre.</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="divider"></div>

                                    {/* MÓDULO DE FINALIZACIÓN ANTICIPADA */}
                                    <div className="early-termination-module" style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Ban size={14} /> Zona de Finalización
                                        </h4>

                                        {selectedPasante.estado === 'Retirado' ? (
                                            <button
                                                className="btn-clean"
                                                style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}
                                                onClick={handlePrintTermination}
                                            >
                                                <FileText size={16} /> Generar Acta de Retiro
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-clean"
                                                style={{ width: '100%', background: '#fee2e2', border: '1px solid #fda4af', color: '#b91c1c' }}
                                                onClick={handleEarlyTermination}
                                            >
                                                <LogOut size={16} /> Finalizar sin Conclusión
                                            </button>
                                        )}
                                    </div>

                                    <div className="info-notes">
                                        <h4>Notas del sistema:</h4>
                                        <ul>
                                            <li>Horas laborales: 12pm-13pm y 13:30pm-16:30pm (No cuenta almuerzo).</li>
                                            <li>Checklist 100% → <strong>Habilitado</strong>.</li>
                                            <li>Horas 100% → <strong>Aprobado</strong>.</li>
                                            <li>Exceder límites → <strong>Finalizado automáticamente</strong>.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="clean-empty-state">
                        <div className="empty-circle"><Users size={48} /></div>
                        <h3>Selecciona un perfil</h3>
                        <p>Navega por la lista de la izquierda para ver los detalles del estudiante.</p>
                    </div>
                )}
            </main>

            {/* MODAL DE PDF */}
            {showPdfModal && selectedPasante?.informeUrl && (
                <div className="modal-overlay-pdf">
                    <div className="modal-pdf-content">
                        <div className="modal-pdf-header">
                            <h3>Informe Final - {selectedPasante.nombre}</h3>
                            <button onClick={() => setShowPdfModal(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-pdf-body">
                            <iframe
                                src={selectedPasante.informeUrl}
                                title="Visor PDF"
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RRHHModern;