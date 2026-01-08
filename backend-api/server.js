const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// 1. INCREASE BODY PARSER LIMIT TO 200MB (Critical)
app.use(express.json({ limit: '200mb' })); 
app.use(express.urlencoded({ limit: '200mb', extended: true }));

app.use(cors());

// Ensure uploads directory exists
const uploadDirGlobal = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirGlobal)) {
    fs.mkdirSync(uploadDirGlobal, { recursive: true });
}

app.use('/uploads', express.static(uploadDirGlobal));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0993643838Jc', 
    database: 'sistema_inamhi'
});

db.connect(err => {
    if (err) console.error('❌ Error MySQL:', err);
    else console.log('✅ Connected to MySQL successfully');
});

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDirGlobal); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

// Master Base64 Save Function
const saveBase64ToFile = (base64String, prefix) => {
    if (!base64String) return null;
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const buffer = Buffer.from(matches[2], 'base64');
    let extension = 'bin';
    if (matches[1].includes('pdf')) extension = 'pdf';
    else if (matches[1].includes('image')) extension = 'jpg';
    const filename = `${prefix}-${Date.now()}.${extension}`;
    try { fs.writeFileSync(path.join(uploadDirGlobal, filename), buffer); return filename; } catch (e) { return null; }
};

// ==========================================
// 🚀 RUTA DE LOGIN (CORREGIDA)
// ==========================================
app.post('/login', (req, res) => {
    const { usuario, password } = req.body;

    // 1. Search in Admin Users (Admin, RRHH, Seguridad)
    const sqlAdmin = 'SELECT * FROM usuarios_admin WHERE usuario = ? AND password = ?';
    
    db.query(sqlAdmin, [usuario, password], (err, results) => {
        if (err) return res.status(500).json(err);
        
        if (results.length > 0) {
            const user = results[0];
            // Return actual role from DB (Seguridad, Administrador, etc.)
            return res.json({ 
                id: user.id, 
                role: user.rol, 
                name: `${user.nombres} ${user.apellidos}`,
                usuario: user.usuario,
                estado: user.estado 
            }); 
        }

        // 2. If not admin, search in Pasantes
        const sqlPasante = 'SELECT * FROM pasantes WHERE usuario = ? AND password = ?';
        db.query(sqlPasante, [usuario, password], (err, resPasante) => {
            if (resPasante.length > 0) {
                const p = resPasante[0];
                return res.json({ 
                    id: p.id, 
                    role: 'Pasante', // Force role for this table
                    name: `${p.nombres} ${p.apellidos}`,
                    usuario: p.usuario,
                    estado: p.estado,
                    docHojaVida: p.doc_hoja_vida,
                    // ... other necessary fields
                });
            }
            return res.status(401).json({ error: 'Credenciales inválidas' });
        });
    });
});

// --- ATTENDANCE TRACKING ROUTES (REQUIRED FOR SEGURIDAD) ---

// 1. Get today's attendance status
app.get('/asistencia/hoy/:id', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT tipo_evento, fecha_hora FROM registros_asistencia 
                 WHERE pasante_id = ? AND DATE(fecha_hora) = CURDATE()`;
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// 2. Register attendance event (Timbrar)
app.post('/timbrar', (req, res) => {
    const { pasanteId, tipoEvento, guardia } = req.body;

    console.log(`⏱️ New clock-in attempt: ${tipoEvento} for Pasante ID ${pasanteId}`);

    // A. Verify intern status
    db.query('SELECT * FROM pasantes WHERE id = ?', [pasanteId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'Pasante no encontrado' });
        
        const pasante = results[0];

        // Security Lock
        if (pasante.estado && (pasante.estado.includes('Finalizado') || pasante.estado === 'No habilitado')) {
            return res.status(400).json({ error: `Pasante bloqueado: ${pasante.estado}` });
        }

        const ahora = new Date();
        let nuevoAtraso = 0;
        let mensajeAtraso = "";

        // B. Delay Logic
        if (tipoEvento === 'entrada') {
            const horaEntradaLimite = new Date(ahora);
            horaEntradaLimite.setHours(8, 15, 0); 

            if (ahora > horaEntradaLimite) {
                nuevoAtraso = 1;
                mensajeAtraso = "Llegada tardía (+15 min)";
            }
        } 
        else if (tipoEvento === 'entrada_almuerzo') {
            db.query(`SELECT fecha_hora FROM registros_asistencia 
                      WHERE pasante_id = ? AND tipo_evento = 'salida_almuerzo' 
                      AND DATE(fecha_hora) = CURDATE() ORDER BY id DESC LIMIT 1`, 
            [pasanteId], (err, rows) => {
                if (!err && rows.length > 0) {
                    const salidaAlmuerzo = new Date(rows[0].fecha_hora);
                    const diferenciaMinutos = (ahora - salidaAlmuerzo) / 1000 / 60;
                    if (diferenciaMinutos > 40) actualizarAtrasos(pasante, 1);
                }
            });
        }

        // C. Insert Record
        const sqlInsert = 'INSERT INTO registros_asistencia (pasante_id, tipo_evento, guardia_responsable, fecha_hora) VALUES (?, ?, ?, ?)';
        db.query(sqlInsert, [pasanteId, tipoEvento, guardia, ahora], (err) => {
            if (err) return res.status(500).json({ error: "Error saving attendance" });

            if (nuevoAtraso > 0) actualizarAtrasos(pasante, 1);

            if (tipoEvento === 'salida') calcularHorasDia(pasanteId, ahora, res);
            else res.json({ message: 'Timbrado exitoso', alerta: mensajeAtraso });
        });
    });
});

// Helper Functions
function actualizarAtrasos(pasante, cantidad) {
    const nuevosAtrasos = (pasante.atrasos || 0) + cantidad;
    let nuevoEstado = pasante.estado;
    if (nuevosAtrasos > 5) nuevoEstado = "Finalizado por atrasos excedidos";
    db.query('UPDATE pasantes SET atrasos = ?, estado = ? WHERE id = ?', [nuevosAtrasos, nuevoEstado, pasante.id]);
}

function calcularHorasDia(pasanteId, horaSalida, res) {
    db.query(`SELECT tipo_evento, fecha_hora FROM registros_asistencia WHERE pasante_id = ? AND DATE(fecha_hora) = CURDATE()`, [pasanteId], (err, eventos) => {
        let entrada = null, salAlm = null, entAlm = null;
        eventos.forEach(e => {
            if(e.tipo_evento === 'entrada') entrada = new Date(e.fecha_hora);
            if(e.tipo_evento === 'salida_almuerzo') salAlm = new Date(e.fecha_hora);
            if(e.tipo_evento === 'entrada_almuerzo') entAlm = new Date(e.fecha_hora);
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

// --- STANDARD ROUTES ---

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
            fotoUrl: p.foto_url ? `http://localhost:3001/uploads/${p.foto_url}` : null,
            informeUrl: p.informe_url ? `http://localhost:3001/uploads/${p.informe_url}` : null,
            informeFinalSubido: !!p.informe_url,
            docHojaVida: p.doc_hoja_vida ? `http://localhost:3001/uploads/${p.doc_hoja_vida}` : null,
            docCartaSolicitud: p.doc_carta_solicitud ? `http://localhost:3001/uploads/${p.doc_carta_solicitud}` : null,
            docAcuerdoConfidencialidad: p.doc_acuerdo_confidencialidad ? `http://localhost:3001/uploads/${p.doc_acuerdo_confidencialidad}` : null,
            docCopiaCedula: p.doc_copia_cedula ? `http://localhost:3001/uploads/${p.doc_copia_cedula}` : null
        }));
        res.json(formateados);
    });
});

app.get('/pasantes/:id', (req, res) => {
    db.query('SELECT * FROM pasantes WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: 'No encontrado' });
        const p = results[0];
        res.json({ ...p, horasCompletadas: p.horas_completadas || 0, horasRequeridas: p.horas_requeridas || 0, fotoUrl: p.foto_url ? `http://localhost:3001/uploads/${p.foto_url}` : null });
    });
});

// CREATE INTERN
app.post('/pasantes', upload.single('foto'), (req, res) => {
    const body = req.body;
    let filename = req.file ? req.file.filename : null;
    if (!filename && body.fotoUrl && body.fotoUrl.startsWith('data:')) filename = saveBase64ToFile(body.fotoUrl, 'foto_perfil');

    const sql = `INSERT INTO pasantes (nombres, apellidos, cedula, fecha_nacimiento, institucion, carrera, dependencia, horas_requeridas, discapacidad, email, telefono, usuario, password, foto_url, fecha_registro, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [body.nombres, body.apellidos, body.cedula, body.fechaNacimiento, body.institucion, body.carrera, body.dependencia, body.horasRequeridas, body.discapacidad, body.email, body.telefono, body.usuario, body.password, filename, new Date(), body.creadoPor || 'Sistema'];

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json({ message: 'Pasante creado', id: result.insertId });
    });
});

// UPDATE INTERN (PATCH)
app.patch('/pasantes/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;

    if (body.documentacionCompleta) {
        const doc1 = saveBase64ToFile(body.docHojaVida, 'hv');
        const doc2 = saveBase64ToFile(body.docCartaSolicitud, 'carta');
        const doc3 = saveBase64ToFile(body.docAcuerdoConfidencialidad, 'acuerdo');
        const doc4 = saveBase64ToFile(body.docCopiaCedula, 'cedula');
        let sql = "UPDATE pasantes SET estado = 'Activo', documentacion_completa = 1";
        const params = [];
        if (doc1) { sql += ", doc_hoja_vida = ?"; params.push(doc1); }
        if (doc2) { sql += ", doc_carta_solicitud = ?"; params.push(doc2); }
        if (doc3) { sql += ", doc_acuerdo_confidencialidad = ?"; params.push(doc3); }
        if (doc4) { sql += ", doc_copia_cedula = ?"; params.push(doc4); }
        sql += " WHERE id = ?"; params.push(id);
        
        db.query(sql, params, (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Docs guardados' });
        });
        return;
    }

    if (body.informeUrl && body.informeUrl.startsWith('data:')) {
        const filename = saveBase64ToFile(body.informeUrl, 'informe_final');
        return db.query("UPDATE pasantes SET informe_url = ? WHERE id = ?", [filename, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Informe subido' });
        });
    }

    const dbMap = { horasCompletadas: 'horas_completadas', horasRequeridas: 'horas_requeridas', llamadosAtencion: 'llamados_atencion' };
    const updates = []; const values = [];
    Object.keys(body).forEach(key => {
        if (['id', 'fotoUrl', 'informeUrl'].includes(key)) return;
        const dbCol = dbMap[key] || key;
        if (body[key] !== undefined) { updates.push(`${dbCol} = ?`); values.push(body[key]); }
    });
    if (updates.length === 0) return res.status(400).json({ message: 'Nada' });
    values.push(id);
    db.query(`UPDATE pasantes SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Actualizado' });
    });
});

app.delete('/pasantes/:id', (req, res) => {
    db.query('DELETE FROM pasantes WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Eliminado' });
    });
});

// CREATE USER (With Duplicate Check)
app.post('/usuarios', (req, res) => {
    const { nombres, apellidos, cedula, rol, usuario, password, estado } = req.body;
    
    db.query('INSERT INTO usuarios_admin (nombres, apellidos, cedula, rol, usuario, password, estado, fecha_registro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [nombres, apellidos, cedula, rol, usuario, password, estado, new Date()], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: `El usuario '${usuario}' ya existe. Edítalo manualmente.` });
            return res.status(500).json(err);
        }
        res.json({ message: 'User created', id: result.insertId });
    });
});

// Audit and User Routes
app.get('/auditoria', (req, res) => { 
    const sql = `(SELECT id, CONCAT(nombres, ' ', apellidos) as nombre, CONCAT('Pasante (Created by: ', COALESCE(creado_por, 'System'), ')') as rol, fecha_registro as fecha FROM pasantes) UNION (SELECT id, CONCAT(nombres, ' ', apellidos) as nombre, rol, fecha_registro as fecha FROM usuarios_admin) ORDER BY fecha DESC LIMIT 5`;
    db.query(sql, (err, results) => { if (err) return res.status(500).json(err); res.json(results); });
}); 
app.get('/usuarios', (req, res) => { db.query('SELECT * FROM usuarios_admin', (e, r) => res.json(r)); });

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server ready on port ${PORT}`);
    console.log(`📂 Uploads folder: ${uploadDirGlobal}`);
});