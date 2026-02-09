const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// 1. CONFIGURACIÓN DE LÍMITES Y CORS
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(cors());

// Asegurar que la carpeta de subidas existe
const uploadDirGlobal = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirGlobal)) {
    fs.mkdirSync(uploadDirGlobal, { recursive: true });
}
app.use('/uploads', express.static(uploadDirGlobal));

// 2. CONEXIÓN A LA BASE DE DATOS
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0993643838Jc',
    database: 'sistema_inamhi',
    multipleStatements: true
});

db.connect(err => {
    if (err) console.error('❌ Error MySQL:', err);
    else {
        console.log('✅ Connected to MySQL successfully');
        const createAuditTable = `
            CREATE TABLE IF NOT EXISTS auditoria_cambios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                accion VARCHAR(100),
                descripcion TEXT,
                responsable VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        db.query(createAuditTable, (e) => {
            if (e) console.error("Error creating audit table:", e);
        });

        // --- MIGRACIÓN AUTOMÁTICA: AGREGAR COLUMNA DELEGADO ---
        const checkColumn = "SHOW COLUMNS FROM pasantes LIKE 'delegado'";
        db.query(checkColumn, (err, result) => {
            if (!err && result.length === 0) {
                const alterTable = "ALTER TABLE pasantes ADD COLUMN delegado VARCHAR(150) AFTER dependencia";
                db.query(alterTable, (e) => {
                    if (e) console.error("Error adding 'delegado' column:", e);
                    else console.log("✅ Columna 'delegado' agregada a tabla pasantes.");
                });
            }
        });


        // --- MIGRACIÓN AUTOMÁTICA EXTRA: Carta Convenio ---
        const checkConvenio = "SHOW COLUMNS FROM pasantes LIKE 'doc_carta_convenio'";
        db.query(checkConvenio, (err, result) => {
            if (!err && result.length === 0) {
                // Agregamos la columna si no existe
                const alter = "ALTER TABLE pasantes ADD COLUMN doc_carta_convenio VARCHAR(255) AFTER doc_copia_cedula";
                db.query(alter, (e) => {
                    if (e) console.error("Error adding doc_carta_convenio:", e);
                    else console.log("✅ Columna 'doc_carta_convenio' agregada.");
                });
            }
        });

        // --- MIGRACIÓN AUTOMÁTICA EXTRA: Telefono Emergencia ---
        const checkEmergencia = "SHOW COLUMNS FROM pasantes LIKE 'telefono_emergencia'";
        db.query(checkEmergencia, (err, result) => {
            if (!err && result.length === 0) {
                const alter = "ALTER TABLE pasantes ADD COLUMN telefono_emergencia VARCHAR(20) AFTER telefono";
                db.query(alter, (e) => {
                    if (e) console.error("Error adding telefono_emergencia:", e);
                    else console.log("✅ Columna 'telefono_emergencia' agregada.");
                });
            }
        });
    }
});




// 3. CONFIGURACIÓN DE MULTER Y UTILIDADES
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDirGlobal); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

const saveBase64ToFile = (base64String, prefix) => {
    if (!base64String) return null;
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const buffer = Buffer.from(matches[2], 'base64');
    let extension = 'bin';
    if (matches[1].includes('pdf')) extension = 'pdf';
    else if (matches[1].includes('image')) extension = 'jpg';
    const filename = `${prefix}-${Date.now()}.${extension}`;
    try {
        fs.writeFileSync(path.join(uploadDirGlobal, filename), buffer);
        console.log(`✅ File saved: ${filename}`);
        return filename;
    } catch (e) {
        console.error("❌ Error saving file:", e);
        return null;
    }
};

// --- HELPER PARA REGISTRAR AUDITORÍA ---
const registrarAuditoria = (accion, descripcion, responsable) => {
    const sql = 'INSERT INTO auditoria_cambios (accion, descripcion, responsable, fecha) VALUES (?, ?, ?, NOW())';
    db.query(sql, [accion, descripcion, responsable || 'Sistema'], err => {
        if (err) console.error("Error logging audit:", err);
    });
};

// ==========================================
// 🚀 RUTA DE LOGIN
// ==========================================
app.post('/login', (req, res) => {
    const { usuario, password } = req.body;
    const sqlAdmin = 'SELECT * FROM usuarios_admin WHERE usuario = ? AND password = ?';

    db.query(sqlAdmin, [usuario, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            const user = results[0];
            return res.json({
                id: user.id,
                role: user.rol,
                name: `${user.nombres} ${user.apellidos}`,
                usuario: user.usuario,
                estado: user.estado
            });
        }
        const sqlPasante = 'SELECT * FROM pasantes WHERE usuario = ? AND password = ?';
        db.query(sqlPasante, [usuario, password], (err, resPasante) => {
            if (resPasante.length > 0) {
                const p = resPasante[0];
                return res.json({
                    id: p.id,
                    role: 'Pasante',
                    name: `${p.nombres} ${p.apellidos}`,
                    usuario: p.usuario,
                    estado: p.estado,
                    docHojaVida: p.doc_ho_vida,
                    delegado: p.delegado // <--- Incluir delegado en login
                });
            }
            return res.status(401).json({ error: 'Credenciales inválidas' });
        });
    });
});

// ==========================================
// ⏱️ RUTAS DE ASISTENCIA
// ==========================================

app.get('/asistencia', (req, res) => {
    const { usuario, pasante_id } = req.query;

    let sql = `
        SELECT 
            r.id, 
            r.fecha_hora, 
            r.tipo_evento, 
            COALESCE(CONCAT(u.nombres, ' ', u.apellidos), r.guardia_responsable) AS nombre_guardia,
            p.nombres AS pasante_nombres, 
            p.apellidos AS pasante_apellidos, 
            p.cedula, 
            p.carrera
        FROM registros_asistencia r
        JOIN pasantes p ON r.pasante_id = p.id
        LEFT JOIN usuarios_admin u ON r.guardia_responsable = u.usuario
    `;

    const params = [];

    if (pasante_id) {
        sql += ` WHERE r.pasante_id = ? `;
        params.push(pasante_id);
    }
    else if (usuario) {
        sql += ` WHERE r.guardia_responsable = ? `;
        params.push(usuario);
    }

    sql += ` ORDER BY r.fecha_hora DESC LIMIT 100`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener historial' });

        const response = results.map(row => ({
            id: row.id,
            fecha_hora: row.fecha_hora,
            tipo_evento: row.tipo_evento,
            guardia: row.nombre_guardia,
            pasante: {
                nombres: row.pasante_nombres,
                apellidos: row.pasante_apellidos,
                cedula: row.cedula,
                carrera: row.carrera
            }
        }));
        res.json(response);
    });
});

app.get('/asistencia/hoy/:id', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT tipo_evento, fecha_hora, guardia_responsable FROM registros_asistencia 
                 WHERE pasante_id = ? AND DATE(fecha_hora) = CURDATE()`;
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// ✅ TIMBRAR (Lógica ACTUALIZADA para obtener nombre real del guardia)
app.post('/timbrar', (req, res) => {
    const { pasanteId, tipoEvento, guardia } = req.body; // 'guardia' trae el usuario (ej: mnaranjo)

    // 1. PRIMERO: Buscamos el nombre real del guardia en la BD
    db.query('SELECT nombres, apellidos FROM usuarios_admin WHERE usuario = ?', [guardia], (errGuardia, resGuardia) => {

        // Si encontramos al guardia, usamos su nombre completo. Si no, usamos el usuario como fallback.
        let nombreResponsable = guardia;
        if (!errGuardia && resGuardia.length > 0) {
            nombreResponsable = `${resGuardia[0].nombres} ${resGuardia[0].apellidos}`;
        }

        // 2. SEGUNDO: Procedemos con la lógica del pasante
        db.query('SELECT * FROM pasantes WHERE id = ?', [pasanteId], (err, results) => {
            if (err || results.length === 0) return res.status(500).json({ error: 'Pasante no encontrado' });
            const pasante = results[0];
            const nombrePasante = `${pasante.nombres} ${pasante.apellidos}`;

            if (pasante.estado && (pasante.estado.includes('Finalizado') || pasante.estado === 'No habilitado')) {
                return res.status(400).json({ error: `Pasante bloqueado: ${pasante.estado}` });
            }

            // ---------------------------------------------------------
            // LÓGICA DE HORARIOS PERSONALIZADOS
            // ---------------------------------------------------------
            const ahora = new Date();
            let nuevoAtraso = 0;
            let mensajeAtraso = "";

            // Helper para convertir "HH:MM" a Date (hoy)
            const getFechaConHora = (horaStr) => {
                if (!horaStr) return null;
                const [h, m] = horaStr.split(':').map(Number);
                const fecha = new Date(ahora);
                fecha.setHours(h, m, 0, 0);
                return fecha;
            };

            // 1. Detectar ATRASO (entrada)
            if (tipoEvento === 'entrada') {
                // Hora base: Si tiene hora_entrada personalizada, usarla. Si no, default 08:00
                // GRACE PERIOD: 15 minutos
                let horaLimite = new Date(ahora);

                if (pasante.hora_entrada) {
                    horaLimite = getFechaConHora(pasante.hora_entrada);
                } else {
                    horaLimite.setHours(8, 0, 0, 0); // Default 8:00
                }

                // Sumamos 15 minutos de gracia
                horaLimite.setMinutes(horaLimite.getMinutes() + 15);

                if (ahora > horaLimite) {
                    nuevoAtraso = 1;
                    const horaEsperada = pasante.hora_entrada || "08:00";
                    mensajeAtraso = `Llegada tardía (Hora: ${horaEsperada} + 15m gracia)`;
                    registrarAuditoria('Atraso Registrado', `Pasante ${nombrePasante} llegó tarde (${ahora.toLocaleTimeString()}). Limite: ${horaLimite.toLocaleTimeString()}`, nombreResponsable);
                }
            }

            // 2. Detectar RETIRO ANTICIPADO (salida)
            if (tipoEvento === 'salida') {
                // Hora base salida: Si tiene hora_salida, usarla. Si no, default 16:00
                let horaSalidaMinima = new Date(ahora);

                if (pasante.hora_salida) {
                    horaSalidaMinima = getFechaConHora(pasante.hora_salida);
                } else {
                    horaSalidaMinima.setHours(16, 0, 0, 0);
                }

                if (ahora < horaSalidaMinima) {
                    registrarAuditoria('Retiro Anticipado', `Pasante ${nombrePasante} salió antes de su hora (${horaSalidaMinima.toLocaleTimeString()})`, nombreResponsable);
                }
            }

            const sqlInsert = 'INSERT INTO registros_asistencia (pasante_id, tipo_evento, guardia_responsable, fecha_hora) VALUES (?, ?, ?, ?)';
            db.query(sqlInsert, [pasanteId, tipoEvento, guardia, ahora], (err) => { // Aquí guardamos el usuario (ID) para referencia interna
                if (err) return res.status(500).json({ error: "Error saving attendance" });

                if (nuevoAtraso > 0) {
                    const totalAtrasos = (pasante.atrasos || 0) + 1;
                    let nuevoEstado = pasante.estado;

                    // AUDITORIA LLAMADOS ATENCIÓN
                    if (totalAtrasos % 3 === 0) {
                        registrarAuditoria('Llamado de Atención', `Pasante ${nombrePasante} acumula ${totalAtrasos} atrasos.`, 'Sistema');
                    }
                    if (totalAtrasos > 5) {
                        nuevoEstado = "Finalizado por atrasos excedidos";
                        registrarAuditoria('Pasante Finalizado', `Bloqueo automático: ${nombrePasante} excedió límite de atrasos.`, 'Sistema');
                    }

                    db.query('UPDATE pasantes SET atrasos = ?, estado = ? WHERE id = ?', [totalAtrasos, nuevoEstado, pasante.id]);
                }

                if (tipoEvento === 'salida') calcularHorasDia(pasanteId, ahora, res);
                else res.json({ message: 'Timbrado exitoso', alerta: mensajeAtraso });
            });
        });
    });
});

function calcularHorasDia(pasanteId, horaSalida, res) {
    db.query(`SELECT tipo_evento, fecha_hora FROM registros_asistencia WHERE pasante_id = ? AND DATE(fecha_hora) = CURDATE()`, [pasanteId], (err, eventos) => {
        let entrada = null, salAlm = null, entAlm = null;
        eventos.forEach(e => {
            if (e.tipo_evento === 'entrada') entrada = new Date(e.fecha_hora);
            if (e.tipo_evento === 'salida_almuerzo') salAlm = new Date(e.fecha_hora);
            if (e.tipo_evento === 'entrada_almuerzo') entAlm = new Date(e.fecha_hora);
        });

        if (entrada) {
            let totalMilisegundos = horaSalida - entrada;
            if (salAlm && entAlm) totalMilisegundos -= (entAlm - salAlm);
            else if (salAlm && !entAlm) totalMilisegundos -= (30 * 60 * 1000);

            const horasGanadas = totalMilisegundos / 1000 / 60 / 60;
            db.query('UPDATE pasantes SET horas_completadas = horas_completadas + ? WHERE id = ?', [horasGanadas, pasanteId], (err) => {
                res.json({ message: `Jornada finalizada. Horas sumadas: ${horasGanadas.toFixed(2)}` });
            });
        } else {
            res.json({ message: 'Salida registrada (Sin entrada previa)' });
        }
    });
}

// ==========================================
// 👥 GESTIÓN PASANTES
// ==========================================

app.get('/pasantes', (req, res) => {
    const { usuario, password } = req.query;
    let sql = 'SELECT * FROM pasantes';
    let params = [];
    if (usuario && password) {
        sql += ' WHERE (usuario = ? OR email = ?) AND password = ?';
        params = [usuario, usuario, password];
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json(err);
        const formateados = results.map(p => ({
            ...p,
            horasCompletadas: p.horas_completadas || 0,
            horasRequeridas: p.horas_requeridas || 0,
            fotoUrl: p.foto_url ? `/api/uploads/${p.foto_url}` : null,
            informeUrl: p.informe_url ? `/api/uploads/${p.informe_url}` : null,
            informeFinalSubido: !!p.informe_url,
            docHojaVida: p.doc_hoja_vida ? `/api/uploads/${p.doc_hoja_vida}` : null,
            docCartaSolicitud: p.doc_carta_solicitud ? `/api/uploads/${p.doc_carta_solicitud}` : null,
            docAcuerdoConfidencialidad: p.doc_acuerdo_confidencialidad ? `/api/uploads/${p.doc_acuerdo_confidencialidad}` : null,
            docCopiaCedula: p.doc_copia_cedula ? `/api/uploads/${p.doc_copia_cedula}` : null,
            docCartaConvenio: p.doc_carta_convenio ? `/api/uploads/${p.doc_carta_convenio}` : null,
            horaEntrada: p.hora_entrada,
            horaSalida: p.hora_salida
        }));
        res.json(formateados);
    });
});

app.get('/pasantes/:id', (req, res) => {
    db.query('SELECT * FROM pasantes WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'No encontrado' });
        const p = results[0];
        res.json({
            ...p,
            horasCompletadas: p.horas_completadas || 0,
            horasRequeridas: p.horas_requeridas || 0,
            fotoUrl: p.foto_url ? `/api/uploads/${p.foto_url}` : null,
            informeUrl: p.informe_url ? `/api/uploads/${p.informe_url}` : null,
            docHojaVida: p.doc_hoja_vida ? `/api/uploads/${p.doc_hoja_vida}` : null,
            docCartaSolicitud: p.doc_carta_solicitud ? `/api/uploads/${p.doc_carta_solicitud}` : null,
            docAcuerdoConfidencialidad: p.doc_acuerdo_confidencialidad ? `/api/uploads/${p.doc_acuerdo_confidencialidad}` : null,
            docCopiaCedula: p.doc_copia_cedula ? `/api/uploads/${p.doc_copia_cedula}` : null,
            docCopiaCedula: p.doc_copia_cedula ? `/api/uploads/${p.doc_copia_cedula}` : null,
            docCartaConvenio: p.doc_carta_convenio ? `/api/uploads/${p.doc_carta_convenio}` : null,
            horaEntrada: p.hora_entrada,
            horaSalida: p.hora_salida
        });
    });
});

app.post('/pasantes', upload.single('foto'), (req, res) => {
    const body = req.body;
    let filename = req.file ? req.file.filename : null;
    if (!filename && body.fotoUrl && body.fotoUrl.startsWith('data:')) filename = saveBase64ToFile(body.fotoUrl, 'foto_perfil');

    const sql = `INSERT INTO pasantes (nombres, apellidos, cedula, fecha_nacimiento, institucion, carrera, dependencia, delegado, horas_requeridas, discapacidad, email, telefono, telefono_emergencia, usuario, password, foto_url, fecha_registro, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [body.nombres, body.apellidos, body.cedula, body.fechaNacimiento, body.institucion, body.carrera, body.dependencia, body.delegado, body.horasRequeridas, body.discapacidad, body.email, body.telefono, body.telefonoEmergencia, body.usuario, body.password, filename, new Date(), body.creadoPor || 'Sistema'];

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });

        registrarAuditoria('Creación de Pasante', `Se registró al pasante ${body.nombres} ${body.apellidos}`, body.creadoPor);

        res.json({ message: 'Pasante creado', id: result.insertId });
    });
});

app.patch('/pasantes/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;
    console.log(`[PATCH] Updating pasante ${id}. Keys received:`, Object.keys(body));

    db.query('SELECT nombres, apellidos, estado FROM pasantes WHERE id = ?', [id], (e, r) => {
        if (e || r.length === 0) return res.status(404).json({ error: "Pasante no encontrado" });

        const pasanteActual = r[0];
        const nombrePasante = `${pasanteActual.nombres} ${pasanteActual.apellidos}`;

        let updates = [];
        let values = [];

        const dbMap = {
            horasCompletadas: 'horas_completadas',
            horasRequeridas: 'horas_requeridas',
            horaEntrada: 'hora_entrada',
            horaSalida: 'hora_salida',
            docHojaVida: 'doc_hoja_vida',
            docCartaSolicitud: 'doc_carta_solicitud',
            docAcuerdoConfidencialidad: 'doc_acuerdo_confidencialidad',
            docCopiaCedula: 'doc_copia_cedula',
            docCartaConvenio: 'doc_carta_convenio',
            informeUrl: 'informe_url'
        };

        Object.keys(body).forEach(key => {
            if (['id', 'fotoUrl', 'documentacionCompleta', 'informeFinalSubido'].includes(key)) return;
            const dbCol = dbMap[key] || key;

            if (['doc_hoja_vida', 'doc_carta_solicitud', 'doc_acuerdo_confidencialidad', 'doc_copia_cedula', 'doc_carta_convenio', 'informe_url'].includes(dbCol)) {
                if (body[key]) {
                    const filename = saveBase64ToFile(body[key], dbCol);
                    updates.push(`${dbCol} = ?`);
                    values.push(filename);
                }
            } else {
                if (body[key] !== undefined) {
                    updates.push(`${dbCol} = ?`);
                    values.push(body[key]);
                }
            }
        });

        if (body.documentacionCompleta) {
            updates.push("documentacion_completa = 1");
            if (!body.estado) {
                updates.push("estado = 'Activo'");
                registrarAuditoria('Documentación Completa', `Pasante ${nombrePasante} activado.`, 'RRHH');
            }
        }

        if (body.informeUrl && body.informeUrl.startsWith('data:')) {
            const filename = saveBase64ToFile(body.informeUrl, 'informe_final');
            updates.push("informe_url = ?");
            values.push(filename);
            registrarAuditoria('Informe Final', `Pasante ${nombrePasante} subió informe.`, 'Pasante');
        }

        if (updates.length > 0) {
            values.push(id);
            const sql = `UPDATE pasantes SET ${updates.join(', ')} WHERE id = ?`;

            db.query(sql, values, (err) => {
                if (err) return res.status(500).json({ error: err.sqlMessage });

                if (body.estado && body.estado !== pasanteActual.estado) {
                    registrarAuditoria('Cambio de Estado', `Estado de ${nombrePasante} cambió de '${pasanteActual.estado}' a '${body.estado}'`, 'Admin');
                }

                res.json({ message: 'Actualizado correctamente' });
            });
        } else {
            res.json({ message: 'No hubo cambios para guardar' });
        }
    });
});

app.delete('/pasantes/:id', (req, res) => {
    db.query('SELECT nombres, apellidos FROM pasantes WHERE id = ?', [req.params.id], (err, r) => {
        const nombre = r.length > 0 ? `${r[0].nombres} ${r[0].apellidos}` : 'Desconocido';
        db.query('DELETE FROM pasantes WHERE id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json(err);
            registrarAuditoria('Eliminación Pasante', `Se eliminó al pasante ${nombre}`, 'Admin');
            res.json({ message: 'Eliminado' });
        });
    });
});

// ==========================================
// 👥 GESTIÓN USUARIOS ADMIN
// ==========================================

app.post('/usuarios', (req, res) => {
    const { nombres, apellidos, cedula, rol, usuario, password, estado } = req.body;
    db.query('INSERT INTO usuarios_admin (nombres, apellidos, cedula, rol, usuario, password, estado, fecha_registro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nombres, apellidos, cedula, rol, usuario, password, estado, new Date()], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: `El usuario '${usuario}' ya existe.` });
                return res.status(500).json(err);
            }
            registrarAuditoria('Creación Usuario', `Nuevo usuario: ${usuario} (${rol})`, 'Admin');
            res.json({ message: 'User created', id: result.insertId });
        });
});

app.put('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { password, estado } = req.body;
    db.query('SELECT usuario FROM usuarios_admin WHERE id = ?', [id], (err, r) => {
        const user = r.length > 0 ? r[0].usuario : 'Usuario';
        db.query('UPDATE usuarios_admin SET password = ?, estado = ? WHERE id = ?', [password, estado, id], (err) => {
            if (err) return res.status(500).json(err);
            registrarAuditoria('Actualización Usuario', `Cambio de clave/estado para ${user}`, 'Admin');
            res.json({ message: 'Updated' });
        });
    });
});

app.delete('/usuarios/:id', (req, res) => {
    db.query('SELECT usuario FROM usuarios_admin WHERE id = ?', [req.params.id], (err, r) => {
        const user = r.length > 0 ? r[0].usuario : 'Usuario';
        db.query('DELETE FROM usuarios_admin WHERE id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json(err);
            registrarAuditoria('Eliminación Usuario', `Se eliminó al usuario ${user}`, 'Admin');
            res.json({ message: 'Deleted' });
        });
    });
});

// ==========================================
// 📋 AUDITORÍA Y REPORTES
// ==========================================

app.get('/auditoria', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const sql = `SELECT * FROM auditoria_cambios ORDER BY fecha DESC LIMIT ${limit}`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        const mapped = results.map(r => ({
            id: r.id,
            nombre: r.responsable,
            rol: r.accion,
            descripcion: r.descripcion,
            fecha: r.fecha
        }));
        res.json(mapped);
    });
});

app.get('/usuarios', (req, res) => { db.query('SELECT * FROM usuarios_admin', (e, r) => res.json(r)); });

// 4. INICIO DEL SERVIDOR
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server ready on port ${PORT}`);
});