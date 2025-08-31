const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./job_portal.db');

// Create tables
db.serialize(() => {
  // Users table (both employees and students)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employee profiles
  db.run(`CREATE TABLE IF NOT EXISTS employee_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    industry TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Student profiles
  db.run(`CREATE TABLE IF NOT EXISTS student_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    university TEXT NOT NULL,
    qualifications TEXT,
    experience TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Jobs table
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    job_type TEXT NOT NULL,
    industry TEXT NOT NULL,
    location TEXT,
    requirements TEXT,
    salary TEXT,
    google_form_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES users (id)
  )`);

  // Applications table
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs (id),
    FOREIGN KEY (student_id) REFERENCES users (id)
  )`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/register', async (req, res) => {
  const { email, password, userType, profileData } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)',
      [email, hashedPassword, userType], function(err) {
        if (err) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        
        const userId = this.lastID;
        
        if (userType === 'employee') {
          db.run('INSERT INTO employee_profiles (user_id, company_name, contact_person, industry) VALUES (?, ?, ?, ?)',
            [userId, profileData.companyName, profileData.contactPerson, profileData.industry], (err) => {
              if (err) {
                return res.status(400).json({ error: 'Failed to create employee profile' });
              }
              res.json({ message: 'Employee registered successfully' });
            });
        } else {
          db.run('INSERT INTO student_profiles (user_id, first_name, last_name, university) VALUES (?, ?, ?, ?)',
            [userId, profileData.firstName, profileData.lastName, profileData.university], (err) => {
              if (err) {
                return res.status(400).json({ error: 'Failed to create student profile' });
              }
              res.json({ message: 'Student registered successfully' });
            });
        }
      });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, userType: user.user_type }, JWT_SECRET);
    res.json({ token, userType: user.user_type });
  });
});

// Profile routes
app.get('/api/profile', authenticateToken, (req, res) => {
  if (req.user.userType === 'employee') {
    db.get(`SELECT u.email, ep.* FROM users u 
            JOIN employee_profiles ep ON u.id = ep.user_id 
            WHERE u.id = ?`, [req.user.id], (err, profile) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(profile);
    });
  } else {
    db.get(`SELECT u.email, sp.* FROM users u 
            JOIN student_profiles sp ON u.id = sp.user_id 
            WHERE u.id = ?`, [req.user.id], (err, profile) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(profile);
    });
  }
});

app.put('/api/profile', authenticateToken, (req, res) => {
  if (req.user.userType === 'student') {
    const { qualifications, experience } = req.body;
    db.run('UPDATE student_profiles SET qualifications = ?, experience = ? WHERE user_id = ?',
      [qualifications, experience, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        res.json({ message: 'Profile updated successfully' });
      });
  }
});

// Job routes
app.post('/api/jobs', authenticateToken, (req, res) => {
  if (req.user.userType !== 'employee') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { title, description, jobType, industry, location, requirements, salary, googleFormLink } = req.body;
  
  db.run('INSERT INTO jobs (employer_id, title, description, job_type, industry, location, requirements, salary, google_form_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, description, jobType, industry, location, requirements, salary, googleFormLink], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      res.json({ message: 'Job created successfully', jobId: this.lastID });
    });
});

app.get('/api/jobs', (req, res) => {
  const { search, industry, jobType } = req.query;
  let query = `SELECT j.*, ep.company_name, j.employer_id FROM jobs j 
               JOIN employee_profiles ep ON j.employer_id = ep.user_id`;
  let params = [];
  let conditions = [];
  
  if (search) {
    conditions.push('(j.title LIKE ? OR j.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (industry) {
    conditions.push('j.industry = ?');
    params.push(industry);
  }
  
  if (jobType) {
    conditions.push('j.job_type = ?');
    params.push(jobType);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY j.created_at DESC';
  
  db.all(query, params, (err, jobs) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(jobs);
  });
});

app.get('/api/my-jobs', authenticateToken, (req, res) => {
  if (req.user.userType !== 'employee') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db.all('SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC', [req.user.id], (err, jobs) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(jobs);
  });
});

app.delete('/api/jobs/:id', authenticateToken, (req, res) => {
  if (req.user.userType !== 'employee') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const jobId = req.params.id;
  
  // First, delete applications for the job, then delete the job
  db.serialize(() => {
    db.run('DELETE FROM applications WHERE job_id = ?', [jobId], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to delete job applications' });
      }
    });

    db.run('DELETE FROM jobs WHERE id = ? AND employer_id = ?', [jobId, req.user.id], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to delete job' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Job not found or you do not have permission to delete it' });
      }
      res.json({ message: 'Job and associated applications deleted successfully' });
    });
  });
});

// Application routes
app.post('/api/apply', authenticateToken, (req, res) => {
  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { jobId } = req.body;
  
  // Check if already applied
  db.get('SELECT * FROM applications WHERE job_id = ? AND student_id = ?', 
    [jobId, req.user.id], (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'Already applied for this job' });
      }
      
      db.run('INSERT INTO applications (job_id, student_id) VALUES (?, ?)',
        [jobId, req.user.id], function(err) {
          if (err) return res.status(500).json({ error: 'Server error' });
          res.json({ message: 'Application submitted successfully' });
        });
    });
});

app.get('/api/my-applications', authenticateToken, (req, res) => {
  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db.all(`SELECT a.*, j.title, j.job_type, ep.company_name 
          FROM applications a 
          JOIN jobs j ON a.job_id = j.id 
          JOIN employee_profiles ep ON j.employer_id = ep.user_id 
          WHERE a.student_id = ? ORDER BY a.applied_at DESC`, [req.user.id], (err, applications) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(applications);
  });
});

app.get('/api/job-applications/:jobId', authenticateToken, (req, res) => {
  if (req.user.userType !== 'employee') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { jobId } = req.params;
  
  db.all(`SELECT a.*, sp.first_name, sp.last_name, sp.university, sp.qualifications, sp.experience, a.student_id 
          FROM applications a 
          JOIN student_profiles sp ON a.student_id = sp.user_id 
          WHERE a.job_id = ? ORDER BY a.applied_at DESC`, [jobId], (err, applications) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(applications);
  });
});

app.put('/api/applications/:id/status', authenticateToken, (req, res) => {
  if (req.user.userType !== 'employee') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE applications SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'Application status updated' });
  });
});

app.get('/api/employee-profile/:id', (req, res) => {
  db.get('SELECT company_name, contact_person, industry FROM employee_profiles WHERE user_id = ?', [req.params.id], (err, profile) => {
    if (err || !profile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    res.json(profile);
  });
});

app.get('/api/student-profile/:id', (req, res) => {
  db.get('SELECT first_name, last_name, university, qualifications, experience FROM student_profiles WHERE user_id = ?', [req.params.id], (err, profile) => {
    if (err || !profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    res.json(profile);
  });
});

// MongoDB Job Schema
const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
  },
  industry: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: false,
  },
  requirements: {
    type: String,
    required: false,
  },
  salary: {
    type: String,
    required: false,
  },
  googleFormLink: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});