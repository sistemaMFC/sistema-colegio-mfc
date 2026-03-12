/* ========================================================
    MÓDULO DE REPORTES - COLEGIO MIGUEL FEBRES CORDERO
    Versión: Certificado de Matrícula Oficial
   ======================================================== */

// Función auxiliar para convertir nombres de cursos a formato extenso
function formatearNombreCurso(nombre) {
    const cursosMap = {
        "Inicial II": "SEGUNDO AÑO DE EDUCACIÓN INICIAL",
        "Primero EGB": "PRIMER AÑO DE EDUCACIÓN BÁSICA",
        "Segundo EGB": "SEGUNDO AÑO DE EDUCACIÓN BÁSICA",
        "Tercero EGB": "TERCER AÑO DE EDUCACIÓN BÁSICA",
        "Cuarto EGB": "CUARTO AÑO DE EDUCACIÓN BÁSICA",
        "Quinto EGB": "QUINTO AÑO DE EDUCACIÓN BÁSICA",
        "Sexto EGB": "SEXTO AÑO DE EDUCACIÓN BÁSICA",
        "Séptimo EGB": "SÉPTIMO AÑO DE EDUCACIÓN BÁSICA",
        "Octavo EGB": "OCTAVO AÑO DE EDUCACIÓN BÁSICA",
        "Noveno EGB": "NOVENO AÑO DE EDUCACIÓN BÁSICA",
        "Décimo EGB": "DÉCIMO AÑO DE EDUCACIÓN BÁSICA"
    };
    return cursosMap[nombre] || nombre.toUpperCase();
}

// Función para asegurar 10 dígitos en la cédula
function formatearCedula(cedula) {
    let c = String(cedula).trim();
    return c.length === 9 ? "0" + c : c;
}

// Función para calcular año lectivo automático (Corta en Agosto para el nuevo año)
function obtenerAnioLectivo() {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    if (hoy.getMonth() >= 3) { // De Abril en adelante (Ciclo Costa)
        return `${anioActual} - ${anioActual + 1}`;
    } else {
        return `${anioActual - 1} - ${anioActual}`;
    }
}

async function generarCertificadoMatricula(idEstudiante, nombreCursoCorto) {
    try {
        const est = await api(`/api/students/${idEstudiante}`);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const centro = 105;

        // 1. CARGAR LOGOS (Se asume que están en /img/)
        // Usamos una función promesa para cargar las imágenes antes de dibujar
        const cargarImagen = (url) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = url;
        });

        try {
            const logoMin = await cargarImagen('/img/Ministerio.png');
            const logoCol = await cargarImagen('/img/LOGO.jpeg');
            doc.addImage(logoMin, 'PNG', 15, 15, 40, 15); // Izquierda
            doc.addImage(logoCol, 'JPEG', 165, 12, 25, 25); // Derecha
        } catch (e) { console.warn("Logos no encontrados en /img/"); }

        // 2. ENCABEZADO
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("UNIDAD EDUCATIVA", centro, 25, { align: "center" });
        doc.text("EDUCACIÓN GENERAL BÁSICA", centro, 32, { align: "center" });
        doc.setFontSize(16);
        doc.text('"MIGUEL FEBRES CORDERO"', centro, 42, { align: "center" });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`AÑO LECTIVO: ${obtenerAnioLectivo()}`, centro, 50, { align: "center" });
        doc.text("JORNADA MATUTINA", centro, 56, { align: "center" });

        // 3. TÍTULO CENTRAL
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("CERTIFICADO DE MATRÍCULA", centro, 75, { align: "center" });

        // 4. CUERPO DEL TEXTO
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const cuerpo = `La suscrita Secretaría de la Unidad Educativa "MIGUEL FEBRES CORDERO", certifica que el/la estudiante:`;
        const splitCuerpo = doc.splitTextToSize(cuerpo, 165);
        doc.text(splitCuerpo, 22, 95);

        // NOMBRE RESALTADO
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`${est.apellidos_est} ${est.nombres_est}`.toUpperCase(), centro, 115, { align: "center" });

        // DATOS TÉCNICOS
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Cédula de Identidad: ${formatearCedula(est.cedula_est)}`, 22, 135);
        doc.text(`Se encuentra legalmente matriculado/a en:`, 22, 145);
        
        doc.setFont("helvetica", "bold");
        doc.text(formatearNombreCurso(nombreCursoCorto), centro, 155, { align: "center" });

        // FECHA EMISIÓN
        const hoy = new Date();
        const fechaTxt = `Guayaquil, ${hoy.getDate()} de ${hoy.toLocaleString('es-ES', { month: 'long' })} del ${hoy.getFullYear()}`;
        doc.setFont("helvetica", "italic");
        doc.text(fechaTxt, 22, 180);

        // 5. FIRMAS REQUERIDAS
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        
        // Línea Rectora
        doc.line(35, 235, 95, 235);
        doc.text("MSc. JESSICA VERA", 65, 240, { align: "center" });
        doc.text("RECTORA", 65, 245, { align: "center" });

        // Línea Secretario
        doc.line(115, 235, 175, 235);
        doc.text("JUAN PERALTA", 145, 240, { align: "center" });
        doc.text("SECRETARIO GENERAL", 145, 245, { align: "center" });

        // Borde final
        doc.setLineWidth(0.3);
        doc.rect(10, 10, 190, 277);

        window.open(doc.output('bloburl'), '_blank');

    } catch (err) {
        console.error(err);
        alert("Error al conectar con la base de datos.");
    }
}

window.generarCertificadoMatricula = generarCertificadoMatricula;