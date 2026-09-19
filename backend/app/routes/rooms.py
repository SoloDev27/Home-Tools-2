from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db_session
from app.models.room import Room, RoomSchema
from app.models.floor import Floor
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("/{id}/all")
def get_rooms_by_floor_id(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    floor = db.query(Floor).filter(Floor.id == id, Floor.owner_id == current_user["id"]).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    rooms = db.query(Room).filter(Room.floor_id == id).all()
    return ResponseModel(True, "", {"rooms": rooms})

@router.post("")
def create_room(room_schema: RoomSchema, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    try:
        new_room = Room(
            floor_id=room_schema.floor_id,
            type=room_schema.type,
            name=room_schema.name,
            length=room_schema.length,
            width=room_schema.width,
            height=room_schema.height,
            position=room_schema.position
        )
        db.add(new_room)
        db.commit()
        db.refresh(new_room)
        return ResponseModel(True, "Room created", {"room": new_room})
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{id}")
def edit_room(id: int, room_schema: RoomSchema, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    room = db.query(Room).join(Floor, Room.floor_id == Floor.id).filter(Room.id == id, Floor.owner_id == current_user["id"]).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    try:
        update_data = room_schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(room, key, value)
        db.commit()
        db.refresh(room)
        return ResponseModel(True, "Room updated", {"room": room})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{id}")
def delete_room(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    room = db.query(Room).join(Floor, Room.floor_id == Floor.id).filter(Room.id == id, Floor.owner_id == current_user["id"]).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    try:
        db.delete(room)
        db.commit()
        return ResponseModel(True, "Room deleted")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
