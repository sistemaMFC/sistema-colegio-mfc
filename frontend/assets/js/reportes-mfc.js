/* ========================================================
    MÓDULO DE GENERACIÓN DE PDF - COLEGIO MFC
    Diseño oficial de Certificado de Matrícula
   ======================================================== */

async function generarCertificadoMatricula(idEstudiante, nombreCurso) {
    try {
        // 1. Obtener los datos reales del estudiante desde el servidor
        const est = await api(`/api/students/${idEstudiante}`);

        // 2. Inicializar jsPDF (Formato A4, vertical)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // --- CONFIGURACIÓN DE ESTILO ---
        const margenIzquierdo = 25;
        const centroPagina = 105;
        doc.setFont("helvetica");

        // --- 1. MARCO DECORATIVO ---
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277); // Un recuadro que rodea toda la hoja

        // --- 2. ENCABEZADO ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("UNIDAD EDUCATIVA FISCOMISIONAL", centroPagina, 30, { align: "center" });
        doc.setFontSize(20);
        doc.text('"MARÍA DE FÁTIMA"', centroPagina, 40, { align: "center" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Guayaquil - Ecuador", centroPagina, 46, { align: "center" });

        // --- 3. TÍTULO DEL DOCUMENTO ---
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("CERTIFICADO DE MATRÍCULA", centroPagina, 65, { align: "center" });
        
        doc.setFontSize(12);
        doc.text(`AÑO LECTIVO: ${est.periodo || '2025 - 2026'}`, centroPagina, 72, { align: "center" });

        // --- 4. CUERPO DEL TEXTO (NARRATIVA) ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        
        const textoCuerpo = `La suscrita Secretaría de la Unidad Educativa Fiscomisional "MARÍA DE FÁTIMA", certifica que el/la estudiante:`;
        
        // Ajustamos el texto al ancho de la página
        const splitCuerpo = doc.splitTextToSize(textoCuerpo, 160);
        doc.text(splitCuerpo, margenIzquierdo, 90);

        // NOMBRE DEL ESTUDIANTE (Grande y Negrita)
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`${est.apellidos_est} ${est.nombres_est}`, centroPagina, 105, { align: "center" });

        // DETALLES ADICIONALES
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Con cédula de identidad número:  ${est.cedula_est}`, margenIzquierdo, 120);
        doc.text(`Se encuentra legalmente matriculado/a en:`, margenIzquierdo, 130);
        
        // EL CURSO
        doc.setFont("helvetica", "bold");
        doc.text(`${nombreCurso.toUpperCase()}`, centroPagina, 140, { align: "center" });

        // FECHA DE MATRÍCULA (Dato real de la DB)
        const fechaMat = est.fecha_matricula ? new Date(est.fecha_matricula).toLocaleDateString() : '---';
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha de ingreso al sistema: ${fechaMat}`, margenIzquierdo, 155);

        // --- 5. LUGAR Y FECHA DE EMISIÓN ---
        const hoy = new Date();
        const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
        const fechaHoy = hoy.toLocaleDateString('es-ES', opciones);
        
        doc.text(`Guayaquil, ${fechaHoy}`, margenIzquierdo, 175);

        // --- 6. ÁREA DE FIRMAS ---
        doc.line(40, 230, 90, 230); // Línea Rector
        doc.line(120, 230, 170, 230); // Línea Secretario
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("RECTOR(A)", 65, 235, { align: "center" });
        doc.text("SECRETARIO(A)", 145, 235, { align: "center" });

        // --- 7. FINALIZAR Y ABRIR ---
        // Generamos el PDF como un objeto URL para abrirlo en pestaña nueva
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');

    } catch (err) {
        console.error("Error al generar PDF:", err);
        alert("❌ Error: No se pudo obtener la información del estudiante.");
    }
}

// Hacer la función visible para view-cursos.js
window.generarCertificadoMatricula = generarCertificadoMatricula;