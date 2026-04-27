const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const login = async (req,res) => {
    try {
        const { email,password } = req.body;
        if(!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        } 
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        )
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);  
        if(!validPassword) {
            return res.status(401).json({error: 'Invalid credentials'})
        }
        const token = jwt.sign(
            {id: user.id, role: user.role},
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
  login,
};