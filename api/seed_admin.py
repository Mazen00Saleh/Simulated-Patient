import uuid
import bcrypt
from sqlalchemy import text
from api.postgres import engine, SessionLocal
from api.db_models import User
from src.utils.logger import get_logger

logger = get_logger(__name__)

def seed_admin():
    db = SessionLocal()
    try:
        # 1. Add is_admin column if it doesn't exist
        logger.info("Checking for is_admin column...")
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;"))
            db.commit()
            logger.info("Added is_admin column to users table.")
        except Exception as e:
            db.rollback()
            if "already exists" in str(e):
                logger.info("is_admin column already exists.")
            else:
                logger.error(f"Error adding is_admin column: {e}")

        # 2. Create admin user
        admin_email = "admin@gmail.com"
        db_user = db.query(User).filter(User.email == admin_email).first()
        
        if db_user:
            logger.info(f"User {admin_email} already exists. Ensuring it has admin privileges.")
            db_user.is_admin = True
            db.commit()
        else:
            logger.info(f"Creating admin user: {admin_email}")
            hashed_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            new_user = User(
                name="admin",
                email=admin_email,
                hashed_password=hashed_password,
                is_admin=True
            )
            db.add(new_user)
            db.commit()
            logger.info("Admin user created successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
