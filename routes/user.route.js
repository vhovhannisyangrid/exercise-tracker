const express = require('express');
const router = express.Router();
const db = require('../database/database');

const validateDate = (date) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date && !dateRegex.test(date)) {
        return { error: 'Date must be in YYYY-MM-DD format' };
    }
    const validDate = new Date(date);
    if (date && isNaN(validDate.getTime())) {
        return { error: 'Invalid date, must be a valid date in YYYY-MM-DD format' };
    }
    return { validDate: validDate || new Date() };
};

const checkUserExists = (userId, callback) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], callback);
};

const createExercise = (userId, description, duration, date, callback) => {
    db.run(
        'INSERT INTO exercise (userId, description, duration, date) VALUES (?, ?, ?, ?)',
        [userId, description, duration, date],
        callback
    );
};

router.post('/users', (req, res) => {
    let { username } = req.body;
    username = username?.trim();

    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        db.run('INSERT INTO users (username) VALUES (?)', [username], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create user' });
            }
            res.status(201).json({ message: 'User created', response: { _id: this.lastID, username } });
        });
    });
});

router.get('/users', (_, res) => {
    db.all('SELECT * FROM users', (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        return res.status(200).json({ message: 'Success', response: row });
    });
});

router.post('/users/:_id/exercises', (req, res) => {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'Description is required and must be a non-empty string' });
    }

    const trimmedDescription = description.trim();

    if (!duration || isNaN(duration) || duration <= 0) {
        return res.status(400).json({ error: 'Duration is required and must be a positive integer' });
    }

    const { validDate, error } = validateDate(date);
    if (error) {
        return res.status(400).json({ error });
    }

    const formattedDate = validDate.toISOString().split('T')[0];

    checkUserExists(_id, (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        createExercise(_id, trimmedDescription, duration, formattedDate, function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create exercise' });
            }

            res.status(201).json({
                userId: user.id,
                exerciseId: this.lastID,
                description: trimmedDescription,
                duration: duration,
                date: formattedDate
            });
        });
    });
});

router.get('/users/:_id/logs', (req, res) => {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const { error } = validateDate(from) || validateDate(to);
    if (error) {
        return res.status(400).json({ error });
    }

    let validLimit = 100;
    if (limit) {
        if (isNaN(limit) || limit <= 0 || limit > 1000) {
            return res.status(400).json({ error: 'Limit must be a positive integer and no more than 1000' });
        }
        validLimit = parseInt(limit);
    }

    checkUserExists(_id, (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let query = 'SELECT id, description, duration, date FROM exercise WHERE userId = ?';
        let params = [_id];

        if (from) {
            query += ' AND date >= ?';
            params.push(from);
        }

        if (to) {
            query += ' AND date <= ?';
            params.push(to);
        }

        query += ' ORDER BY date ASC';

        if (validLimit) {
            query += ' LIMIT ?';
            params.push(validLimit);
        }

        db.all(query, params, (err, logs) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            const formattedLogs = logs.map(log => ({
                description: log.description,
                duration: log.duration,
                date: log.date
            }));

            res.json({
                userId: user.id,
                username: user.username,
                count: formattedLogs.length,
                logs: formattedLogs
            });
        });
    });
});

module.exports = router;
