from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class SRPartBase(BaseModel):
    SR_NUMBER: str
    SERVICE_ACTIVITY: Optional[str] = None
    RNSN: Optional[str] = None
    QUANTITY_REQUIRED: Optional[float] = None
    PARTS_CHARGE: Optional[float] = None
    DOCUMENT_NUMBER: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class DueInBase(BaseModel):
    DOC_NBR: str
    DIC: Optional[str] = None
    NSN_ORDERED: Optional[str] = None
    SR_NUMBER: Optional[str] = None
    ESTABLISHED_DT: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SRHeaderBase(BaseModel):
    SR_NUMBER: str
    SERVICE_REQUEST_TYPE: Optional[str] = None
    DEFECT_CODE: Optional[str] = None
    PROBLEM_SUMMARY: Optional[str] = None
    DATE_RECEIVED_IN_SHOP: Optional[str] = None
    SERIAL_NUMBER: Optional[str] = None
    TAMCN: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SRHeader(SRHeaderBase):
    parts: List[SRPartBase] = []
    due_ins: List[DueInBase] = []
