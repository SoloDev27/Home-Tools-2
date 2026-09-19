import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from jose.exceptions import JWTError

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set. Refusing to start: generating a random key here "
        "would silently invalidate every issued token on each restart and across "
        "workers, and different processes would reject each other's tokens. "
        "Set SECRET_KEY in the environment (see .env.example)."
    )

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
)


def create_access_token(data: dict) -> str:
    encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    encode.update({"exp": expire})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        # Development convenience: an expired token still resolves, so a long
        # editing session is not interrupted. Never enabled outside development.
        if os.getenv("PROJECT_ENV", "development") == "development":
            try:
                return jwt.decode(
                    token, SECRET_KEY, algorithms=[ALGORITHM],
                    options={"verify_exp": False}
                )
            except JWTError:
                pass
        return None