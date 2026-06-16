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
  AlertTriangle, XCircle, ShieldAlert,
  Award, CalendarClock, AlertOctagon
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

const formatDecimalToTime = (decimalHours: number | string | undefined): string => {
  if (decimalHours === undefined || decimalHours === null || decimalHours === '') return '0h 00m';
  const num = Number(decimalHours);
  if (isNaN(num)) return '0h 00m';
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
};

const PasanteHome = () => {
  const navigate = useNavigate();
  const [pasante, setPasante] = useState<PasanteData | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS PARA EL MODAL DE FINALIZACIÓN ---
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number>(5);
  const [modalClosedThisSession, setModalClosedThisSession] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // --- FUNCIÓN HELPER: CALCULAR DÍAS HÁBILES (Lunes a Viernes) ---
  const addBusinessDays = (startDate: Date, days: number) => {
    let count = 0;
    const curDate = new Date(startDate);
    while (count < days) {
        curDate.setDate(curDate.getDate() + 1);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; // 0=Domingo, 6=Sábado
    }
    return curDate;
  };

  const getBusinessDaysDiff = (endDate: Date) => {
    const now = new Date();
    // Normalizar a media noche para comparación justa
    now.setHours(0,0,0,0);
    const target = new Date(endDate);
    target.setHours(0,0,0,0);

    if (now > target) return -1; // Ya pasó

    let count = 0;
    const curDate = new Date(now);
    while (curDate < target) {
        curDate.setDate(curDate.getDate() + 1);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  };

  useEffect(() => {
    const cargarDatosEnTiempoReal = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        const localUser = JSON.parse(storedUser);

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
          fotoUrl: localUser.fotoUrl 
        });

        try {
          const response = await fetch(`/api/pasantes/${localUser.id}`);
          if (response.ok) {
            const dataDB = await response.json();

            const datosActualizados = {
              ...localUser,
              ...dataDB,
              llamadosAtencion: dataDB.llamadosAtencion ?? dataDB.llamados_atencion ?? 0,
              horasCompletadas: dataDB.horasCompletadas ?? dataDB.horas_completadas ?? 0,
              nombre: `${dataDB.nombres} ${dataDB.apellidos}`,
              informeSubido: !!(dataDB.informeUrl || dataDB.informe_url),
              informeUrl: dataDB.informeUrl || dataDB.informe_url,
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

  // --- EFECTO: DETECTAR COMPLETITUD Y GESTIONAR PLAZO ---
  useEffect(() => {
    if (pasante && !modalClosedThisSession) {
        const horasC = Number(pasante.horasCompletadas);
        const horasR = Number(pasante.horasRequeridas);
        
        // Si completó las horas Y NO ha subido el informe
        if (horasR > 0 && horasC >= horasR && !pasante.informeSubido) {
            
            // 1. Verificar si ya tenemos una fecha límite guardada para este usuario
            const storageKey = `deadline_reporte_${pasante.id}`;
            let deadlineStr = localStorage.getItem(storageKey);
            let deadlineDate;

            if (!deadlineStr) {
                // PRIMERA VEZ QUE LLEGA AL 100%: Definir fecha límite (Hoy + 5 días hábiles)
                deadlineDate = addBusinessDays(new Date(), 5);
                localStorage.setItem(storageKey, deadlineDate.toISOString());
            } else {
                deadlineDate = new Date(deadlineStr);
            }

            // 2. Calcular cuántos días faltan hoy
            const diasLeft = getBusinessDaysDiff(deadlineDate);
            setDiasRestantes(diasLeft);

            // 3. Mostrar el modal siempre (mientras no suba el PDF)
            setShowCompletionModal(true);
        }
    }
  }, [pasante, modalClosedThisSession]);

  const closeCompletionModal = () => {
      setModalClosedThisSession(true); // Se cierra solo por esta sesión
      setShowCompletionModal(false);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleRegistroHoras = () => { navigate('/horas'); };
  const handleUploadClick = () => { fileInputRef.current?.click(); };

  const handleDownloadExcel = () => {
    if (!pasante) return;
    
    // --- ESTILOS ---
    const fontName = "Segoe UI";
    
    const borderStyle = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    };

    const tituloStyle = { 
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: fontName }, 
      fill: { fgColor: { rgb: "1E3A8A" } }, // Azul Marino
      alignment: { horizontal: "center", vertical: "center" } 
    };

    const labelStyle = { 
      font: { bold: true, color: { rgb: "1E293B" }, name: fontName, sz: 10 },
      fill: { fgColor: { rgb: "F8FAFC" } },
      border: borderStyle,
      alignment: { vertical: "center", horizontal: "left" }
    };

    const valorInfoStyle = {
      font: { name: fontName, sz: 10, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F8FAFC" } },
      border: borderStyle,
      alignment: { vertical: "center", horizontal: "left" }
    };

    const headerTablaStyle = { 
      font: { bold: true, color: { rgb: "FFFFFF" }, name: fontName, sz: 11 }, 
      fill: { fgColor: { rgb: "1E3A8A" } }, 
      alignment: { horizontal: "center", vertical: "center" }, 
      border: { 
        top: { style: "thin", color: { rgb: "94A3B8" } }, 
        bottom: { style: "medium", color: { rgb: "1E3A8A" } }, 
        left: { style: "thin", color: { rgb: "94A3B8" } }, 
        right: { style: "thin", color: { rgb: "94A3B8" } } 
      } 
    };

    const celdaStyle = { 
      font: { name: fontName, sz: 10, color: { rgb: "334155" } },
      alignment: { horizontal: "left", vertical: "center" }, 
      border: borderStyle 
    };

    const celdaCentradaStyle = { 
      font: { name: fontName, sz: 10, color: { rgb: "334155" } },
      alignment: { horizontal: "center", vertical: "center" }, 
      border: borderStyle 
    };

    const celdaZebraStyle = { 
      font: { name: fontName, sz: 10, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F8FAFC" } },
      alignment: { horizontal: "left", vertical: "center" }, 
      border: borderStyle 
    };

    const celdaZebraCentradaStyle = { 
      font: { name: fontName, sz: 10, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F8FAFC" } },
      alignment: { horizontal: "center", vertical: "center" }, 
      border: borderStyle 
    };

    const resumenHeaderStyle = { 
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" }, name: fontName }, 
      fill: { fgColor: { rgb: "1E3A8A" } }, 
      alignment: { horizontal: "center", vertical: "center" }
    };

    const wsData: any[] = [];
    wsData.push([{ v: "REPORTE DE ACTIVIDADES - INAMHI", s: tituloStyle }, { v: "", s: tituloStyle }, { v: "", s: tituloStyle }, { v: "", s: tituloStyle }]);
    wsData.push([]);
    wsData.push([{ v: "Estudiante:", s: labelStyle }, { v: pasante.nombre, s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([{ v: "Carrera:", s: labelStyle }, { v: pasante.carrera, s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([{ v: "Estado:", s: labelStyle }, { v: pasante.estado, s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([{ v: "Fecha de Reporte:", s: labelStyle }, { v: new Date().toLocaleDateString(), s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([]);
    wsData.push([{ v: "FECHA", s: headerTablaStyle }, { v: "TIPO", s: headerTablaStyle }, { v: "DETALLE DE ACTIVIDAD", s: headerTablaStyle }, { v: "ESTADO", s: headerTablaStyle }]);

    if (pasante.historialReciente && pasante.historialReciente.length > 0) {
      pasante.historialReciente.forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        const currentStyleText = isEven ? celdaZebraStyle : celdaStyle;
        const currentStyleCenter = isEven ? celdaZebraCentradaStyle : celdaCentradaStyle;
        
        const estadoLower = String(item.estado || '').toLowerCase();
        let styleEstado: any = currentStyleCenter;
        if (estadoLower.includes("aprobado") || estadoLower.includes("completado") || estadoLower === "activo" || estadoLower === "validado") {
          styleEstado = {
            font: { name: fontName, sz: 10, bold: true, color: { rgb: "166534" } },
            fill: { fgColor: { rgb: "DCFCE7" } }, 
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle
          };
        } else if (estadoLower.includes("pendiente") || estadoLower.includes("proceso") || estadoLower.includes("almuerzo") || estadoLower.includes("revisión")) {
          styleEstado = {
            font: { name: fontName, sz: 10, bold: true, color: { rgb: "854D0E" } },
            fill: { fgColor: { rgb: "FEF9C3" } }, 
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle
          };
        } else if (estadoLower.includes("rechazado") || estadoLower.includes("falta") || estadoLower.includes("atraso") || estadoLower.includes("finalizado")) {
          styleEstado = {
            font: { name: fontName, sz: 10, bold: true, color: { rgb: "991B1B" } },
            fill: { fgColor: { rgb: "FEE2E2" } }, 
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle
          };
        }

        wsData.push([
          { v: item.fecha, s: currentStyleCenter }, 
          { v: item.tipo, s: currentStyleCenter }, 
          { v: item.detalle, s: currentStyleText }, 
          { v: item.estado, s: styleEstado }
        ]);
      });
    } else {
      wsData.push([{ v: "No hay registros disponibles", s: celdaStyle }, { v: "", s: celdaStyle }, { v: "", s: celdaStyle }, { v: "", s: celdaStyle }]);
    }

    wsData.push([]);
    const rowIndexResumen = wsData.length;
    wsData.push([{ v: "RESUMEN FINAL DE HORAS", s: resumenHeaderStyle }, { v: "", s: resumenHeaderStyle }, { v: "", s: resumenHeaderStyle }, { v: "", s: resumenHeaderStyle }]);
    wsData.push([{ v: "Meta Requerida:", s: labelStyle }, { v: `${pasante.horasRequeridas} hrs`, s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([{ v: "Horas Completadas:", s: labelStyle }, { v: formatDecimalToTime(pasante.horasCompletadas), s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([{ v: "Porcentaje:", s: labelStyle }, { v: `${((pasante.horasCompletadas / pasante.horasRequeridas) * 100).toFixed(1)}%`, s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);
    wsData.push([{ v: "Total Atrasos:", s: labelStyle }, { v: pasante.atrasos, s: valorInfoStyle }, { v: "", s: valorInfoStyle }, { v: "", s: valorInfoStyle }]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 15 }];
    
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, 
      { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } }, 
      { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } }, 
      { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } }, 
      { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } }, 
      { s: { r: rowIndexResumen, c: 0 }, e: { r: rowIndexResumen, c: 3 } }
    ];

    for (let i = 1; i <= 4; i++) {
      ws['!merges'].push({ s: { r: rowIndexResumen + i, c: 1 }, e: { r: rowIndexResumen + i, c: 3 } });
    }

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D1');
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 32 }; 
    ws['!rows'][1] = { hpt: 12 }; 
    for (let r = 2; r <= 5; r++) ws['!rows'][r] = { hpt: 22 }; 
    ws['!rows'][6] = { hpt: 12 }; 
    ws['!rows'][7] = { hpt: 26 }; 
    
    for (let r = 8; r <= range.e.r; r++) {
      if (r === rowIndexResumen) {
        ws['!rows'][r] = { hpt: 26 }; 
      } else {
        ws['!rows'][r] = { hpt: 20 }; 
      }
    }

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
      if (file.size > 5 * 1024 * 1024) { alert("❌ Archivo muy pesado (Máx 5MB)."); return; } 

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
            setShowCompletionModal(false); // Cerrar el modal permanentemente si lo suben
          }
        } else { throw new Error("Error en BD"); }
      } catch (error) { alert("❌ Error al subir."); }
      finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    }
  };

  const handleGenerateFinalReport = async () => {
    if (!pasante?.id) { alert("Error: No se ha identificado al pasante."); return; }
    let nombreDelegado = pasante.delegado;
    if (!nombreDelegado) {
      nombreDelegado = window.prompt("⚠️ El sistema no tiene registrado un Tutor/Delegado.\n\nIngrese nombre del Tutor:", "Ing. Nombre Apellido") || "Tutor Institucional";
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita ventanas emergentes.");

    const baseStructure = `<html><head><title>Informe Final</title><style>body{font-family:Arial;padding:40px;text-align:center;}</style></head><body><h3>Generando informe...</h3></body></html>`;
    printWindow.document.write(baseStructure);
    printWindow.document.close();

    let fullHistory: any[] = [];
    try {
      const res = await fetch(`/api/asistencia?pasante_id=${pasante.id}`);
      if (!res.ok) throw new Error("Error server");
      fullHistory = await res.json();
      fullHistory.sort((a: any, b: any) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    } catch (e: any) { return; }

    const finalHtml = `
        <html>
      <head>
        <title>Informe Final - ${pasante.nombre}</title>
        <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 0; }
            .document-container { padding: 40px; border: 1px solid #eee; }
            @media print { .document-container { border: none; padding: 0; } body { margin: 0; } }
            
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a3a5a; padding-bottom: 15px; margin-bottom: 30px; }
            .header-logo img { max-height: 80px; width: auto; }
            .title-section { text-align: center; margin-bottom: 30px; }
            .title-section h3 { font-size: 20px; text-decoration: underline; margin-bottom: 5px; color: #000; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; margin-bottom: 30px; background-color: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .info-item { display: flex; flex-direction: column; }
            .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
            .info-value { font-size: 14px; color: #0f172a; font-weight: 500; }
            
            .certificate-text { font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; line-height: 1.8; margin-bottom: 40px; }
            .history-title { font-size: 14px; font-weight: bold; color: #1a3a5a; border-left: 4px solid #1a3a5a; padding-left: 10px; margin-bottom: 15px; }
            
            /* --- TABLAS --- */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 11px; 
                table-layout: fixed; 
            }
            th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            
            /* --- CAJA IRROMPIBLE --- */
            .caja-fuerte {
                page-break-inside: avoid; 
                break-inside: avoid;
                width: 100%;
            }
            
            /* --- FIRMAS ALINEADAS --- */
            .signatures-container { 
                display: flex; 
                justify-content: space-between; 
                /* CAMBIO CLAVE: alinear desde arriba para que la línea negra quede a la misma altura en ambas */
                align-items: flex-start; 
                width: 100%;
                margin-top: 50px; 
                padding: 0 40px; 
                box-sizing: border-box;
            }
            .signature-box { 
                width: 42%; /* Ligeramente más ancho para evitar que nombres largos se rompan en dos líneas */
                text-align: center; 
            }
            .signature-line { 
                border-top: 1px solid #000; 
                margin-bottom: 10px; /* Separación consistente debajo de la línea */
                width: 100%; 
            }
            .signer-name { 
                font-weight: bold; 
                font-size: 13px; 
                margin: 0 0 4px 0; /* Margen inferior uniforme */
                color: #222; 
            }
            .signer-role { 
                font-size: 12px; 
                color: #555; 
                margin: 0; 
                font-style: italic; 
            }
            .signer-cedula {
                font-size: 10px; 
                color: #555;
                margin-top: 4px;
                display: block; /* Asegura que caiga en una nueva línea limpia */
            }
        </style>
      </head>
      <body>
        <div class="document-container">
            <div class="header"><div class="header-logo"><img src="https://i.postimg.cc/j2p691mH/Captura-de-pantalla-2026-01-09-130055.png" alt="Logo" /></div></div>
            <div class="title-section"><h3>INFORME FINAL DE CUMPLIMIENTO DE HORAS</h3></div>
             <div class="info-grid">
                 <div class="info-item"><span class="info-label">Estudiante</span><span class="info-value">${pasante.nombre}</span></div>
                <div class="info-item"><span class="info-label">Cédula</span><span class="info-value">${pasante.cedula || 'N/A'}</span></div>
                <div class="info-item"><span class="info-label">Institución</span><span class="info-value">${pasante.institucion || 'No Registrada'}</span></div>
                <div class="info-item"><span class="info-label">Carrera</span><span class="info-value">${pasante.carrera}</span></div>
                <div class="info-item"><span class="info-label">Horas Requeridas</span><span class="info-value">${pasante.horasRequeridas} Horas</span></div>
                <div class="info-item"><span class="info-label">Horas Ejecutadas</span><span class="info-value">${formatDecimalToTime(pasante.horasCompletadas)}</span></div>
            </div>
            <div class="certificate-text">
                <p>Por medio del presente documento, se certifica que el/la estudiante <strong>${pasante.nombre}</strong> con CI <strong>${pasante.cedula || 'N/A'}</strong>, ha completado satisfactoriamente <strong>${pasante.horasRequeridas} horas</strong> de práctica.</p>
            </div>
            
            <div class="history-section">
                <div class="history-title">DETALLE DE ASISTENCIA</div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 20%;">Fecha</th>
                            <th style="width: 25%;">Hora</th>
                            <th style="width: 35%;">Evento</th>
                            <th style="width: 20%;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fullHistory.slice(0, -4).map((h: any) => `<tr><td>${new Date(h.fecha_hora).toLocaleDateString()}</td><td>${new Date(h.fecha_hora).toLocaleTimeString()}</td><td>${h.tipo_evento ? h.tipo_evento.replace('_', ' ').toUpperCase() : 'EVENTO'}</td><td>REGISTRADO</td></tr>`).join('')}
                    </tbody>
                </table>
                
                <div class="caja-fuerte">
                    <table>
                        <colgroup>
                            <col style="width: 20%;">
                            <col style="width: 25%;">
                            <col style="width: 35%;">
                            <col style="width: 20%;">
                        </colgroup>
                        <tbody>
                            ${fullHistory.slice(-4).map((h: any) => `<tr><td>${new Date(h.fecha_hora).toLocaleDateString()}</td><td>${new Date(h.fecha_hora).toLocaleTimeString()}</td><td>${h.tipo_evento ? h.tipo_evento.replace('_', ' ').toUpperCase() : 'EVENTO'}</td><td>REGISTRADO</td></tr>`).join('')}
                        </tbody>
                    </table>
                    
                    <div class="signatures-container">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <p class="signer-name">${nombreDelegado}</p>
                            <p class="signer-role">Tutor Institucional</p>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <p class="signer-name">${pasante.nombre}</p>
                            <p class="signer-role">Estudiante</p>
                            <span class="signer-cedula">C.I: ${pasante.cedula || 'N/A'}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </body>
      </html>`;

    if (printWindow.document.body) {
      printWindow.document.body.innerHTML = finalHtml;
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 800);
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
            {/* --- IMAGEN CON FALLBACK A TEXTO --- */}
            <div className="avatar-circle" style={{ overflow: 'hidden', padding: 0, border: '2px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {pasante.fotoUrl ? (
                <img 
                    src={pasante.fotoUrl} 
                    alt="Perfil" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerText = pasante.nombre.charAt(0);
                            e.currentTarget.parentElement.style.padding = '8px'; // Restaurar padding para texto
                        }
                    }}
                />
              ) : (
                <span style={{ padding: '8px' }}>{pasante.nombre.charAt(0)}</span>
              )}
            </div>
            {/* ----------------------------------- */}
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
                  <div className="stat-item"><span className="label">Completadas</span><span className="value">{formatDecimalToTime(pasante.horasCompletadas)}</span></div>
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
            <div className="card actions-card-modern">
              <div className="card-header-row"><h3>Gestión de Cierre</h3></div>
              <div className="modern-actions-container">
                <div className="action-panel excel-panel" onClick={handleDownloadExcel} style={{ cursor: 'pointer' }}>
                  <div className="panel-icon"><FileSpreadsheet size={24} /></div>
                  <div className="panel-content"><h4>Reporte de Horas</h4><p>Descargar Excel detallado.</p></div>
                  <button className="panel-btn-icon"><Download size={20} /></button>
                </div>

                <div className="action-panel pdf-panel" onClick={handleGenerateFinalReport} style={{ cursor: 'pointer' }}>
                  <div className="panel-icon"><FileText size={24} /></div>
                  <div className="panel-content"><h4>Informe Final Cumplimiento Horas</h4><p>Presiona aquí para descargarlo.</p></div>
                  <button className="panel-btn-icon"><Download size={20} /></button>
                </div>

                <div className={`action-panel ${esCompletado ? 'upload-active-panel' : 'locked-panel'}`}>
                  <div className="panel-icon">
                    {esCompletado ? <Upload size={24} /> : <Lock size={24} />}
                  </div>
                  <div className="panel-content">
                    <h4>Subir Informe Final</h4>
                    <p>{pasante.informeSubido ? "¡Informe enviado!" : esCompletado ? "Sube tu informe." : "Completa tus horas."}</p>
                  </div>
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

      {/* --- MODAL DE FELICITACIONES Y RECORDATORIO DE 5 DÍAS --- */}
      {showLogoutModal && (
        <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <div className="modal-glass" style={{ textAlign: 'center', maxWidth: '400px', padding: '30px', borderTop: '5px solid #6366f1', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                <div style={{ margin: '0 auto 15px auto', width: '60px', height: '60px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                    <LogOut size={30} />
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#1e293b', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    ¿Cerrar Sesión?
                </h3>
                <p style={{ color: '#64748b', marginBottom: '25px', lineHeight: '1.5' }}>
                    ¿Estás seguro de que deseas salir de tu cuenta? Tendrás que iniciar sesión de nuevo.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => setShowLogoutModal(false)}
                        style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmLogout} 
                        style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <div className="modal-glass" style={{ textAlign: 'center', maxWidth: '400px', padding: '30px', borderTop: `5px solid ${diasRestantes <= 2 ? '#ef4444' : '#22c55e'}`, background: 'white' }}>
                <div style={{ margin: '0 auto 15px auto', width: '70px', height: '70px', borderRadius: '50%', background: diasRestantes <= 2 ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {diasRestantes <= 0 ? <AlertOctagon size={40} className="text-red-600" /> : <Award size={40} className={diasRestantes <= 2 ? 'text-red-600' : 'text-green-600'} />}
                </div>
                
                {diasRestantes > 0 ? (
                    <>
                        <h3 style={{ fontSize: '1.5rem', color: diasRestantes <= 2 ? '#b91c1c' : '#166534', margin: '0 0 10px 0' }}>
                            ¡Meta Alcanzada!
                        </h3>
                        <p style={{ color: '#4b5563', marginBottom: '20px', lineHeight: '1.5' }}>
                            Has completado tus horas. Tienes un plazo de <strong>5 días laborales</strong> para entregar tu informe.
                        </p>
                        <div style={{ background: diasRestantes <= 2 ? '#fef2f2' : '#f0f9ff', padding: '15px', borderRadius: '8px', border: `1px solid ${diasRestantes <= 2 ? '#fca5a5' : '#bae6fd'}`, marginBottom: '25px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <CalendarClock size={24} className={diasRestantes <= 2 ? 'text-red-600' : 'text-blue-600'} style={{ flexShrink: 0 }} />
                                <div>
                                    <strong style={{ color: diasRestantes <= 2 ? '#991b1b' : '#0369a1', display: 'block' }}>Tiempo Restante:</strong>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#334155' }}>
                                        {diasRestantes} {diasRestantes === 1 ? 'día laboral' : 'días laborales'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 style={{ fontSize: '1.5rem', color: '#b91c1c', margin: '0 0 10px 0' }}>
                            ¡Plazo Vencido!
                        </h3>
                        <p style={{ color: '#4b5563', marginBottom: '20px', lineHeight: '1.5' }}>
                            El tiempo para subir tu informe ha finalizado. Por favor, comunícate con Talento Humano inmediatamente.
                        </p>
                    </>
                )}

                <button 
                    onClick={closeCompletionModal} 
                    style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                >
                    Entendido
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default PasanteHome;