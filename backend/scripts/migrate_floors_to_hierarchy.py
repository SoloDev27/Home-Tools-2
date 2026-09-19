import os
import sys
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine, SessionLocal
from app.models.property import Property, HierarchySchema, FloorNodeSchema, RoomSchema
from app.models.floor import Floor
from app.models.user import User
from app.models.image import Image
from app.models.home_group import HomeGroup
from app.models.point import Point
from app.models.saved_types import SavedType
from app.models.settings import Settings

def migrate():
    db = SessionLocal()
    try:
        properties = db.query(Property).all()
        print(f"Found {len(properties)} properties to migrate.")

        for prop in properties:
            if prop.hierarchy:
                print(f"Skipping Property {prop.id} - Hierarchy already exists.")
                continue

            floors = db.query(Floor).filter(Floor.property_id == prop.id).order_by(Floor.id).all()
            
            floors_data = []
            for floor in floors:
                rooms = []
                if floor.bedrooms:
                    for i in range(floor.bedrooms):
                        rooms.append(RoomSchema(id=f"room-mig-{floor.id}-b{i}", name=f"Bedroom {i+1}"))
                if floor.bathrooms:
                    for i in range(floor.bathrooms):
                        rooms.append(RoomSchema(id=f"room-mig-{floor.id}-ba{i}", name=f"Bathroom {i+1}"))
                
                # Check for extra_rooms (assuming it might be a CSV or JSON)
                if floor.extra_rooms:
                    # Generic handling
                    rooms.append(RoomSchema(id=f"room-mig-{floor.id}-extra", name=str(floor.extra_rooms)))

                floors_data.append(FloorNodeSchema(
                    id=f"floor-mig-{floor.id}",
                    name=floor.name,
                    dimensions=None,
                    notes=[],
                    rooms=rooms
                ))

            hierarchy = HierarchySchema(
                dimensions=None,
                notes=[],
                floors=floors_data
            )

            prop.hierarchy = hierarchy
            print(f"Migrated Property {prop.id}: {len(floors)} floors consolidated.")

        db.commit()
        print("Migration committed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
