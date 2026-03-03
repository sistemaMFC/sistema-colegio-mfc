import { pool } from '../db.js';

export const getEstadisticasCursos = async (req, res) => {
    try {
        // Consulta robusta: Cuenta estudiantes vinculados por curso_id
        const [rows] = await pool.query(`
            SELECT 
                c.id, 
                c.nombre, 
                COUNT(e.id) AS total_matriculados
            FROM cursos c
            LEFT JOIN estudiantes e ON c.id = e.curso_id
            GROUP BY c.id, c.nombre
            ORDER BY c.orden ASC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Error en getEstadisticasCursos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};