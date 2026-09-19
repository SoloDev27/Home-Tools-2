from typing import Any, Optional

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel


class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict[str, Any]] = None

    def __init__(
        self,
        success: bool,
        message: str,
        data: Optional[dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        # Route modules construct this positionally throughout the codebase
        # (e.g. ResponseModel(True, "", {"property": prop})); accept that style
        # while still being a real Pydantic model so responses have a schema.
        #
        # Routes routinely put raw SQLAlchemy rows inside ``data``; encode them
        # here the same way FastAPI would so the model can serialize them.
        super().__init__(
            success=success,
            message=message,
            data=jsonable_encoder(data) if data is not None else None,
            **kwargs,
        )
