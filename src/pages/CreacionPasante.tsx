import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CreacionPasantes.css';

const CreacionPasante = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombres: '',       
        apellidos: '',     
        cedula: '',
        fechaNacimiento: '',
        institucion: '',
        carrera: '',
        dependencia: '',
        horasRequeridas: '',
        discapacidad: 'No',
        email: '',
        telefono: '',
        usuario: '', 
        password: '',
        foto: null as File | null,
        fotoBase64: ''            
    });

    const [errors, setErrors] = useState({
        cedula: '',
        email: '',
        telefono: '',
        password: ''
    });

    const [isConverting, setIsConverting] = useState(false);

    const dependencias = [
        "Dirección Ejecutiva",
        "Gestión Meteorológica",
        "Gestión Hidrológica",
        "Tecnologías de la Información",
        "Administrativo Financiero"
    ];

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    useEffect(() => {
        const generarUsuario = () => {
            const nombreLimpio = formData.nombres.trim().toLowerCase();
            const apellidoLimpio = formData.apellidos.trim().toLowerCase();

            if (nombreLimpio.length > 0 && apellidoLimpio.length > 0) {
                const primerNombre = nombreLimpio.split(' ')[0];
                const letraInicial = primerNombre.charAt(0);
                const primerApellido = apellidoLimpio.split(' ')[0];
                setFormData(prev => ({ ...prev, usuario: `${letraInicial}${primerApellido}` }));
            } else {
                setFormData(prev => ({ ...prev, usuario: '' }));
            }
        };
        const timer = setTimeout(generarUsuario, 500);
        return () => clearTimeout(timer);
    }, [formData.nombres, formData.apellidos]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'cedula' || name === 'telefono') {
            const soloNumeros = value.replace(/\D/g, '');
            if (soloNumeros.length <= 10) {
                setFormData(prev => ({ ...prev, [name]: soloNumeros }));
                if (soloNumeros.length === 10) {
                    setErrors(prev => ({ ...prev, [name]: '' }));
                }
            }
            return; 
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'email' || name === 'password') {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const LIMITE_PESO = 200 * 1024; // 200 KB

            if (file.size > LIMITE_PESO) {
                alert(`⚠️ La imagen es muy pesada (${(file.size / 1024).toFixed(0)} KB). Máximo 200 KB.`);
                e.target.value = ''; 
                setFormData(prev => ({ ...prev, foto: null, fotoBase64: '' }));
                return;
            }

            setIsConverting(true); 

            try {
                setFormData(prev => ({ ...prev, foto: file }));
                const base64 = await convertToBase64(file);
                setFormData(prev => ({ ...prev, fotoBase64: base64 }));
            } catch (error) {
                console.error("Error al procesar imagen", error);
                alert("Hubo un error al leer la imagen.");
                setFormData(prev => ({ ...prev, foto: null, fotoBase64: '' }));
            } finally {
                setIsConverting(false); 
            }
        }
    };

    const validarFormulario = () => {
        let esValido = true;
        const nuevosErrores = { cedula: '', email: '', telefono: '', password: '' };

        if (formData.cedula.length !== 10) {
            nuevosErrores.cedula = 'La cédula debe tener 10 dígitos.';
            esValido = false;
        }

        if (formData.telefono.length !== 10) {
            nuevosErrores.telefono = 'El celular debe tener 10 dígitos.';
            esValido = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            nuevosErrores.email = 'Formato de correo inválido.';
            esValido = false;
        }

        if (formData.password.length < 6) {
            nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres.';
            esValido = false;
        }

        setErrors(nuevosErrores);
        return esValido;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!validarFormulario()) {
            alert("⚠️ Por favor corrige los errores antes de continuar.");
            return;
        }

        if (isConverting) {
            alert("⏳ Procesando imagen, espera un segundo...");
            return;
        }

        if (formData.foto && !formData.fotoBase64) {
            alert("⚠️ La imagen aún se está cargando.");
            return;
        }

        const rrhhUser = JSON.parse(localStorage.getItem('user') || '{}');
        const nombreCreador = rrhhUser.usuario || 'RRHH Desconocido';

        const nuevoPasante = {
            ...formData,
            horasRequeridas: Number(formData.horasRequeridas),
            fotoUrl: formData.fotoBase64 || "",
            estado: "No habilitado",
            fechaRegistro: new Date().toISOString(),
            creadoPor: nombreCreador
        };

        delete (nuevoPasante as any).foto;
        delete (nuevoPasante as any).fotoBase64;

        try {
            const response = await fetch('http://localhost:3001/pasantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPasante),
            });

            if (response.ok) {
                alert(`¡Éxito! Pasante registrado correctamente.`);
                navigate('/historialP'); // Navega al historial de pasantes
            } else {
                alert("Error al guardar en la base de datos.");
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            alert("No se pudo conectar con el servidor.");
        }
    };

    return (
        <div className="creacion-pasante-scope">
            
            <main className="cp-main-view">
                <header className="cp-header">
                    <button className="cp-btn-back" onClick={() => navigate(-1)}>← Volver</button>
                    <div className="cp-title">
                        <h1>Nuevo Pasante</h1>
                        <p>Registro de datos personales y credenciales.</p>
                    </div>
                </header>

                <div className="cp-form-card">
                    <form onSubmit={handleSubmit}>
                        
                        {/* SECCIÓN 1 */}
                        <div className="cp-section-title">
                            <h3>Información Personal</h3>
                            <span className="cp-divider"></span>
                        </div>

                        <div className="cp-grid">
                            <div className="cp-input-group">
                                <label className="cp-label">Nombres</label>
                                <input className="cp-input" type="text" name="nombres" placeholder="Ej: Juan Carlos" value={formData.nombres} onChange={handleChange} required />
                            </div>
                            <div className="cp-input-group">
                                <label className="cp-label">Apellidos</label>
                                <input className="cp-input" type="text" name="apellidos" placeholder="Ej: Pérez Loor" value={formData.apellidos} onChange={handleChange} required />
                            </div>
                            
                            <div className="cp-input-group">
                                <label className="cp-label">Cédula de Identidad</label>
                                <input 
                                    className={`cp-input ${errors.cedula ? 'cp-error-border' : ''}`}
                                    type="text" 
                                    name="cedula" 
                                    placeholder="1700000000" 
                                    maxLength={10} 
                                    value={formData.cedula} 
                                    onChange={handleChange} 
                                    required 
                                />
                                {errors.cedula && <span className="cp-error-msg">{errors.cedula}</span>}
                            </div>

                            <div className="cp-input-group">
                                <label className="cp-label">Fecha de Nacimiento</label>
                                <input className="cp-input" type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />
                            </div>

                            <div className="cp-input-group">
                                <label className="cp-label">Correo Electrónico</label>
                                <input 
                                    className={`cp-input ${errors.email ? 'cp-error-border' : ''}`}
                                    type="email" 
                                    name="email" 
                                    placeholder="correo@ejemplo.com" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    required 
                                />
                                {errors.email && <span className="cp-error-msg">{errors.email}</span>}
                            </div>

                            <div className="cp-input-group">
                                <label className="cp-label">Teléfono / Celular</label>
                                <input 
                                    className={`cp-input ${errors.telefono ? 'cp-error-border' : ''}`}
                                    type="tel" 
                                    name="telefono" 
                                    placeholder="0999999999" 
                                    maxLength={10} 
                                    value={formData.telefono} 
                                    onChange={handleChange} 
                                    required 
                                />
                                {errors.telefono && <span className="cp-error-msg">{errors.telefono}</span>}
                            </div>

                            <div className="cp-input-group">
                                <label className="cp-label">Discapacidad</label>
                                <select className="cp-select" name="discapacidad" value={formData.discapacidad} onChange={handleChange}>
                                    <option value="No">No</option>
                                    <option value="Sí">Sí</option>
                                </select>
                            </div>

                            <div className="cp-input-group">
                                <label className="cp-label">
                                    Fotografía Carnet 
                                    {isConverting && <span style={{color:'orange', marginLeft:'10px', fontSize:'0.8em', fontWeight:'bold'}}>⏳ PROCESANDO...</span>}
                                </label>
                                <div className="cp-file-wrapper">
                                    <input type="file" accept="image/*" onChange={handleFileChange} id="fileInput" style={{display:'none'}}/>
                                    <label htmlFor="fileInput" style={{cursor:'pointer', width:'100%', textAlign:'center'}}>
                                        {formData.fotoBase64 ? (
                                            <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                                                <img 
                                                    src={formData.fotoBase64} 
                                                    alt="Vista previa" 
                                                    style={{width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #2563eb', marginBottom:'10px'}}
                                                />
                                                <span style={{color:'#2563eb', fontSize:'0.9rem'}}>Cambiar imagen</span>
                                            </div>
                                        ) : (
                                            <span style={{color:'#64748b'}}>Clic para subir (JPG/PNG - Máx 200KB)</span>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2 */}
                        <div className="cp-section-title">
                            <h3>Datos Académicos e Institucionales</h3>
                            <span className="cp-divider"></span>
                        </div>

                        <div className="cp-grid">
                            <div className="cp-input-group">
                                <label className="cp-label">Institución Educativa</label>
                                <input className="cp-input" type="text" name="institucion" placeholder="Ej: Universidad Central" value={formData.institucion} onChange={handleChange} required />
                            </div>
                            <div className="cp-input-group">
                                <label className="cp-label">Carrera</label>
                                <input className="cp-input" type="text" name="carrera" placeholder="Ej: Ing. en Sistemas" value={formData.carrera} onChange={handleChange} required />
                            </div>
                            <div className="cp-input-group">
                                <label className="cp-label">Dependencia Asignada</label>
                                <select className="cp-select" name="dependencia" value={formData.dependencia} onChange={handleChange} required>
                                    <option value="">Seleccione una área...</option>
                                    {dependencias.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cp-input-group">
                                <label className="cp-label">Horas Totales Requeridas</label>
                                <input className="cp-input" type="number" name="horasRequeridas" placeholder="Ej: 240" value={formData.horasRequeridas} onChange={handleChange} required />
                            </div>
                        </div>

                        {/* SECCIÓN 3 */}
                        <div className="cp-section-title">
                            <h3>Credenciales de Acceso</h3>
                            <span className="cp-divider"></span>
                        </div>

                        <div className="cp-grid">
                            <div className="cp-input-group">
                                <label className="cp-label">Usuario (Generado Automáticamente)</label>
                                <input className="cp-input cp-readonly" type="text" name="usuario" value={formData.usuario} readOnly />
                                <small style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'4px'}}>
                                    Formato: {formData.usuario ? formData.usuario : "Primera letra nombre + Primer apellido"}
                                </small>
                            </div>
                            
                            <div className="cp-input-group">
                                <label className="cp-label">Contraseña Temporal</label>
                                <input 
                                    className={`cp-input ${errors.password ? 'cp-error-border' : ''}`}
                                    type="password" 
                                    name="password" 
                                    placeholder="Contraseña inicial" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required 
                                />
                                {errors.password ? (
                                    <span className="cp-error-msg">{errors.password}</span>
                                ) : (
                                    <small style={{fontSize:'0.75rem', color:'#eab308', marginTop:'4px'}}>* El usuario deberá cambiarla al primer acceso.</small>
                                )}
                            </div>
                        </div>

                        <div className="cp-footer">
                            <button type="button" className="cp-btn-cancel" onClick={() => navigate(-1)}>Cancelar</button>
                            
                            <button 
                                type="submit" 
                                className="cp-btn-save" 
                                disabled={isConverting} 
                                style={{ opacity: isConverting ? 0.6 : 1, cursor: isConverting ? 'not-allowed' : 'pointer' }}
                            >
                                {isConverting ? 'Procesando Imagen...' : 'Registrar Pasante'}
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreacionPasante;