from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class SearchResultItem(BaseModel):
    id: int
    type: str 
    date: datetime
    subject: Optional[str] = None
    filename: Optional[str] = None
    title: Optional[str] = None
    snippet: str
    sender: Optional[str] = None
    owner: Optional[str] = None
    
class GlobalSearchResponse(BaseModel):
    query: str
    module: str
    data: Dict[str, List[SearchResultItem]]