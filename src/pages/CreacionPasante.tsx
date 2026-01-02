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
        foto: null as File | null // Nota: JSON Server no guarda archivos reales, solo guardaremos el nombre
    });

    const dependencias = [
        "Dirección Ejecutiva",
        "Gestión Meteorológica",
        "Gestión Hidrológica",
        "Tecnologías de la Información",
        "Administrativo Financiero"
    ];

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

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, foto: e.target.files![0] }));
        }
    };

    // --- ENVÍO DE DATOS A JSON SERVER ---
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        // Preparamos el objeto para guardar (sin el archivo binario, solo nombre)
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
            password: formData.password, // En prod esto debe ir hasheado
            fotoNombre: formData.foto ? formData.foto.name : "default.jpg", 
            estado: "No habilitado",
            fechaRegistro: new Date().toISOString()
        };

        try {
            // Petición POST a tu servidor local
            const response = await fetch('http://localhost:3001/pasantes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(nuevoPasante),
            });

            if (response.ok) {
                alert(`¡Éxito! Pasante ${formData.usuario} registrado correctamente.`);
                navigate('/rrhh'); // Regresar al panel admin
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
                                <div className="file-upload-wrapper">
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                    <span className="file-hint">Formato JPG o PNG. Máx 2MB.</span>
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