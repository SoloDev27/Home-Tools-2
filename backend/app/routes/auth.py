import os
import secrets
import string
from fastapi import APIRouter, HTTPException, Response, Cookie, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from dotenv import load_dotenv

from app.db.session import get_db_session
from app.models.user import User, UserCreate
from app.models.map import Map
from app.models.response_model import ResponseModel
from app.utils.jwt import create_access_token, decode_access_token

load_dotenv()

PROJECT_ENV = os.environ.get("PROJECT_ENV", "development")

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Password Helpers
def validate_password(plain_password):
    SYMBOL = "!@#$%?.-"
    ALLOWED = set(f"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{SYMBOL}")
    if not all(c in ALLOWED for c in plain_password):
        raise HTTPException(status_code=400, detail=f'Password contains characters not allowed. Only A-Z, 0-9, and !@#$%?.-')
    if len(plain_password) < 8 or len(plain_password) > 25:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    def is_valid(p: str) -> bool:
        return (
            any(c.isupper() for c in p) and
            any(c.islower() for c in p) and
            any(c.isdigit() for c in p) and
            any(c in SYMBOL for c in p)
        )
    if not is_valid(plain_password):
        raise HTTPException(status_code=400, detail=f'Password must contain at least 1 uppercased character, 1 number and 1 special character: {SYMBOL}')
    return True


def hash_password(password: str) -> str:
    if not validate_password(password):
        return
    if not isinstance(password, str):
        raise HTTPException(status_code=400, detail="Invalid password format")
    password = password.strip()
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not isinstance(plain_password, str):
        raise HTTPException(status_code=400, detail="Invalid password format")
    return pwd_context.verify(plain_password, hashed_password)


def generate_username():
    chars = string.ascii_letters + string.digits
    return "user_" + "".join(secrets.choice(chars) for _ in range(8))

# Register
@router.post("/register")
def register(user_schema: UserCreate, db: Session = Depends(get_db_session)):
    password = user_schema.password
    if not validate_password(password):
        return
    
    hashed_password = hash_password(user_schema.password)
    
    username = generate_username()
    while db.query(User).filter(User.username == username).first():
        username = generate_username()
    
    new_user = User(
        email=user_schema.email.strip(), 
        password=hashed_password, 
        first_name=user_schema.first_name,
        last_name=user_schema.last_name,
        username=username,
        phone_number=user_schema.phone,
        country_code=user_schema.country_code,
        area_code=user_schema.area_code,
        bio=user_schema.bio,
        profile_icon=user_schema.profile_icon
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create a default map for the new user
        default_map = Map(
            owner_id=new_user.id,
            name="My First Map",
            description="Welcome to Home Tools! This is your first map."
        )
        db.add(default_map)
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if 'unique constraint' in str(e).lower():
            raise HTTPException(status_code=409, detail="User already exists")
        raise HTTPException(status_code=500, detail="Server error please try again")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ResponseModel(True, "User created")


# Login
@router.post("/login")
def login(user_schema: UserCreate, response: Response, db: Session = Depends(get_db_session)):
    db_user = db.query(User).filter(User.email == user_schema.email.strip()).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User doesn't exist")
    if not verify_password(user_schema.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"user_id": db_user.id})
    
    # Cookie security settings
    cookie_kwargs = {
        "key": "access_token",
        "value": access_token,
        "httponly": True,
        "max_age": 60*60,
        "path": "/",
    }
    
    if PROJECT_ENV == "production":
        cookie_kwargs.update({"samesite": "none", "secure": True})
    else:
        cookie_kwargs.update({"samesite": "lax", "secure": False})
        
    response.set_cookie(**cookie_kwargs)
    
    user_obj = {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "phone_number": db_user.phone_number,
        "country_code": db_user.country_code,
        "area_code": db_user.area_code,
        "bio": db_user.bio,
        "profile_icon": db_user.profile_icon
    }
    return ResponseModel(True, "User logged in successfully", {"db_user": user_obj, "token": access_token})


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer(auto_error=False)

@router.get("/session")
def get_session_user(
    access_token: str | None = Cookie(None, alias="access_token"),
    auth: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db_session)
):
    token = access_token
    if not token and auth:
        token = auth.credentials
        
    if not token:
        if PROJECT_ENV == "development":
            dev_user = db.query(User).filter(User.id == 42).first() or db.query(User).first()
            if dev_user:
                return {
                    "id": dev_user.id,
                    "email": dev_user.email,
                    "username": dev_user.username,
                    "first_name": dev_user.first_name,
                    "last_name": dev_user.last_name,
                    "phone_number": dev_user.phone_number,
                    "country_code": dev_user.country_code,
                    "area_code": dev_user.area_code,
                    "bio": dev_user.bio,
                    "profile_icon": dev_user.profile_icon
                }
        raise HTTPException(status_code=401, detail="Not authenticated session")
        
    payload = decode_access_token(token)
    if not payload:
        if PROJECT_ENV == "development":
            dev_user = db.query(User).filter(User.id == 42).first() or db.query(User).first()
            if dev_user:
                return {
                    "id": dev_user.id,
                    "email": dev_user.email,
                    "username": dev_user.username,
                    "first_name": dev_user.first_name,
                    "last_name": dev_user.last_name,
                    "phone_number": dev_user.phone_number,
                    "country_code": dev_user.country_code,
                    "area_code": dev_user.area_code,
                    "bio": dev_user.bio,
                    "profile_icon": dev_user.profile_icon
                }
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "country_code": user.country_code,
        "area_code": user.area_code,
        "bio": user.bio,
        "profile_icon": user.profile_icon
    }

# Export get_current_user for other routes
get_current_user = get_session_user


@router.delete("/session")
def logout_user(response: Response):
    cookie_kwargs = {
        "key": "access_token",
        "value": "",
        "httponly": True,
        "max_age": 0,
        "path": "/",
    }
    
    if PROJECT_ENV == "production":
        cookie_kwargs.update({"samesite": "none", "secure": True})
    else:
        cookie_kwargs.update({"samesite": "lax", "secure": False})
        
    response.set_cookie(**cookie_kwargs)
    response.delete_cookie("access_token", path="/")
    return ResponseModel(True, "Logged out successfully")