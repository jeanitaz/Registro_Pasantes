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

    // Estado para manejar los errores de validación
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

    // --- MODIFICADO: HANDLER CON RESTRICCIONES DE ENTRADA ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Validación en tiempo real para Cédula y Teléfono (Solo números y máx 10)
        if (name === 'cedula' || name === 'telefono') {
            // Elimina cualquier caracter que no sea número
            const soloNumeros = value.replace(/\D/g, '');
            
            // Limita a 10 dígitos
            if (soloNumeros.length <= 10) {
                setFormData(prev => ({ ...prev, [name]: soloNumeros }));
                
                // Limpiar error visual si el usuario corrige y llega a 10
                if (soloNumeros.length === 10) {
                    setErrors(prev => ({ ...prev, [name]: '' }));
                }
            }
            return; // Detiene la ejecución estándar para estos campos
        }

        // Para el resto de campos
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Limpiar errores simples al escribir
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

    // --- NUEVO: FUNCIÓN DE VALIDACIÓN ANTES DE ENVIAR ---
    const validarFormulario = () => {
        let esValido = true;
        const nuevosErrores = { cedula: '', email: '', telefono: '', password: '' };

        // 1. Validar Cédula (Exactamente 10 dígitos)
        if (formData.cedula.length !== 10) {
            nuevosErrores.cedula = 'La cédula debe tener 10 dígitos.';
            esValido = false;
        }

        // 2. Validar Teléfono (Exactamente 10 dígitos y empezar con 09 generalmente)
        if (formData.telefono.length !== 10) {
            nuevosErrores.telefono = 'El celular debe tener 10 dígitos.';
            esValido = false;
        }

        // 3. Validar Correo (Regex simple para formato email)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            nuevosErrores.email = 'Formato de correo inválido.';
            esValido = false;
        }

        // 4. Validar Contraseña (Mínimo 6 caracteres)
        if (formData.password.length < 6) {
            nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres.';
            esValido = false;
        }

        setErrors(nuevosErrores);
        return esValido;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        // Ejecutar validaciones antes de cualquier cosa
        if (!validarFormulario()) {
            alert("⚠️ Por favor corrige los errores resaltados antes de continuar.");
            return;
        }

        if (isConverting) {
            alert("⏳ Procesando imagen, por favor espera un segundo...");
            return;
        }

        // Verificar si hay imagen seleccionada pero no procesada
        if (formData.foto && !formData.fotoBase64) {
            alert("⚠️ La imagen aún se está cargando. Intenta de nuevo en 2 segundos.");
            return;
        }

        // --- OBTENER USUARIO ACTUAL DE RRHH ---
        const rrhhUser = JSON.parse(localStorage.getItem('user') || '{}');
        const nombreCreador = rrhhUser.usuario || 'RRHH Desconocido';
        // -------------------------------------

        const nuevoPasante = {
            ...formData,
            horasRequeridas: Number(formData.horasRequeridas),
            fotoUrl: formData.fotoBase64 || "",
            estado: "No habilitado",
            fechaRegistro: new Date().toISOString(),
            creadoPor: nombreCreador 
        };

        // Eliminar campos que no van a la BD (como el file object crudo)
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
                navigate('/rrhh');
            } else {
                alert("Error al guardar en la base de datos.");
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            alert("No se pudo conectar con el servidor local.");
        }
    };

    return (
        <div className="sophisticated-wrapper">
            <div className="ambient-light light-1"></div>
            <div className="ambient-light light-2"></div>

            <main className="main-view full-width">
                <header className="glass-header">
                    <div className="header-title">
                        <button className="btn-back" onClick={() => navigate(-1)}>← Volver</button>
                        <h1>Nuevo Pasante</h1>
                        <p>Registro de datos personales y credenciales.</p>
                    </div>
                </header>

                <div className="form-container">
                    <form className="glass-card form-content" onSubmit={handleSubmit}>
                        
                        <div className="form-section-title">
                            <h3>Información Personal</h3>
                            <span className="divider"></span>
                        </div>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Nombres</label>
                                <input type="text" name="nombres" placeholder="Ej: Juan Carlos" value={formData.nombres} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>Apellidos</label>
                                <input type="text" name="apellidos" placeholder="Ej: Pérez Loor" value={formData.apellidos} onChange={handleChange} required />
                            </div>
                            
                            {/* CÉDULA CON VALIDACIÓN VISUAL */}
                            <div className="input-group">
                                <label>Cédula de Identidad</label>
                                <input 
                                    type="text" 
                                    name="cedula" 
                                    placeholder="1700000000" 
                                    maxLength={10} 
                                    value={formData.cedula} 
                                    onChange={handleChange} 
                                    required 
                                    className={errors.cedula ? 'input-error' : ''}
                                    style={errors.cedula ? {borderColor: '#ef4444'} : {}}
                                />
                                {errors.cedula && <span className="error-msg" style={{color: '#ef4444', fontSize: '0.8rem', marginTop:'4px'}}>{errors.cedula}</span>}
                            </div>

                            <div className="input-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />
                            </div>

                            {/* EMAIL CON VALIDACIÓN VISUAL */}
                            <div className="input-group">
                                <label>Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    placeholder="correo@ejemplo.com" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    required 
                                    className={errors.email ? 'input-error' : ''}
                                    style={errors.email ? {borderColor: '#ef4444'} : {}}
                                />
                                {errors.email && <span className="error-msg" style={{color: '#ef4444', fontSize: '0.8rem', marginTop:'4px'}}>{errors.email}</span>}
                            </div>

                            {/* TELÉFONO CON VALIDACIÓN VISUAL */}
                            <div className="input-group">
                                <label>Teléfono / Celular</label>
                                <input 
                                    type="tel" 
                                    name="telefono" 
                                    placeholder="0999999999" 
                                    maxLength={10} 
                                    value={formData.telefono} 
                                    onChange={handleChange} 
                                    required 
                                    className={errors.telefono ? 'input-error' : ''}
                                    style={errors.telefono ? {borderColor: '#ef4444'} : {}}
                                />
                                {errors.telefono && <span className="error-msg" style={{color: '#ef4444', fontSize: '0.8rem', marginTop:'4px'}}>{errors.telefono}</span>}
                            </div>

                            <div className="input-group">
                                <label>Discapacidad</label>
                                <select name="discapacidad" value={formData.discapacidad} onChange={handleChange}>
                                    <option value="No">No</option>
                                    <option value="Sí">Sí</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>
                                    Fotografía Carnet 
                                    {isConverting && <span style={{color:'orange', marginLeft:'10px', fontSize:'0.8em', fontWeight:'bold'}}>⏳ PROCESANDO...</span>}
                                </label>
                                <div className="file-upload-wrapper" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                    <span className="file-hint">Formato JPG o PNG. Máx 200KB.</span>
                                    
                                    {formData.fotoBase64 && (
                                        <div style={{marginTop: '5px', textAlign: 'center'}}>
                                            <img 
                                                src={formData.fotoBase64} 
                                                alt="Vista previa" 
                                                style={{
                                                    width: '100px', 
                                                    height: '100px', 
                                                    objectFit: 'cover', 
                                                    borderRadius: '50%',
                                                    border: '2px solid #2563eb',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-section-title">
                            <h3>Datos Académicos e Institucionales</h3>
                            <span className="divider"></span>
                        </div>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Institución Educativa</label>
                                <input type="text" name="institucion" placeholder="Ej: Universidad Central" value={formData.institucion} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>Carrera</label>
                                <input type="text" name="carrera" placeholder="Ej: Ing. en Sistemas" value={formData.carrera} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>Dependencia Asignada</label>
                                <select name="dependencia" value={formData.dependencia} onChange={handleChange} required>
                                    <option value="">Seleccione una área...</option>
                                    {dependencias.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Horas Totales Requeridas</label>
                                <input type="number" name="horasRequeridas" placeholder="Ej: 240" value={formData.horasRequeridas} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-section-title">
                            <h3>Credenciales de Acceso</h3>
                            <span className="divider"></span>
                        </div>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Usuario (Generado Automáticamente)</label>
                                <input type="text" name="usuario" value={formData.usuario} readOnly className="input-readonly" />
                                <small className="helper-text">
                                    Formato: {formData.usuario ? formData.usuario : "Primera letra nombre + Primer apellido"}
                                </small>
                            </div>
                            
                            {/* CONTRASEÑA CON VALIDACIÓN VISUAL */}
                            <div className="input-group">
                                <label>Contraseña Temporal</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    placeholder="Contraseña inicial" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required 
                                    className={errors.password ? 'input-error' : ''}
                                    style={errors.password ? {borderColor: '#ef4444'} : {}}
                                />
                                {errors.password ? (
                                    <span className="error-msg" style={{color: '#ef4444', fontSize: '0.8rem', marginTop:'4px'}}>{errors.password}</span>
                                ) : (
                                    <small className="helper-text warning">* El usuario deberá cambiarla al primer acceso.</small>
                                )}
                            </div>
                        </div>

                        <div className="form-actions-footer">
                            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>Cancelar</button>
                            
                            <button 
                                type="submit" 
                                className="btn-save" 
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