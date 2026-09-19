import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.property import Property, HierarchySchema, DimensionSchema, NoteSchema, FloorNodeSchema
from app.models.user import User
from app.models.image import Image
from app.models.floor import Floor
from app.models.home_group import HomeGroup
from app.models.point import Point
from app.models.saved_types import SavedType
from app.models.settings import Settings

from app.models.map import Map

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    from app.routes.auth import hash_password
    existing_user = db.query(User).filter(User.id == 1).first()
    if not existing_user:
        user = User(
            id=1, email="test@example.com", username="test_user",
            password=hash_password("TestPass123!"),
            first_name="Test", last_name="User"
        )
        db.add(user)
        db.commit()
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
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_hierarchy_crud(db):
    # 1. Create a hierarchy object
    h = HierarchySchema(
        dimensions=DimensionSchema(h=10, w=20, l=30, sqft=600),
        notes=[NoteSchema(id="n1", type="compiled", title="Header", content="Content")],
        floors=[
            FloorNodeSchema(
                id="f1",
                name="First Floor",
                rooms=[]
            )
        ]
    )
    
    # 2. Save property
    prop = Property(
        owner_id=1,
        map_id=1,
        name="Test Home",
        lat=0,
        lng=0,
        hierarchy=h
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    
    # 3. Verify
    assert prop.hierarchy.dimensions.h == 10
    assert len(prop.hierarchy.floors) == 1
    assert prop.hierarchy.floors[0].name == "First Floor"
    
    # 4. Update
    from sqlalchemy.orm.attributes import flag_modified
    h_updated = prop.hierarchy
    h_updated.floors[0].name = "Renamed Floor"
    prop.hierarchy = h_updated
    flag_modified(prop, "hierarchy")
    db.commit()
    db.refresh(prop)
    
    assert prop.hierarchy.floors[0].name == "Renamed Floor"
