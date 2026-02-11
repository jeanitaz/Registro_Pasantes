import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';

import {
    Search, Building,
    MapPin, Edit2,
    Trash2, Save, X, Key, User,
    FileSpreadsheet, ArrowLeft, Plus, Clock, Phone
} from 'lucide-react';
import '../styles/HistorialPasantes.css';

interface Pasante {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    carrera: string;
    institucion: string;
    dependencia: string;
    horasRequeridas: number;
    horasCompletadas?: number;
    estado: string;
    usuario: string;
    password?: string;
    fechaRegistro?: string;
    fotoUrl?: string;
    horaEntrada?: string;
    horaSalida?: string;
    telefono_emergencia?: string;
}

const HistorialPasantes = () => {
    const navigate = useNavigate();
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPasante, setEditingPasante] = useState<Pasante | null>(null);

    const [selectedCarrera, setSelectedCarrera] = useState('');
    const [selectedInstitucion, setSelectedInstitucion] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');

    // Fetch inicial
    const fetchPasantes = async () => {
        try {
            const response = await fetch('/api/pasantes');
            if (response.ok) {
                const data = await response.json();
                setPasantes(data);
            }
        } catch (error) {
            console.error("Error cargando pasantes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPasantes();
    }, []);

    const filteredPasantes = pasantes.filter(p => {
        const matchesSearch = p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.cedula.includes(searchTerm) ||
            p.usuario?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCarrera = selectedCarrera ? p.carrera === selectedCarrera : true;
        const matchesInstitucion = selectedInstitucion ? p.institucion === selectedInstitucion : true;
        const matchesEstado = selectedEstado ? p.estado === selectedEstado : true;

        return matchesSearch && matchesCarrera && matchesInstitucion && matchesEstado;
    });

    // Obtener listas únicas para los select
    const carreras = Array.from(new Set(pasantes.map(p => p.carrera).filter(Boolean)));
    const instituciones = Array.from(new Set(pasantes.map(p => p.institucion).filter(Boolean)));
    const estados = Array.from(new Set(pasantes.map(p => p.estado).filter(Boolean)));

    const handleExportExcel = () => {
        if (filteredPasantes.length === 0) return;
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filteredPasantes.map(p => ({
            Cédula: p.cedula,
            Nombres: p.nombres,
            Apellidos: p.apellidos,
            Carrera: p.carrera,
            Estado: p.estado,
            Horas: `${p.horasCompletadas}/${p.horasRequeridas}`,
            'Horario': `${p.horaEntrada || '--'} - ${p.horaSalida || '--'}`
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Pasantes");
        XLSX.writeFile(wb, "Reporte_Pasantes.xlsx");
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar este registro?")) {
            try {
                await fetch(`/api/pasantes/${id}`, { method: 'DELETE' });
                setPasantes(pasantes.filter(p => p.id !== id));
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    const handleOpenEdit = (pasante: Pasante) => {
        setEditingPasante({
            ...pasante,
            horasCompletadas: pasante.horasCompletadas || 0,
            horaEntrada: pasante.horaEntrada || '',
            horaSalida: pasante.horaSalida || ''
        });
        setIsModalOpen(true);
    };

    // --- GUARDADO ---
    const handleSaveEdit = async () => {
        if (!editingPasante) return;

        // Preparamos los datos a enviar EXPLICITAMENTE
        const datosParaEnviar: any = {
            nombres: editingPasante.nombres,
            apellidos: editingPasante.apellidos,
            cedula: editingPasante.cedula,
            institucion: editingPasante.institucion,
            carrera: editingPasante.carrera,
            dependencia: editingPasante.dependencia,
            usuario: editingPasante.usuario,
            telefono_emergencia: editingPasante.telefono_emergencia,
            horasCompletadas: Number(editingPasante.horasCompletadas),
            estado: editingPasante.estado,
            horaEntrada: editingPasante.horaEntrada || null,
            horaSalida: editingPasante.horaSalida || null
        };

        if (editingPasante.password && editingPasante.password.trim().length > 0) {
            datosParaEnviar.password = editingPasante.password;
        }

        try {
            const response = await fetch(`/api/pasantes/${editingPasante.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (response.ok) {
                // Actualizar estado local
                setPasantes(prevPasantes => prevPasantes.map(p => {
                    if (p.id === editingPasante.id) {
                        return {
                            ...p,
                            ...datosParaEnviar
                        };
                    }
                    return p;
                }));

                setIsModalOpen(false);
                setEditingPasante(null);
                alert("Pasante actualizado correctamente.");
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al actualizar en el servidor");
            }
        } catch (error) {
            console.error(error);
            alert("Error al conectar con el servidor.");
        }
    };

    return (
        <div className="history-page-wrapper">
            <header className="page-header-modern">
                <div className="header-info">
                    <button className="back-btn-modern" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
                    <div>
                        <h1>Administración de Pasantes</h1>
                        <p>{filteredPasantes.length} estudiantes registrados</p>
                    </div>
                </div>

                <div className="header-actions-modern">
                    <div className="search-box-modern">
                        <Search size={18} />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-modern excel" onClick={handleExportExcel}>
                        <FileSpreadsheet size={18} /> <span>Reporte</span>
                    </button>
                    <button className="btn-modern primary" onClick={() => navigate('/registro')}>
                        <Plus size={18} /> <span>Nuevo</span>
                    </button>
                </div>

                {/* BARRA DE FILTROS */}
                <div className="filters-bar-modern">
                    <select
                        className="filter-select-modern"
                        value={selectedCarrera}
                        onChange={(e) => setSelectedCarrera(e.target.value)}
                    >
                        <option value="">Todas las Carreras</option>
                        {carreras.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>

                    <select
                        className="filter-select-modern"
                        value={selectedInstitucion}
                        onChange={(e) => setSelectedInstitucion(e.target.value)}
                    >
                        <option value="">Todas las Instituciones</option>
                        {instituciones.map((i, idx) => <option key={idx} value={i}>{i}</option>)}
                    </select>

                    <select
                        className="filter-select-modern"
                        value={selectedEstado}
                        onChange={(e) => setSelectedEstado(e.target.value)}
                    >
                        <option value="">Todos los Estados</option>
                        {estados.map((e, i) => <option key={i} value={e}>{e}</option>)}
                    </select>

                    {(selectedCarrera || selectedInstitucion || selectedEstado) && (
                        <button className="btn-modern clear-filters" onClick={() => {
                            setSelectedCarrera('');
                            setSelectedInstitucion('');
                            setSelectedEstado('');
                        }}>
                            Limpiar
                        </button>
                    )}
                </div>
            </header>

            <section className="cards-grid-modern">
                {loading ? (
                    <div className="loader-full">Cargando pasantes...</div>
                ) : (
                    filteredPasantes.map((p) => {
                        const horasC = Number(p.horasCompletadas) || 0;
                        const horasR = Number(p.horasRequeridas) || 1;
                        const progress = Math.min((horasC / horasR) * 100, 100);
                        const estadoClass = (p.estado || 'pendiente').toLowerCase().replace(/\s+/g, '-');

                        return (
                            <div key={p.id} className="modern-student-card">
                                <div className="card-top-tag">
                                    <span className={`badge ${estadoClass}`}>{p.estado || 'Pendiente'}</span>
                                    <div className="card-quick-actions">
                                        <button onClick={() => handleOpenEdit(p)} className="action-icon edit"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(p.id)} className="action-icon delete"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <div className="student-hero">
                                    {/* --- FOTO DEL PASANTE --- */}
                                    <div className="avatar-large" style={{ overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        {p.fotoUrl ? (
                                            <img
                                                src={p.fotoUrl}
                                                alt="Foto"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    if (target.parentElement) {
                                                        target.parentElement.innerText = p.nombres.charAt(0);
                                                        target.parentElement.style.backgroundColor = '#2563eb';
                                                        target.parentElement.style.color = 'white';
                                                    }
                                                }}
                                            />
                                        ) : (
                                            p.nombres.charAt(0)
                                        )}
                                    </div>

                                    <h3>{p.nombres} {p.apellidos}</h3>
                                    <span className="student-career">{p.carrera}</span>
                                </div>

                                <div className="student-meta-info">
                                    <div className="meta-row"><Building size={14} /> <span>{p.institucion}</span></div>
                                    <div className="meta-row"><MapPin size={14} /> <span>{p.dependencia}</span></div>
                                    <div className="meta-row"><User size={14} /> <span className="user-text">{p.usuario}</span></div>
                                    {p.horaEntrada && (
                                        <div className="meta-row"><Clock size={14} /> <span className="schedule-text">{p.horaEntrada} - {p.horaSalida}</span></div>
                                    )}
                                    {p.telefono_emergencia && (
                                        <div className="meta-row"><Phone size={14} /> <span style={{ color: '#ef4444' }}>Emerg: {p.telefono_emergencia}</span></div>
                                    )}
                                </div>

                                <div className="student-progress-box">
                                    <div className="progress-labels">
                                        <span>Progreso</span>
                                        <span>{horasC} / {horasR}h</span>
                                    </div>
                                    <div className="progress-rail">
                                        <div className="progress-bar" style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#10b981' : '#2563eb' }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

            {/* --- MODAL DE EDICIÓN COMPLETO --- */}
            {isModalOpen && editingPasante && (
                <div className="modal-overlay">
                    {/* Agregado scroll y tamaño máximo para que quepan todos los campos */}
                    <div className="modal-glass" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>Actualizar Pasante</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            
                            {/* 1. SECCIÓN: DATOS PERSONALES */}
                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', marginTop: '0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Datos Personales</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="input-group">
                                    <label>Nombres</label>
                                    <input
                                        type="text"
                                        value={editingPasante.nombres}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, nombres: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Apellidos</label>
                                    <input
                                        type="text"
                                        value={editingPasante.apellidos}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, apellidos: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Cédula</label>
                                    <input
                                        type="text"
                                        value={editingPasante.cedula}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, cedula: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Teléfono Emergencia</label>
                                    <input
                                        type="text"
                                        value={editingPasante.telefono_emergencia || ''}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, telefono_emergencia: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* 2. SECCIÓN: DATOS ACADÉMICOS */}
                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Datos Académicos</h4>
                            <div style={{ marginBottom: '15px' }}>
                                <div className="input-group" style={{ marginBottom: '10px' }}>
                                    <label>Institución</label>
                                    <input
                                        type="text"
                                        value={editingPasante.institucion}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, institucion: e.target.value })}
                                    />
                                </div>
                                <div className="input-group" style={{ marginBottom: '10px' }}>
                                    <label>Carrera</label>
                                    <input
                                        type="text"
                                        value={editingPasante.carrera}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, carrera: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Dependencia (Área)</label>
                                    <input
                                        type="text"
                                        value={editingPasante.dependencia}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, dependencia: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* 3. SECCIÓN: CREDENCIALES */}
                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Credenciales</h4>
                            <div className="credentials-box-modal" style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="input-group">
                                    <label><User size={14} /> Usuario</label>
                                    {/* Ya no es readOnly, se puede editar */}
                                    <input
                                        type="text"
                                        value={editingPasante.usuario}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, usuario: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label><Key size={14} /> Contraseña</label>
                                    <input
                                        type="text"
                                        value={editingPasante.password || ''}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, password: e.target.value })}
                                        placeholder="Dejar vacío para no cambiar"
                                    />
                                </div>
                            </div>

                            {/* 4. SECCIÓN: CONTROL Y HORARIOS */}
                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Control de Asistencia</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="input-group">
                                    <label>Hora Entrada</label>
                                    <input
                                        type="time"
                                        value={editingPasante.horaEntrada || ''}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, horaEntrada: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Hora Salida</label>
                                    <input
                                        type="time"
                                        value={editingPasante.horaSalida || ''}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, horaSalida: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="input-group">
                                    <label>Horas Completadas</label>
                                    <input
                                        type="number"
                                        value={editingPasante.horasCompletadas}
                                        onChange={(e) => setEditingPasante({ ...editingPasante, horasCompletadas: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Estado</label>
                                    <select value={editingPasante.estado} onChange={(e) => setEditingPasante({ ...editingPasante, estado: e.target.value })}>
                                        <option value="No habilitado">No habilitado</option>
                                        <option value="Activo">Activo</option>
                                        <option value="Retiro anticipado">Retiro anticipado</option>
                                        <option value="Finalizado por faltas excedidas">Finalizado por faltas excedidas</option>
                                        <option value="Finalizado por atrasos excedidos">Finalizado por atrasos excedidos</option>
                                        <option value="Finalizado por llamado de atención">Finalizado por llamado de atención</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </div>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button className="btn-save" onClick={handleSaveEdit}><Save size={16} /> Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialPasantes;