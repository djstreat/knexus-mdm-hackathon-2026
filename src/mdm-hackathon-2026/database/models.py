from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class SRHeader(Base):
    __tablename__ = "sr_header"
    
    SR_NUMBER = Column(String, primary_key=True, index=True)
    SERVICE_REQUEST_TYPE = Column(String)
    DEFECT_CODE = Column(String)
    PROBLEM_SUMMARY = Column(String)
    DATE_RECEIVED_IN_SHOP = Column(String)
    ECHELON_OF_MAINT = Column(String)
    SERIAL_NUMBER = Column(String)
    TAMCN = Column(String)
    DEADLINED_DATE = Column(String)
    MASTER_PRIORITY_CODE = Column(String)
    OWNER_UNIT_ADDRESS_CODE = Column(String)
    JOB_STATUS_DATE = Column(String)

    # Relationships
    parts = relationship("SRPart", back_populates="header")
    due_ins = relationship("DueIn", back_populates="header")

class SRPart(Base):
    __tablename__ = "sr_parts"
    
    # Use existing columns as a composite primary key since 'id' doesn't exist
    SR_NUMBER = Column(String, ForeignKey("sr_header.SR_NUMBER"), primary_key=True)
    DOCUMENT_NUMBER = Column(String, primary_key=True)
    SERVICE_ACTIVITY = Column(String)
    RNSN = Column(String)
    QUANTITY_REQUIRED = Column(Float)
    PARTS_CHARGE = Column(Float)

    header = relationship("SRHeader", back_populates="parts")

class DueIn(Base):
    __tablename__ = "due_in"
    
    # Use DOC_NBR as primary key since 'id' doesn't exist
    DOC_NBR = Column(String, primary_key=True)
    DIC = Column(String)
    NSN_ORDERED = Column(String)
    PRI_CD = Column(String)
    PURPOSE_CD = Column(String)
    ESTABLISHED_DT = Column(String)
    SR_NUMBER = Column(String, ForeignKey("sr_header.SR_NUMBER"))
    TASK_NBR = Column(String)

    header = relationship("SRHeader", back_populates="due_ins")
