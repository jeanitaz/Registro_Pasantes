import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';

import {
  Clock, LogOut,
  Briefcase, FileText,
  Upload, CheckCircle,
  Activity, Lock, Download, Loader2,
  ClipboardList,
  FileSpreadsheet,
  AlertTriangle, XCircle, ShieldAlert
} from 'lucide-react';
import '../styles/PasanteHome.css';

// LÍMITES DEFINIDOS POR REGLAMENTO
const LIMITES = {
  ATRASOS: 5,
  FALTAS: 3,
  LLAMADOS: 3
};

interface HistorialItem {
  fecha: string;
  tipo: string;
  detalle: string;
  estado: string;
}

interface PasanteData {
  id: string;
  nombre: string;
  nombres: string;
  apellidos: string;
  carrera: string;
  estado: string;
  horasRequeridas: number;
  horasCompletadas: number;
  faltas: number;
  atrasos: number;
  llamadosAtencion: number;
  historialReciente: HistorialItem[];
  informeSubido?: boolean;
  informeUrl?: string;
  fotoUrl?: string;
  cedula?: string;
  institucion?: string;
  delegado?: string;
}

const PasanteHome = () => {
  const navigate = useNavigate();
  const [pasante, setPasante] = useState<PasanteData | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cargarDatosEnTiempoReal = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        const localUser = JSON.parse(storedUser);

        // 1. Carga inicial desde caché (localStorage)
        setPasante({
          ...localUser,
          id: localUser.id,
          nombre: localUser.nombre || `${localUser.nombres} ${localUser.apellidos}`,
          horasCompletadas: localUser.horasCompletadas || 0,
          horasRequeridas: Number(localUser.horasRequeridas) || 0,
          faltas: localUser.faltas || 0,
          atrasos: localUser.atrasos || 0,
          llamadosAtencion: localUser.llamadosAtencion || 0,
          historialReciente: localUser.historialReciente || [],
          informeSubido: !!localUser.informeUrl,
          informeUrl: localUser.informeUrl,
          fotoUrl: localUser.fotoUrl // Intenta cargar foto del login
        });

        // 2. CONSULTAR AL SERVIDOR (Datos frescos y FOTO URL)
        try {
          const response = await fetch(`/api/pasantes/${localUser.id}`);
          if (response.ok) {
            const dataDB = await response.json();

            const datosActualizados = {
              ...localUser,
              ...dataDB,

              // Normalización de datos
              llamadosAtencion: dataDB.llamadosAtencion ?? dataDB.llamados_atencion ?? 0,
              horasCompletadas: dataDB.horasCompletadas ?? dataDB.horas_completadas ?? 0,
              nombre: `${dataDB.nombres} ${dataDB.apellidos}`,

              // Archivos e Imagen
              informeSubido: !!(dataDB.informeUrl || dataDB.informe_url),
              informeUrl: dataDB.informeUrl || dataDB.informe_url,

              // AQUÍ SE TRAE LA IMAGEN GUARDADA DEL SERVIDOR
              fotoUrl: dataDB.fotoUrl || dataDB.foto_url
            };

            setPasante(datosActualizados);
            localStorage.setItem('user', JSON.stringify(datosActualizados));
          }
        } catch (error) {
          console.error("Error sincronizando datos:", error);
        }
      } else {
        navigate('/login');
      }
    };

    cargarDatosEnTiempoReal();
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("¿Deseas cerrar tu sesión?")) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    }
  };

  const handleRegistroHoras = () => { navigate('/horas'); };
  const handleUploadClick = () => { fileInputRef.current?.click(); };

  const handleDownloadExcel = () => {
    if (!pasante) return;
    const tituloStyle = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center", vertical: "center" } };
    const labelStyle = { font: { bold: true, color: { rgb: "334155" } } };
    const headerTablaStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3B82F6" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "FFFFFF" } }, bottom: { style: "thin", color: { rgb: "FFFFFF" } }, right: { style: "thin", color: { rgb: "FFFFFF" } } } };
    const celdaStyle = { alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const celdaCentradaStyle = { alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const resumenHeaderStyle = { font: { bold: true, sz: 12, color: { rgb: "1E293B" } }, fill: { fgColor: { rgb: "F1F5F9" } }, border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } } };

    const wsData: any[] = [];
    wsData.push([{ v: "REPORTE DE ACTIVIDADES - PASANTÍAS", s: tituloStyle }, { v: "", s: tituloStyle }, { v: "", s: tituloStyle }, { v: "", s: tituloStyle }]);
    wsData.push([]);
    wsData.push([{ v: "Estudiante:", s: labelStyle }, { v: pasante.nombre }]);
    wsData.push([{ v: "Carrera:", s: labelStyle }, { v: pasante.carrera }]);
    wsData.push([{ v: "Estado:", s: labelStyle }, { v: pasante.estado }]);
    wsData.push([{ v: "Fecha de Reporte:", s: labelStyle }, { v: new Date().toLocaleDateString() }]);
    wsData.push([]);
    wsData.push([{ v: "FECHA", s: headerTablaStyle }, { v: "TIPO", s: headerTablaStyle }, { v: "DETALLE DE ACTIVIDAD", s: headerTablaStyle }, { v: "ESTADO", s: headerTablaStyle }]);

    if (pasante.historialReciente && pasante.historialReciente.length > 0) {
      pasante.historialReciente.forEach((item) => {
        wsData.push([{ v: item.fecha, s: celdaCentradaStyle }, { v: item.tipo, s: celdaCentradaStyle }, { v: item.detalle, s: celdaStyle }, { v: item.estado, s: celdaCentradaStyle }]);
      });
    } else {
      wsData.push([{ v: "No hay registros disponibles", s: celdaStyle }]);
    }

    wsData.push([]);
    const rowIndexResumen = wsData.length;
    wsData.push([{ v: "RESUMEN FINAL DE HORAS", s: resumenHeaderStyle }, { v: "", s: resumenHeaderStyle }]);
    wsData.push([{ v: "Meta Requerida:", s: labelStyle }, { v: `${pasante.horasRequeridas} hrs` }]);
    wsData.push([{ v: "Horas Completadas:", s: labelStyle }, { v: `${pasante.horasCompletadas} hrs` }]);
    wsData.push([{ v: "Porcentaje:", s: labelStyle }, { v: `${((pasante.horasCompletadas / pasante.horasRequeridas) * 100).toFixed(1)}%` }]);
    wsData.push([{ v: "Total Atrasos:", s: labelStyle }, { v: pasante.atrasos }]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 15 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: rowIndexResumen, c: 0 }, e: { r: rowIndexResumen, c: 1 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_InternApp_${pasante.nombre.replace(/\s+/g, '_')}.xlsx`);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pasante) {
      if (file.type !== 'application/pdf') { alert("❌ Error: Solo PDF."); return; }
      if (file.size > 5 * 1024 * 1024) { alert("❌ Archivo muy pesado (Máx 5MB)."); return; } // Límite aumentado

      setIsUploading(true);
      try {
        const base64Pdf = await convertToBase64(file);
        const response = await fetch(`/api/pasantes/${pasante.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ informeFinalSubido: true, informeUrl: base64Pdf })
        });

        if (response.ok) {
          alert(`✅ Archivo subido correctamente.`);
          const refreshResponse = await fetch(`/api/pasantes/${pasante.id}`);
          if (refreshResponse.ok) {
            const freshData = await refreshResponse.json();
            setPasante(prev => prev ? ({ ...prev, informeSubido: true, informeUrl: freshData.informeUrl }) : null);
          }
        } else { throw new Error("Error en BD"); }
      } catch (error) { alert("❌ Error al subir."); }
      finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    }
  };

  // 3. UPDATED REPORT GENERATION FUNCTION
  const handleGenerateFinalReport = async () => {
    if (!pasante?.id) {
      alert("Error: No se ha identificado al pasante.");
      return;
    }

    // 4. LÓGICA HÍBRIDA: Si hay delegado en BD, úsalo. Si no, ¡PREGUNTA!
    let nombreDelegado = pasante.delegado;

    if (!nombreDelegado) {
      nombreDelegado = window.prompt("⚠️ El sistema no tiene registrado un Tutor/Delegado para este pasante.\n\nPor favor, ingrese el nombre del Tutor Institucional / Delegado:", "Ing. Nombre Apellido") || "Tutor Institucional";
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita ventanas emergentes.");

    // Initial loading state
    const baseStructure = `
      <html>
      <head>
          <title>Informe Final - ${pasante.nombre}</title>
          <style>
              body { font-family: 'Arial', sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; color: #333; }
              .loading-container { display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: sans-serif; }
          </style>
      </head>
      <body>
          <div id="content" class="loading-container">
              <h3>Generando informe...</h3>
              <p>Por favor espere mientras recuperamos su historial.</p>
          </div>
      </body>
      </html>
    `;

    printWindow.document.write(baseStructure);
    printWindow.document.close();

    // Fetch History
    let fullHistory: any[] = [];
    try {
      console.log("Iniciando fetch de historial para:", pasante.id);
      const res = await fetch(`/api/asistencia?pasante_id=${pasante.id}`);

      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

      fullHistory = await res.json();
      fullHistory.sort((a: any, b: any) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    } catch (e: any) {
      console.error("Error generating report:", e);
      if (printWindow.document.body) {
        printWindow.document.body.innerHTML = `
           <div style="text-align:center; padding: 50px; font-family: sans-serif;">
             <h3 style="color:red;">Error al generar el reporte</h3>
             <p>${e.message || "No se pudo conectar con el servidor."}</p>
             <button onclick="window.close()">Cerrar</button>
           </div>
         `;
      }
      return;
    }

    // Build Final HTML with Logo
    const finalHtml = `
        <html>
      <head>
        <title>Informe Final - ${pasante.nombre}</title>
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
                padding: 40px;
                border: 1px solid #eee; 
            }
            @media print {
                .document-container { border: none; padding: 0; }
                body { margin: 0; }
            }

            /* --- ENCABEZADO CON IMAGEN --- */
            .header { 
                display: flex; 
                align-items: center; 
                justify-content: space-between;
                border-bottom: 3px solid #1a3a5a; 
                padding-bottom: 15px; 
                margin-bottom: 30px;
            }
            .header-logo img {
                max-height: 80px;
                width: auto;
                display: block;
            }
            .header-info { 
                text-align: right;
                flex: 1;
                margin-left: 20px;
            }
            .header-info h1 { 
                font-size: 16px; 
                margin: 0; 
                color: #1a3a5a; 
                text-transform: uppercase; 
                letter-spacing: 0.5px;
            }
            .header-info h2 { 
                font-size: 13px; 
                margin: 5px 0 0; 
                font-weight: normal; 
                color: #555; 
            }

            .title-section { text-align: center; margin-bottom: 30px; }
            .title-section h3 { font-size: 20px; text-decoration: underline; margin-bottom: 5px; color: #000; }
            .ref-number { font-size: 12px; color: #666; }
            
            .info-grid {
                display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px;
                margin-bottom: 30px; background-color: #f8fafc; padding: 20px;
                border-radius: 6px; border: 1px solid #e2e8f0;
            }
            .info-item { display: flex; flex-direction: column; }
            .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
            .info-value { font-size: 14px; color: #0f172a; font-weight: 500; }

            .certificate-text {
                font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify;
                line-height: 1.8; margin-bottom: 40px;
            }

            .history-section { margin-bottom: 40px; }
            .history-title { font-size: 14px; font-weight: bold; color: #1a3a5a; border-left: 4px solid #1a3a5a; padding-left: 10px; margin-bottom: 15px; }
            
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            tr:nth-child(even) td { background-color: #fcfcfc; }
            
            .signatures-container { display: flex; justify-content: space-between; margin-top: 80px; page-break-inside: avoid; }
            .signature-box { width: 40%; text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-bottom: 10px; width: 80%; margin-left: auto; margin-right: auto; }
            .signer-name { font-weight: bold; font-size: 13px; margin: 0; }
            .signer-role { font-size: 12px; color: #666; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="document-container">
            
            <div class="header">
                <div class="header-logo">
                    <img src="https://i.postimg.cc/j2p691mH/Captura-de-pantalla-2026-01-09-130055.png" alt="Logo Institucional" />
                </div>
            </div>

            <div class="title-section">
                <h3>INFORME FINAL DE CUMPLIMIENTO DE HORAS DE PASANTÍAS</h3>
            </div>

             <div class="info-grid">
                 <div class="info-item">
                    <span class="info-label">Estudiante</span>
                    <span class="info-value">${pasante.nombre}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Cédula de Identidad</span>
                    <span class="info-value">${pasante.cedula || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Institución Educativa</span>
                    <span class="info-value">${pasante.institucion || 'No Registrada'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Carrera / Especialidad</span>
                    <span class="info-value">${pasante.carrera}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Horas Requeridas</span>
                    <span class="info-value">${pasante.horasRequeridas} Horas</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Horas Ejecutadas</span>
                    <span class="info-value">${Number(pasante.horasCompletadas).toFixed(2)} Horas</span>
                </div>
            </div>

            <div class="certificate-text">
                <p>
                    Por medio del presente documento, se certifica que el/la estudiante <strong>${pasante.nombre}</strong>, portador/a del documento de identidad 
                    <strong>${pasante.cedula || 'N/A'}</strong>, ha completado satisfactoriamente el programa de prácticas pre-profesionales en esta institución.
                    Durante el periodo de ejecución, ha demostrado responsabilidad, puntualidad y compromiso en el desarrollo de las actividades asignadas, 
                    cumpliendo a cabalidad con el requisito académico de <strong>${pasante.horasRequeridas} horas</strong> de práctica.
                </p>
                <p>
                    Para constancia de lo actuado, y a petición de la parte interesada, se extiende el presente informe detallado con el registro de asistencia correspondiente.
                </p>
            </div>

            <div class="history-section">
                <div class="history-title">DETALLE DE REGISTRO DE ASISTENCIA</div>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Evento</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fullHistory.slice(0, 50).map((h: any) => `
                            <tr>
                                <td>${new Date(h.fecha_hora).toLocaleDateString()}</td>
                                <td>${new Date(h.fecha_hora).toLocaleTimeString()}</td>
                                <td>${h.tipo_evento ? h.tipo_evento.replace('_', ' ').toUpperCase() : 'EVENTO'}</td>
                                <td><span style="font-size:10px; background:#f0fdf4; color:#166534; padding:2px 6px; border-radius:4px; font-weight:bold;">REGISTRADO</span></td>
                            </tr>
                        `).join('')}
                        ${fullHistory.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay registros de asistencia disponibles.</td></tr>' : ''}
                    </tbody>
                </table>
                ${fullHistory.length > 50 ? `<div style="text-align:center; font-size:11px; color:#666; margin-top:10px;">... Se muestran los primeros 50 registros por brevedad ...</div>` : ''}
            </div>

            <div class="signatures-container">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p class="signer-name">${nombreDelegado}</p>
                    <p class="signer-role">Tutor Institucional / Delegado</p>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p class="signer-name">${pasante.nombre}</p>
                    <p class="signer-role">Estudiante / Practicante</p>
                    <p class="signer-role" style="font-size: 10px;">C.I: ${pasante.cedula || 'N/A'}</p>
                </div>
            </div>
        </div>
      </body>
      </html>
    `;

    if (printWindow.document.body) {
      printWindow.document.body.innerHTML = finalHtml;
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 800);
    }
  };

  if (!pasante) return <div className="loading-screen">Cargando perfil...</div>;

  const porcentaje = pasante.horasRequeridas > 0 ? Math.min((pasante.horasCompletadas / pasante.horasRequeridas) * 100, 100) : 0;
  const esCompletado = porcentaje >= 100;
  const tieneFoto = pasante.fotoUrl && pasante.fotoUrl.startsWith('http');
  const estaEnRiesgo = pasante.atrasos >= LIMITES.ATRASOS - 1 || pasante.faltas >= LIMITES.FALTAS - 1;
  const estaFinalizadoMal = pasante.estado.includes("Finalizado por");
  const getBarColor = (val: number, max: number) => { if (val >= max) return 'bg-red-500'; if (val >= max - 1) return 'bg-yellow-500'; return 'bg-blue-500'; };

  return (
    <div className="layout-wrapper">
      <aside className="modern-sidebar">
        <div className="sidebar-header">
          <div className="logo-box"><Briefcase size={24} /></div>
          <span className="logo-text">InternApp</span>
        </div>
        <div className="nav-links">
          <button className="nav-item active"><div className="nav-icon"><Activity size={20} /></div><span>Dashboard</span></button>
          <button onClick={handleRegistroHoras} className="nav-item"><div className="nav-icon"><ClipboardList size={20} /></div><span>Registro de Horas</span></button>
          <button onClick={handleLogout} className="nav-item logout-item"><div className="nav-icon"><LogOut size={20} /></div><span>Cerrar Sesión</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="top-header">
          <div>
            <h1>Hola, {pasante.nombre.split(' ')[0]} 👋</h1>
            <p className="subtitle">Resumen de tu pasantía en {pasante.carrera}</p>
          </div>
          <div className="profile-pill">
            <div className={`status-dot ${estaFinalizadoMal ? 'dot-red' : 'dot-green'}`}></div>
            <span>{pasante.estado || "Activo"}</span>
            <div className="avatar-circle" style={{ overflow: 'hidden', padding: tieneFoto ? 0 : undefined, border: tieneFoto ? '2px solid #e2e8f0' : 'none' }}>
              {tieneFoto ? (
                <img src={pasante.fotoUrl} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                pasante.nombre.charAt(0)
              )}
            </div>
          </div>
        </header>

        {(estaEnRiesgo || estaFinalizadoMal) && (
          <div className={`risk-banner ${estaFinalizadoMal ? 'banner-critical' : 'banner-warning'}`}>
            {estaFinalizadoMal ? <XCircle size={24} /> : <ShieldAlert size={24} />}
            <div className="banner-content">
              <h4>{estaFinalizadoMal ? "Pasantía Interrumpida" : "Atención Requerida"}</h4>
              <p>{estaFinalizadoMal ? `Estado: ${pasante.estado}. Comunícate con tu supervisor.` : "Estás cerca de alcanzar el límite permitido de faltas o atrasos."}</p>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="left-column-stack">
            <div className="card hero-card">
              <div className="hero-content">
                <h3>Progreso General</h3>
                <p>Has completado el <strong>{porcentaje.toFixed(1)}%</strong> de tus horas.</p>
                <div className="stats-row">
                  <div className="stat-item"><span className="label">Completadas</span><span className="value">{pasante.horasCompletadas}h</span></div>
                  <div className="stat-separator">/</div>
                  <div className="stat-item"><span className="label">Meta</span><span className="value">{pasante.horasRequeridas}h</span></div>
                </div>
              </div>
              <div className="circular-chart-wrapper">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${porcentaje}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="percentage-text">
                  {esCompletado ? <CheckCircle size={32} color="#10b981" /> : <Clock size={32} color="#6366f1" />}
                </div>
              </div>
            </div>

            <div className="card discipline-card">
              <div className="card-header-row"><h3>Estado Disciplinario</h3><AlertTriangle size={18} className="text-gray-400" /></div>
              <div className="discipline-bars">
                <div className="discipline-item">
                  <div className="bar-header"><span>Atrasos</span><span className={pasante.atrasos >= LIMITES.ATRASOS ? 'text-red-500' : ''}>{pasante.atrasos} / {LIMITES.ATRASOS}</span></div>
                  <div className="bar-track"><div className={`bar-fill ${getBarColor(pasante.atrasos, LIMITES.ATRASOS)}`} style={{ width: `${Math.min((pasante.atrasos / LIMITES.ATRASOS) * 100, 100)}%` }}></div></div>
                </div>
                <div className="discipline-item">
                  <div className="bar-header"><span>Faltas</span><span className={pasante.faltas >= LIMITES.FALTAS ? 'text-red-500' : ''}>{pasante.faltas} / {LIMITES.FALTAS}</span></div>
                  <div className="bar-track"><div className={`bar-fill ${getBarColor(pasante.faltas, LIMITES.FALTAS)}`} style={{ width: `${Math.min((pasante.faltas / LIMITES.FALTAS) * 100, 100)}%` }}></div></div>
                </div>
                <div className="discipline-item">
                  <div className="bar-header"><span>Llamados de Atención</span><span className={pasante.llamadosAtencion >= LIMITES.LLAMADOS ? 'text-red-500' : ''}>{pasante.llamadosAtencion} / {LIMITES.LLAMADOS}</span></div>
                  <div className="bar-track"><div className={`bar-fill ${getBarColor(pasante.llamadosAtencion, LIMITES.LLAMADOS)}`} style={{ width: `${Math.min((pasante.llamadosAtencion / LIMITES.LLAMADOS) * 100, 100)}%` }}></div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-column-stack">
            <div className="card list-card">
              <div className="card-header-row"><h3>Actividad Reciente</h3></div>
              <div className="activity-list">
                {pasante.historialReciente && pasante.historialReciente.map((item, idx) => (
                  <div key={idx} className="activity-item">
                    <div className={`activity-dot ${item.estado}`}></div>
                    <div className="activity-info"><span className="act-type">{item.tipo}</span><span className="act-detail">{item.detalle}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card actions-card-modern">
              <div className="card-header-row"><h3>Gestión de Cierre</h3></div>
              <div className="modern-actions-container">
                <div className="action-panel" onClick={handleDownloadExcel} style={{ cursor: 'pointer', border: '1px solid #22c55e', backgroundColor: '#f0fdf4' }}>
                  <div className="panel-icon"><FileSpreadsheet size={24} style={{ color: '#16a34a' }} /></div>
                  <div className="panel-content"><h4 style={{ color: '#15803d' }}>Reporte de Horas</h4><p>Descargar Excel detallado.</p></div>
                  <button className="panel-btn-icon"><Download size={20} style={{ color: '#16a34a' }} /></button>
                </div>

                <div className="action-panel secondary-panel" onClick={handleGenerateFinalReport} style={{ cursor: 'pointer' }}>
                  <div className="panel-icon"><FileText size={24} className="text-blue-500" /></div>
                  <div className="panel-content"><h4>Plantilla de Informe</h4><p>Descarga el formato oficial.</p></div>
                  <button className="panel-btn-icon"><Download size={20} /></button>
                </div>

                <div className={`action-panel ${esCompletado ? 'primary-panel' : 'locked-panel'}`}>
                  <div className="panel-icon">{esCompletado ? <Upload size={24} className="text-green-500" /> : <Lock size={24} className="text-gray-400" />}</div>
                  <div className="panel-content"><h4>Subir Informe Final</h4><p>{pasante.informeSubido ? "¡Informe enviado!" : esCompletado ? "Sube tu informe." : "Completa tus horas."}</p></div>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf" onChange={handleFileChange} />
                  {esCompletado && !pasante.informeSubido ? (
                    <button className="panel-btn-text" onClick={handleUploadClick} disabled={isUploading}>
                      {isUploading ? <><Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} /> Subiendo...</> : "Subir PDF"}
                    </button>
                  ) : pasante.informeSubido ? (
                    <div className="panel-status-badge" style={{ color: '#10b981', background: '#ecfdf5' }}>Enviado</div>
                  ) : (
                    <div className="panel-status-badge">Bloqueado</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PasanteHome;