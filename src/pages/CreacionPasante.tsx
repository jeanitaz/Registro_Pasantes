import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CreacionPasantes.css';

const CreacionPasante = () => {
    const navigate = useNavigate();

    // Estado del formulario
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
        fotoBase64: '' // <--- NUEVO CAMPO PARA GUARDAR LA IMAGEN REAL
    });

    const dependencias = [
        "Dirección Ejecutiva",
        "Gestión Meteorológica",
        "Gestión Hidrológica",
        "Tecnologías de la Información",
        "Administrativo Financiero"
    ];

    // --- FUNCIÓN HELPER: Convertir archivo a texto (Base64) ---
    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // --- LÓGICA DE GENERACIÓN DE USUARIO ---
    useEffect(() => {
        const generarUsuario = () => {
            const nombreLimpio = formData.nombres.trim().toLowerCase();
            const apellidoLimpio = formData.apellidos.trim().toLowerCase();

            if (nombreLimpio.length > 0 && apellidoLimpio.length > 0) {
                const primerNombre = nombreLimpio.split(' ')[0];
                const letraInicial = primerNombre.charAt(0);
                const primerApellido = apellidoLimpio.split(' ')[0];
                setFormData(prev => ({ 
                    ...prev, 
                    usuario: `${letraInicial}${primerApellido}` 
                }));
            } else {
                setFormData(prev => ({ ...prev, usuario: '' }));
            }
        };

        const timer = setTimeout(generarUsuario, 500);
        return () => clearTimeout(timer);
        
    }, [formData.nombres, formData.apellidos]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- MANEJO DE IMAGEN ACTUALIZADO ---
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validación de tamaño (Máx 2MB para no saturar JSON Server)
            if (file.size > 2 * 1024 * 1024) {
                alert("⚠️ La imagen es muy pesada (Máx 2MB). Por favor elige una más pequeña.");
                return;
            }

            try {
                const base64 = await convertToBase64(file);
                setFormData(prev => ({ 
                    ...prev, 
                    foto: file,
                    fotoBase64: base64 // Guardamos la cadena base64
                }));
            } catch (error) {
                console.error("Error al procesar imagen", error);
            }
        }
    };

    // --- ENVÍO DE DATOS A JSON SERVER ---
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        const nuevoPasante = {
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            cedula: formData.cedula,
            fechaNacimiento: formData.fechaNacimiento,
            institucion: formData.institucion,
            carrera: formData.carrera,
            dependencia: formData.dependencia,
            horasRequeridas: Number(formData.horasRequeridas),
            discapacidad: formData.discapacidad,
            email: formData.email,
            telefono: formData.telefono,
            usuario: formData.usuario,
            password: formData.password,
            // Aquí guardamos la imagen real codificada
            fotoUrl: formData.fotoBase64 || "", 
            estado: "No habilitado",
            fechaRegistro: new Date().toISOString()
        };

        try {
            const response = await fetch('http://localhost:3001/pasantes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(nuevoPasante),
            });

            if (response.ok) {
                alert(`¡Éxito! Pasante ${formData.usuario} registrado con foto correctamente.`);
                navigate('/rrhh');
            } else {
                alert("Error al guardar en la base de datos.");
            }

        } catch (error) {
            console.error("Error de conexión:", error);
            alert("No se pudo conectar con el servidor local. Asegúrate de ejecutar 'npm run server'.");
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
                        
                        {/* SECCIÓN 1: DATOS PERSONALES */}
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

                            <div className="input-group">
                                <label>Cédula de Identidad</label>
                                <input type="text" name="cedula" placeholder="1700000000" maxLength={10} value={formData.cedula} onChange={handleChange} required />
                            </div>

                            <div className="input-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />
                            </div>

                            <div className="input-group">
                                <label>Correo Electrónico</label>
                                <input type="email" name="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleChange} required />
                            </div>

                            <div className="input-group">
                                <label>Teléfono / Celular</label>
                                <input type="tel" name="telefono" placeholder="0999999999" value={formData.telefono} onChange={handleChange} required />
                            </div>

                            <div className="input-group">
                                <label>Discapacidad</label>
                                <select name="discapacidad" value={formData.discapacidad} onChange={handleChange}>
                                    <option value="No">No</option>
                                    <option value="Sí">Sí</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Fotografía Carnet</label>
                                <div className="file-upload-wrapper" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                    <span className="file-hint">Formato JPG o PNG. Máx 2MB.</span>
                                    
                                    {/* VISTA PREVIA DE LA IMAGEN */}
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

                        {/* SECCIÓN 2: DATOS ACADÉMICOS */}
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

                        {/* SECCIÓN 3: CREDENCIALES */}
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

                            <div className="input-group">
                                <label>Contraseña Temporal</label>
                                <input type="password" name="password" placeholder="Contraseña inicial" value={formData.password} onChange={handleChange} required />
                                <small className="helper-text warning">* El usuario deberá cambiarla al primer acceso.</small>
                            </div>
                        </div>

                        <div className="form-actions-footer">
                            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>Cancelar</button>
                            <button type="submit" className="btn-save">Registrar Pasante</button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreacionPasante;