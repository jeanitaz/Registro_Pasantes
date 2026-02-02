import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Save, Loader2, ArrowLeft, User, Eye, X } from 'lucide-react';
import '../styles/Documentacion.css';

const DOCS_REQUERIDOS = [
    { key: 'docHojaVida', label: 'Hoja de Vida', dbId: 'd1' },
    { key: 'docCartaSolicitud', label: 'Carta de Solicitud', dbId: 'd2' },
    { key: 'docAcuerdoConfidencialidad', label: 'Acuerdo de Confidencialidad', dbId: 'd3' },
    { key: 'docCopiaCedula', label: 'Copia de Cédula', dbId: 'd4' },
    { key: 'docCartaConvenio', label: 'Carta de Convenio', dbId: 'd5' }
];

const Documentacion = () => {
    // CORRECCIÓN 1: Intentamos capturar el ID con ambos nombres comunes
    const params = useParams();
    const idPasante = params.idPasante || params.id;

    const navigate = useNavigate();

    const [files, setFiles] = useState<{ [key: string]: File | null }>({});
    const [savedDocs, setSavedDocs] = useState<{ [key: string]: string }>({});
    const [nombrePasante, setNombrePasante] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [pdfPreview, setPdfPreview] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        if (!idPasante) {
            console.error("ID de pasante no encontrado en la URL");
            return;
        }

        const cargarDatosPasante = async () => {
            try {
                const response = await fetch(`http://localhost:3001/pasantes/${idPasante}`);
                if (response.ok) {
                    const data = await response.json();
                    setNombrePasante(`${data.nombres} ${data.apellidos}`);

                    setSavedDocs({
                        docHojaVida: data.docHojaVida,
                        docCartaSolicitud: data.docCartaSolicitud,
                        docAcuerdoConfidencialidad: data.docAcuerdoConfidencialidad,
                        docCopiaCedula: data.docCopiaCedula,
                        docCartaConvenio: data.docCartaConvenio
                    });

                    if (data.estado === 'Activo') setUploadStatus('success');
                } else {
                    alert("No se pudo cargar la información del pasante.");
                }
            } catch (error) {
                console.error("Error cargando pasante:", error);
            }
        };
        cargarDatosPasante();
    }, [idPasante]);

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert(`El documento ${key} debe ser un PDF.`);
                return;
            }
            // Límite de 10MB por archivo individual para no saturar
            if (file.size > 10 * 1024 * 1024) {
                alert(`⚠️ El archivo es muy pesado (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 10MB.`);
                return;
            }
            setFiles(prev => ({ ...prev, [key]: file }));
        }
    };

    const handleRemoveFile = (key: string) => {
        setFiles(prev => {
            const newFiles = { ...prev };
            delete newFiles[key];
            return newFiles;
        });
        if (inputRefs.current[key]) inputRefs.current[key]!.value = '';
    };

    const handleViewFile = (key: string) => {
        if (files[key]) {
            const objectUrl = URL.createObjectURL(files[key]!);
            setPdfPreview(objectUrl);
            setShowModal(true);
        } else if (savedDocs[key]) {
            setPdfPreview(savedDocs[key]);
            setShowModal(true);
        } else {
            alert("No hay archivo para visualizar.");
        }
    };

    const handleSubmit = async () => {
        if (!idPasante) {
            alert("Error: No hay ID de pasante.");
            return;
        }

        // Validar documentos faltantes
        const faltantes = DOCS_REQUERIDOS.filter(doc => !files[doc.key] && !savedDocs[doc.key]);
        if (faltantes.length > 0) {
            alert(`⚠️ Faltan documentos: ${faltantes.map(d => d.label).join(', ')}`);
            return;
        }

        setIsUploading(true);

        try {
            // Convertir solo nuevos
            const promesas = Object.keys(files).map(async (key) => {
                const file = files[key];
                if (file) {
                    try {
                        const base64 = await convertToBase64(file);
                        return { key, base64 };
                    } catch (e) {
                        return null;
                    }
                }
                return null;
            });

            const resultados = await Promise.all(promesas);

            // Construir payload
            const payload: any = {
                estado: "Activo",
                documentacionCompleta: true
            };

            resultados.forEach(item => {
                if (item && item.base64) {
                    payload[item.key] = item.base64;
                }
            });

            console.log("Enviando...", payload);

            const response = await fetch(`http://localhost:3001/pasantes/${idPasante}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setUploadStatus('success');
                alert(`✅ ¡Éxito! ${nombrePasante} ha sido activado.`);

                // Actualizar estado local
                resultados.forEach(item => {
                    if (item) {
                        setSavedDocs(prev => ({ ...prev, [item.key]: item.base64 }));
                        setFiles(prev => {
                            const n = { ...prev };
                            delete n[item.key];
                            return n;
                        });
                    }
                });
            } else {
                // Manejo de errores detallado
                const errorText = await response.text(); // Leemos como texto por si es error HTML (413)
                console.error("Error servidor:", errorText);

                if (response.status === 413) {
                    alert("❌ Error: Los archivos son demasiado grandes para el servidor. Intenta subir de uno en uno o comprimirlos.");
                } else {
                    try {
                        const errorJson = JSON.parse(errorText);
                        alert(`❌ Error del servidor: ${errorJson.error || 'Desconocido'}`);
                    } catch {
                        alert(`❌ Error del servidor (${response.status}). Revisa la consola.`);
                    }
                }
            }

        } catch (error: any) {
            console.error("Error red:", error);
            alert(`❌ Error de conexión: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const isCompleted = uploadStatus === 'success';

    return (
        <div className="docs-container">
            <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
                <ArrowLeft size={18} /> Volver
            </button>

            <header className="docs-header">
                <div>
                    <h1>Gestión Documental</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', color: '#2563eb', fontWeight: '500' }}>
                        <User size={18} />
                        <span>Pasante: {nombrePasante || "Cargando..."}</span>
                    </div>
                </div>
                <div className="status-indicator">
                    {isCompleted ? (
                        <span className="badge-success"><CheckCircle size={16} /> Activo</span>
                    ) : (
                        <span className="badge-pending"><AlertCircle size={16} /> Pendiente</span>
                    )}
                </div>
            </header>

            <div className="docs-grid">
                {DOCS_REQUERIDOS.map((doc) => {
                    const fileLocal = files[doc.key];
                    const fileGuardado = savedDocs[doc.key];
                    const tieneArchivo = fileLocal || fileGuardado;

                    return (
                        <div key={doc.key} className={`doc-card ${tieneArchivo ? 'uploaded' : ''}`}>
                            <div className="icon-area">
                                {tieneArchivo ? <FileText size={32} className="text-blue" /> : <Upload size={32} className="text-gray" />}
                            </div>
                            <div className="info-area">
                                <h3>{doc.label}</h3>
                                {fileLocal ? (
                                    <p className="filename" style={{ color: '#d97706' }}>Nuevo: {fileLocal.name}</p>
                                ) : fileGuardado ? (
                                    <p className="filename">✅ Guardado en sistema</p>
                                ) : (
                                    <p className="placeholder">Vacío</p>
                                )}
                            </div>
                            <div className="action-area" style={{ display: 'flex', gap: '5px' }}>
                                {tieneArchivo && (
                                    <button
                                        className="btn-icon view"
                                        onClick={() => handleViewFile(doc.key)}
                                        style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Ver PDF"
                                    >
                                        <Eye size={18} />
                                    </button>
                                )}

                                {!isCompleted && (
                                    <>
                                        <input
                                            type="file"
                                            id={`file-${doc.key}`}
                                            accept=".pdf"
                                            className="hidden-input"
                                            ref={el => { inputRefs.current[doc.key] = el }}
                                            onChange={(e) => handleFileChange(doc.key, e)}
                                        />

                                        {fileLocal ? (
                                            <button className="btn-icon delete" onClick={() => handleRemoveFile(doc.key)}>
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <label htmlFor={`file-${doc.key}`} className="btn-upload-label">
                                                {fileGuardado ? "Cambiar" : "Subir"}
                                            </label>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="docs-footer">
                <div className="info-text">
                    {isCompleted ? "Este usuario ya tiene la documentación completa." : "* Esta acción habilitará la cuenta del pasante inmediatamente."}
                </div>

                <button
                    className={`btn-submit-docs ${isCompleted ? 'completed-btn' : ''}`}
                    onClick={handleSubmit}
                    disabled={isUploading || isCompleted}
                    style={{
                        backgroundColor: isCompleted ? '#22c55e' : '#2563eb',
                        cursor: isCompleted ? 'not-allowed' : 'pointer',
                        opacity: isCompleted ? 0.9 : 1
                    }}
                >
                    {isUploading ? (
                        <><Loader2 size={20} className="spin" /> Subiendo...</>
                    ) : isCompleted ? (
                        <><CheckCircle size={20} /> Pasante Activo</>
                    ) : (
                        <><Save size={20} /> Guardar y Activar Pasante</>
                    )}
                </button>
            </div>

            {showModal && pdfPreview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        width: '90%', height: '90%', backgroundColor: 'white',
                        borderRadius: '8px', overflow: 'hidden', position: 'relative',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '10px 20px', borderBottom: '1px solid #eee',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0 }}>Vista Previa</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <iframe
                            src={pdfPreview}
                            width="100%"
                            height="100%"
                            title="PDF Preview"
                            style={{ border: 'none', flex: 1 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documentacion;