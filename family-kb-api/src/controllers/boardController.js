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
        if(!result) {
            const inserted = await pool.query(
                'INSERT INTO board (week_start) VALUES ($1) RETURNING id, week_start, created_at', [weekStart]
            )
            result = inserted.rows[0]      
        }
        console.log(result)
        res.json(result)

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

const AddNewMarkForBoard = async (req,res) => {
    try {
        console.log(req.body)
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
  getCurrentBoard,
  AddNewMarkForBoard
};