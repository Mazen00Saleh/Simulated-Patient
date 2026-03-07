"""api.database

Built-in SQLite database handler.
Using standard library sqlite3 to save disk space.
"""

import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parents[1] / "simulated_patient.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tables for Sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            condition TEXT NOT NULL,
            language TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table for Messages (The Memory)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            message_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (session_id)
        )
    ''')
    
    # Table for Evaluations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS evaluations (
            eval_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            eval_type TEXT NOT NULL, -- 'patient' or 'trainee'
            score_data TEXT NOT NULL,  -- JSON blob of the result
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (session_id)
        )
    ''')
    
    conn.commit()
    conn.close()

# CRUD Helpers
def save_session(session_id: str, condition: str, language: str):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO sessions (session_id, condition, language) VALUES (?, ?, ?)",
        (session_id, condition, language)
    )
    conn.commit()
    conn.close()

def add_message(session_id: str, role: str, content: str):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, role, content)
    )
    conn.commit()
    conn.close()

def get_session_history(session_id: str):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC",
        (session_id,)
    ).fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"]} for row in rows]

def get_session_info(session_id: str):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM sessions WHERE session_id = ?",
        (session_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return {k: row[k] for k in row.keys()}

def save_evaluation(session_id: str, eval_type: str, score_data: dict):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO evaluations (session_id, eval_type, score_data) VALUES (?, ?, ?)",
        (session_id, eval_type, json.dumps(score_data))
    )
    conn.commit()
    conn.close()

def delete_session_data(session_id: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM evaluations WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
