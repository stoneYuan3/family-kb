const pool = require('../db/pool');
const { startOfWeek } = require('date-fns');

// import { PrismaClient } from "../prisma/generated/client";
// const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// const prisma = new PrismaClient({ adapter });

const getCurrentBoard = async (req, res) => {
    try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const board = await pool.query(
            'SELECT * FROM board WHERE week_start = $1', [weekStart]
        )
        const result = board.rows[0]
        console.log(result)
        console.log("|")
        if (!result) {
            const inserted = await pool.query(
                'INSERT INTO board (week_start) VALUES ($1) RETURNING id, week_start, created_at', [weekStart]
            )
            result = inserted.rows[0]
        }
        const marks = await pool.query(
            `SELECT id, color, data, is_taped FROM mark WHERE "board_id" = $1`, [result.id]
        )
        res.json({ board: result, marks: marks.rows })

        // alternatively, use prisma
        // const board = await prisma.user.upsert({
        //     where:  { week_start: weekStart },
        //     update: {},                          // nothing to change if it already exists
        //     create: { week_start: weekStart },
        //     select: { id: true, week_start: true },
        // });
        // res.json(board);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

const AddNewMarkForBoard = async (req, res) => {
    try {
        const { id, data, color } = req.body.body;
        // Light shape check — catches accidental frontend regressions.
        // `id` is a client-minted UUID; Postgres rejects non-UUIDs at insert time.
        if (typeof id !== 'string') {
            return res.status(400).json({ error: 'id required' });
        }
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: 'points required' });
        }
        if (typeof color !== 'string') {
            return res.status(400).json({ error: 'color required' });
        }
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const board = await pool.query(
            'SELECT id FROM board WHERE week_start = $1', [weekStart]
        )
        if (board.rows.length === 0) {
            return res.status(404).json({ error: 'No board for current week' });
        }
        const boardId = board.rows[0].id;
        const markResult = await pool.query(
            `INSERT INTO mark (id, board_id, color, data) VALUES ($1, $2, $3, $4) RETURNING id, color, data`,
            [id, boardId, color, { points: data }]
        );
        res.status(201).json(markResult.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    getCurrentBoard,
    AddNewMarkForBoard
};