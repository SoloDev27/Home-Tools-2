import os

# Set before importing the app: jwt.py refuses to start without SECRET_KEY, and
# session.py refuses without POSTGRES_URL. Defaults let `pytest` run with no
# environment preparation, while still honouring real values if provided.
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("POSTGRES_URL", "sqlite:///./test.db")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base, get_db_session
from app.routes.auth import get_current_user
from app.models.user import User
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TEST_USER = {
    "id": 1,
    "email": "test@example.com",
    "username": "test_user",
    "first_name": "Test",
    "last_name": "User",
    "phone_number": None,
    "country_code": None,
    "area_code": None,
    "bio": None,
    "profile_icon": None
}

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_current_user():
    return TEST_USER

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    existing = db.query(User).filter(User.id == 1).first()
    if not existing:
        from app.routes.auth import hash_password
        user = User(
            id=1, email="test@example.com", username="test_user",
            password=hash_password("TestPass123!"),
            first_name="Test", last_name="User"
        )
        db.add(user)
        db.commit()
    from app.models.map import Map
    existing_map = db.query(Map).filter(Map.id == 1).first()
    if not existing_map:
        test_map = Map(
            id=1,
            owner_id=1,
            name="Test Map",
            description="Default map for test"
        )
        db.add(test_map)
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    app.dependency_overrides[get_db_session] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}
