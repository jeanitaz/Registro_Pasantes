import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';

import {
    Search, Building,
    MapPin, Edit2,
    Trash2, Save, X, Key, User,
    FileSpreadsheet, ArrowLeft, Plus, Clock, Phone, Camera
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
    horasCompletadas?: number | string;
    estado: string;
    usuario: string;
    password?: string;
    fechaRegistro?: string;
    fotoUrl?: string;
    horaEntrada?: string;
    horaSalida?: string;
    telefono_emergencia?: string;
    fecha_nacimiento?: string;
    delegado?: string;
    discapacidad?: string;
    email?: string;
    telefono?: string;
}

const formatDecimalToTime = (decimalHours: number | string | undefined): string => {
    if (decimalHours === undefined || decimalHours === null || decimalHours === '') return '0h 00m';
    const num = Number(decimalHours);
    if (isNaN(num)) return '0h 00m';
    const hrs = Math.floor(num);
    const mins = Math.round((num - hrs) * 60);
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
};

const decimalToTimeInput = (decimalHours: number | string | undefined): string => {
    if (decimalHours === undefined || decimalHours === null || decimalHours === '') return '0:00';
    const num = Number(decimalHours);
    if (isNaN(num)) return '0:00';
    const hrs = Math.floor(num);
    const mins = Math.round((num - hrs) * 60);
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

const parseTimeToDecimal = (timeStr: string): number => {
    if (!timeStr) return 0;
    const clean = timeStr.trim();
    if (!clean) return 0;
    
    if (clean.includes(':')) {
        const [hStr, mStr] = clean.split(':');
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        return h + (m / 60);
    }
    
    if (clean.includes('.') || clean.includes(',')) {
        const parts = clean.split(/[.,]/);
        if (parts.length === 2) {
            const h = parseInt(parts[0], 10) || 0;
            const mStr = parts[1];
            const m = parseInt(mStr.padEnd(2, '0').substring(0, 2), 10) || 0;
            return h + (m / 60);
        }
    }
    
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

const HistorialPasantes = () => {
    const navigate = useNavigate();
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPasante, setEditingPasante] = useState<Pasante | null>(null);

    // --- NUEVO ESTADO: Para controlar la foto ampliada ---
    const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

    const [selectedCarrera, setSelectedCarrera] = useState('');
    const [selectedInstitucion, setSelectedInstitucion] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const carreras = Array.from(new Set(pasantes.map(p => p.carrera).filter(Boolean)));
    const instituciones = Array.from(new Set(pasantes.map(p => p.institucion).filter(Boolean)));
    const estados = Array.from(new Set(pasantes.map(p => p.estado).filter(Boolean)));

    const handleExportExcel = () => {
        if (filteredPasantes.length === 0) return;
        const wb = XLSX.utils.book_new();
        
        const data = filteredPasantes.map(p => ({
            Cédula: p.cedula,
            Nombres: p.nombres,
            Apellidos: p.apellidos,
            Carrera: p.carrera,
            Estado: p.estado,
            Horas: `${p.horasCompletadas}/${p.horasRequeridas}`,
            'Horario': `${p.horaEntrada || '--'} - ${p.horaSalida || '--'}`
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Estilos para celdas
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" }, name: "Segoe UI", sz: 11 },
            fill: { fgColor: { rgb: "1E3A8A" } }, // Azul Marino Oscuro
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: {
                top: { style: "thin", color: { rgb: "94A3B8" } },
                bottom: { style: "medium", color: { rgb: "1E3A8A" } },
                left: { style: "thin", color: { rgb: "94A3B8" } },
                right: { style: "thin", color: { rgb: "94A3B8" } }
            }
        };

        const borderStyle = {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
        };

        const cellStyleNormal = {
            font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
            alignment: { vertical: "center", horizontal: "left" },
            border: borderStyle
        };

        const cellStyleCenter = {
            font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: borderStyle
        };

        const cellStyleZebraNormal = {
            font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
            fill: { fgColor: { rgb: "F8FAFC" } }, // Grisáceo suave
            alignment: { vertical: "center", horizontal: "left" },
            border: borderStyle
        };

        const cellStyleZebraCenter = {
            font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
            fill: { fgColor: { rgb: "F8FAFC" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: borderStyle
        };

        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:G1');
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cell_address];
                if (!cell) continue;

                if (R === 0) {
                    cell.s = headerStyle;
                } else {
                    const isEven = R % 2 === 0;
                    const isCenterCol = [0, 4, 5, 6].includes(C); // Cédula, Estado, Horas, Horario van centrados

                    if (C === 4) { // Columna Estado
                        const estado = String(cell.v).toLowerCase();
                        if (estado === "activo") {
                            cell.s = {
                                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "166534" } },
                                fill: { fgColor: { rgb: "DCFCE7" } }, // Verde suave
                                alignment: { vertical: "center", horizontal: "center" },
                                border: borderStyle
                            };
                        } else if (estado.includes("finalizado") && !estado.includes("excedid") && !estado.includes("falta")) {
                            cell.s = {
                                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "1E40AF" } },
                                fill: { fgColor: { rgb: "DBEAFE" } }, // Azul suave
                                alignment: { vertical: "center", horizontal: "center" },
                                border: borderStyle
                            };
                        } else if (estado.includes("excedid") || estado.includes("falta") || estado === "retiro anticipado" || estado === "retirado") {
                            cell.s = {
                                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "991B1B" } },
                                fill: { fgColor: { rgb: "FEE2E2" } }, // Rojo suave
                                alignment: { vertical: "center", horizontal: "center" },
                                border: borderStyle
                            };
                        } else {
                            cell.s = isEven ? cellStyleZebraCenter : cellStyleCenter;
                        }
                    } else {
                        if (isCenterCol) {
                            cell.s = isEven ? cellStyleZebraCenter : cellStyleCenter;
                        } else {
                            cell.s = isEven ? cellStyleZebraNormal : cellStyleNormal;
                        }
                    }
                }
            }
        }

        // Altura de filas
        ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 28 }; // Fila cabecera
        for (let R = 1; R <= range.e.r; ++R) {
            ws['!rows'][R] = { hpt: 22 }; // Filas de datos
        }

        // Ancho de columnas adaptativo
        ws['!cols'] = [
            { wch: 16 }, // Cédula
            { wch: 22 }, // Nombres
            { wch: 22 }, // Apellidos
            { wch: 32 }, // Carrera
            { wch: 22 }, // Estado
            { wch: 14 }, // Horas
            { wch: 20 }  // Horario
        ];

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
            horasCompletadas: decimalToTimeInput(Number(pasante.horasCompletadas || 0)),
            horaEntrada: pasante.horaEntrada || '',
            horaSalida: pasante.horaSalida || '',
            fecha_nacimiento: pasante.fecha_nacimiento ? pasante.fecha_nacimiento.split('T')[0] : '',
            delegado: pasante.delegado || '',
            discapacidad: pasante.discapacidad || 'No',
            email: pasante.email || '',
            telefono: pasante.telefono || ''
        });
        setIsModalOpen(true);
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingPasante) {
            try {
                const base64 = await convertToBase64(file);
                setEditingPasante({ ...editingPasante, fotoUrl: base64 });
            } catch (error) {
                console.error("Error al procesar la imagen", error);
                alert("No se pudo procesar la imagen seleccionada.");
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editingPasante) return;

        const decimalHoras = parseTimeToDecimal(String(editingPasante.horasCompletadas));

        const datosParaEnviar: any = {
            nombres: editingPasante.nombres,
            apellidos: editingPasante.apellidos,
            cedula: editingPasante.cedula,
            institucion: editingPasante.institucion,
            carrera: editingPasante.carrera,
            dependencia: editingPasante.dependencia,
            usuario: editingPasante.usuario,
            telefono_emergencia: editingPasante.telefono_emergencia,
            horasCompletadas: decimalHoras,
            estado: editingPasante.estado,
            horaEntrada: editingPasante.horaEntrada || null,
            horaSalida: editingPasante.horaSalida || null,
            fotoUrl: editingPasante.fotoUrl,
            fecha_nacimiento: editingPasante.fecha_nacimiento || null,
            delegado: editingPasante.delegado || null,
            discapacidad: editingPasante.discapacidad || 'No',
            email: editingPasante.email || null,
            telefono: editingPasante.telefono || null,
            horasRequeridas: Number(editingPasante.horasRequeridas || 0)
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
                setPasantes(prevPasantes => prevPasantes.map(p => {
                    if (p.id === editingPasante.id) {
                        return { ...p, ...datosParaEnviar };
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
                        <h1>Historial de Practicantes Pre-Profesionales</h1>
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

                <div className="filters-bar-modern">
                    <select className="filter-select-modern" value={selectedCarrera} onChange={(e) => setSelectedCarrera(e.target.value)}>
                        <option value="">Todas las Carreras</option>
                        {carreras.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>

                    <select className="filter-select-modern" value={selectedInstitucion} onChange={(e) => setSelectedInstitucion(e.target.value)}>
                        <option value="">Todas las Instituciones</option>
                        {instituciones.map((i, idx) => <option key={idx} value={i}>{i}</option>)}
                    </select>

                    <select className="filter-select-modern" value={selectedEstado} onChange={(e) => setSelectedEstado(e.target.value)}>
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
                                    <div className="avatar-large" style={{ overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        {p.fotoUrl ? (
                                            <img
                                                src={p.fotoUrl}
                                                alt="Foto"
                                                // --- CAMBIO: Evento onClick para ver foto ---
                                                onClick={() => setViewPhotoUrl(p.fotoUrl || null)}
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'cover', 
                                                    cursor: 'pointer' // Cursor de mano
                                                }}
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
                                        <span>{formatDecimalToTime(horasC)} / {horasR}h</span>
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

            {/* --- MODAL DE EDICIÓN --- */}
            {isModalOpen && editingPasante && (
                <div className="modal-overlay">
                    <div className="modal-glass" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>Actualizar Pasante</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {/* SECCIÓN DE FOTO DE PERFIL */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                    <div className="avatar-student-modal" style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                        {editingPasante.fotoUrl ? (
                                            <img
                                                src={editingPasante.fotoUrl}
                                                alt="Foto"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.innerText = editingPasante.nombres.charAt(0); }}
                                            />
                                        ) : (
                                            <span>{editingPasante.nombres.charAt(0)}</span>
                                        )}
                                    </div>
                                    <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                        <Camera size={16} />
                                    </label>
                                    <input type="file" id="photo-upload" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handlePhotoChange} />
                                </div>
                            </div>
                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', marginTop: '0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Datos Personales</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="input-group"><label>Nombres</label><input type="text" value={editingPasante.nombres} onChange={(e) => setEditingPasante({ ...editingPasante, nombres: e.target.value })} /></div>
                                <div className="input-group"><label>Apellidos</label><input type="text" value={editingPasante.apellidos} onChange={(e) => setEditingPasante({ ...editingPasante, apellidos: e.target.value })} /></div>
                                <div className="input-group"><label>Cédula</label><input type="text" value={editingPasante.cedula} onChange={(e) => setEditingPasante({ ...editingPasante, cedula: e.target.value })} /></div>
                                <div className="input-group"><label>Fecha Nacimiento</label><input type="date" value={editingPasante.fecha_nacimiento || ''} onChange={(e) => setEditingPasante({ ...editingPasante, fecha_nacimiento: e.target.value })} /></div>
                                <div className="input-group"><label>Correo Electrónico</label><input type="email" value={editingPasante.email || ''} onChange={(e) => setEditingPasante({ ...editingPasante, email: e.target.value })} /></div>
                                <div className="input-group"><label>Teléfono Personal</label><input type="text" value={editingPasante.telefono || ''} onChange={(e) => setEditingPasante({ ...editingPasante, telefono: e.target.value })} /></div>
                                <div className="input-group"><label>Teléfono Emergencia</label><input type="text" value={editingPasante.telefono_emergencia || ''} onChange={(e) => setEditingPasante({ ...editingPasante, telefono_emergencia: e.target.value })} /></div>
                                <div className="input-group">
                                    <label>Discapacidad</label>
                                    <select value={editingPasante.discapacidad || 'No'} onChange={(e) => setEditingPasante({ ...editingPasante, discapacidad: e.target.value })}>
                                        <option value="No">No</option>
                                        <option value="Si">Si</option>
                                    </select>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Datos Académicos</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="input-group" style={{ gridColumn: 'span 2' }}><label>Institución</label><input type="text" value={editingPasante.institucion} onChange={(e) => setEditingPasante({ ...editingPasante, institucion: e.target.value })} /></div>
                                <div className="input-group" style={{ gridColumn: 'span 2' }}><label>Carrera</label><input type="text" value={editingPasante.carrera} onChange={(e) => setEditingPasante({ ...editingPasante, carrera: e.target.value })} /></div>
                                <div className="input-group"><label>Dependencia</label><input type="text" value={editingPasante.dependencia} onChange={(e) => setEditingPasante({ ...editingPasante, dependencia: e.target.value })} /></div>
                                <div className="input-group"><label>Tutor / Delegado</label><input type="text" value={editingPasante.delegado || ''} onChange={(e) => setEditingPasante({ ...editingPasante, delegado: e.target.value })} /></div>
                            </div>

                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Credenciales</h4>
                            <div className="credentials-box-modal" style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="input-group"><label><User size={14} /> Usuario</label><input type="text" value={editingPasante.usuario} onChange={(e) => setEditingPasante({ ...editingPasante, usuario: e.target.value })} /></div>
                                <div className="input-group"><label><Key size={14} /> Contraseña</label><input type="text" value={editingPasante.password || ''} onChange={(e) => setEditingPasante({ ...editingPasante, password: e.target.value })} placeholder="Dejar vacío para no cambiar" /></div>
                            </div>

                            <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Control de Asistencia</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="input-group"><label>Hora Entrada</label><input type="time" value={editingPasante.horaEntrada || ''} onChange={(e) => setEditingPasante({ ...editingPasante, horaEntrada: e.target.value })} /></div>
                                <div className="input-group"><label>Hora Salida</label><input type="time" value={editingPasante.horaSalida || ''} onChange={(e) => setEditingPasante({ ...editingPasante, horaSalida: e.target.value })} /></div>
                                <div className="input-group"><label>Horas Completadas</label><input type="text" placeholder="Ej: 120:30 o 120.30" value={editingPasante.horasCompletadas ?? ''} onChange={(e) => setEditingPasante({ ...editingPasante, horasCompletadas: e.target.value })} /></div>
                                <div className="input-group"><label>Meta Horas Requeridas</label><input type="number" value={editingPasante.horasRequeridas || 0} onChange={(e) => setEditingPasante({ ...editingPasante, horasRequeridas: Number(e.target.value) })} /></div>
                                <div className="input-group" style={{ gridColumn: 'span 2' }}>
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

            {/* --- NUEVO: MODAL VISUALIZADOR DE FOTO GRANDE --- */}
            {viewPhotoUrl && (
                <div 
                    className="modal-overlay" 
                    onClick={() => setViewPhotoUrl(null)} // Cierra al hacer clic afuera
                    style={{ 
                        zIndex: 2000, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)' // Fondo más oscuro
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewPhotoUrl(null)}
                            style={{ 
                                position: 'absolute', 
                                top: -40, 
                                right: 0, 
                                background: 'none', 
                                border: 'none', 
                                color: 'white', 
                                cursor: 'pointer' 
                            }}
                        >
                            <X size={32} />
                        </button>
                        <img 
                            src={viewPhotoUrl} 
                            alt="Foto ampliada" 
                            style={{ 
                                width: '100%', 
                                height: 'auto', 
                                maxHeight: '90vh', 
                                borderRadius: '8px', 
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                objectFit: 'contain'
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialPasantes;