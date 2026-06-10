from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional

class ChatUserBase(BaseModel):
    id: int
    name: str
    email: str
    profile_image: Optional[str] = None
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserDisplay(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image: Optional[str] = None
    initials: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserStatusResponse(BaseModel):
    user_id: int
    is_online: bool
    last_seen: Optional[datetime] = None 
    
    model_config = ConfigDict(from_attributes=True)  

class UserActivityRead(ChatUserBase):
    is_online: bool = False
    status: str = "online"

    model_config = ConfigDict(from_attributes=True)
    
class ForwardRequest(BaseModel):
    target_room_id: int    
    
class ChatRoomUpdateRequest(BaseModel):
    name: str    
    
class AttachmentDetail(BaseModel):
    id: int
    url: str
    filename: str
    file_type: str
    
    model_config = ConfigDict(from_attributes=True)

class ReactionRead(BaseModel):
    emoji: str
    count: int
    user_emails: List[str]
    
class TextMessageCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None
    mention_ids: Optional[List[int]] = Field(default_factory=list)
    is_forwarded: bool = False
    
class MessageRead(BaseModel):
    id: int
    room_id: Optional[int] = None
    room_name: Optional[str] = "Private Chat"
    sender_email: str
    sender_first_name: Optional[str] = None
    sender_last_name: Optional[str] = None

    content: Optional[str] = None
    attachments: List[AttachmentDetail] = []
    timestamp: datetime

    read_count: int = 0
    is_starred: bool = False
    is_pinned: bool = False
    is_saved: bool = False

    message_link: Optional[str] = None

    parent_id: Optional[int] = None
    parent_content: Optional[str] = None
    parent_sender: Optional[str] = None

    reactions: List[ReactionRead] = Field(default_factory=list)

    is_forwarded: bool = False
    is_deleted: bool = False
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ChatRoomOut(BaseModel):
    room_id: int
    is_group: bool
    participants: List["ChatParticipantOut"]
    messages: List["ChatMessageOut"]

class ParticipantRead(BaseModel):
    id: int
    
class UserRead(BaseModel):
    email: str
    first_name: str
    last_name: str

    class Config:from_attributes = True
        
class ChatRoomRead(BaseModel):
    id: int
    name: Optional[str] = None
    is_group: bool
    unread_count: int = 0
    is_read_only: bool = False
    participants: List[ChatUserBase] = Field(default_factory=list)
    last_message: Optional[MessageRead] = None
    
    model_config = ConfigDict(from_attributes=True)

class ChatRoomDetailsResponse(BaseModel):
    room_id: int
    room_name: str
    is_group: bool

class ChatRoomCreate(BaseModel):
    participant_emails: List[str]
    name: str | None = None 
    is_group: bool = False
    email_id: int | None = None

    participants: List[dict] = Field(default_factory=list)
    recent_files: List[dict] = Field(default_factory=list)

class ChatMemberUpdate(BaseModel):
    user_emails: List[str]
    name: Optional[str] = None
    is_group: bool = False
    email_id: Optional[int] = None

class ChatUserDetails(BaseModel):
    id: int
    name: str
    email: str
    profile_image: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MessageUpdate(BaseModel):
    content: Optional[str] = None 
    file_name: Optional[str] = None  
    
    model_config = ConfigDict(from_attributes=True)
        
class ChatMessageResponse(BaseModel):
    type: Optional[str] = None
    id: int
    room_id: Optional[int] = None
    sender_id: int
    sender: UserDisplay
    content: str
    timestamp: Optional[str] = None
    is_own_message: bool = False
    parent_id: Optional[int] = None
    parent_content: Optional[str] = None
    parent_sender: Optional[str] = None
    read_count: int = 0
    is_starred: bool = False
    reactions: List[ReactionRead] = Field(default_factory=list)
    is_forwarded: bool = False
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class OfflineUser(BaseModel):
    id: int
    name: str
    email: str
    profile_image: Optional[str] = None
    last_seen: Optional[datetime] = None
    mention_ids: Optional[List[int]] = []
    
    model_config = ConfigDict(from_attributes=True)
    
class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = Field(None, example="Discussing project milestones")
    call_type: str = Field('video', example="video") 
    scheduled_at: Optional[datetime] = None 
    participant_ids: List[int] = Field(default_factory=list)   
    
    model_config = ConfigDict(from_attributes=True)

class ChatSettingsUpdate(BaseModel):
    chat_push_enabled: bool
    chat_sounds_enabled: bool
    chat_email_alerts: bool
    read_receipts: bool
    show_last_seen: bool
    auto_download_media: bool
    enter_to_send: bool
    typing_indicators: bool
    dark_mode: bool
    compact_mode: bool

    model_config = ConfigDict(from_attributes=True)

class ChatParticipantOut(BaseModel):
    id: int
    name: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)

class ChatMessageOut(BaseModel):
    id: int
    content: Optional[str] = None
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)

class RenameGroupRequest(BaseModel):
    new_name: str


class RenameGroupResponse(BaseModel):
    status: str
    message: str
    group_id: int
    new_name: str

class MuteChatResponse(BaseModel):
    success: bool
    message: str
    room_id: int
    is_muted: bool

class UnmuteChatResponse(BaseModel):
    success: bool
    message: str
    room_id: int
    is_muted: bool