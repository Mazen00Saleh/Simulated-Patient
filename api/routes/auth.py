from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
import os

from api.postgres import get_db
from api.db_models import User
from api.models import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Auth"])
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=Token)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email, "is_admin": new_user.is_admin})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email, "is_admin": new_user.is_admin}
    }

@router.post("/login", response_model=Token)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": db_user.email, "is_admin": db_user.is_admin})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": db_user.id, "name": db_user.name, "email": db_user.email, "is_admin": db_user.is_admin}
    }
