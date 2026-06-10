from fastapi import APIRouter, Depends, HTTPException
from django.db.models import Q
from django.utils import timezone

from django_backend.models import (
    Email, Task, User, ChatMessage,
    TaskComment, TaskActivity, Tag, Project
)

from fastapi_app.schemas.task_schemas import (
    TaskRead, TaskCreate, TaskUpdate,
    CommentCreate, CommentRead,
    ActivityRead, TagRead,
    AddTagRequest, ProjectCreate, ProjectRead
)

from fastapi_app.dependencies.permissions import get_current_user
from typing import List
from fastapi_app.services.notifications import create_notification

router = APIRouter()


# =========================
# ACTIVITY LOGGER
# =========================
def log_activity(task: Task, user: User, action: str, details: str):
    TaskActivity.objects.create(
        task=task,
        actor=user,
        action_type=action,
        details=details
    )


# =========================
# LIST TASKS
# =========================
@router.get("/")
def list_my_tasks(current_user: User = Depends(get_current_user)):

    tasks = Task.objects.filter(
        Q(assigned_to=current_user) | Q(created_by=current_user)
    ).values(
        "id", "title", "description", "status",
        "priority", "due_date", "created_at", "updated_at"
    )

    return list(tasks)


# =========================
# CREATE TASK
# =========================
@router.post("/")
def create_task(data: TaskCreate, current_user: User = Depends(get_current_user)):

    task = Task.objects.create(
        title=data.title,
        description=data.description or "",
        created_by=current_user
    )

    return {"id": task.id, "title": task.title}


# =========================
# UPDATE TASK
# =========================
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, data: TaskUpdate, current_user: User = Depends(get_current_user)):

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.status and data.status != task.status:
        log_activity(task, current_user, "status_change",
                     f"Changed status from {task.status} to {data.status}")
        task.status = data.status

    if data.priority and data.priority != task.priority:
        log_activity(task, current_user, "priority_change",
                     f"Changed priority from {task.priority} to {data.priority}")
        task.priority = data.priority

    if data.assigned_to_email:
        try:
            new_assignee = User.objects.get(email=data.assigned_to_email)

            if task.assigned_to != new_assignee:
                log_activity(task, current_user, "assignment",
                             f"Reassigned task to {new_assignee.email}")

                task.assigned_to = new_assignee

                # ✅ NOTIFICATION FIXED USAGE
                create_notification(
                    recipient=new_assignee,
                    title="Task Reassigned",
                    message=f"Task reassigned by {current_user.email}: {task.title}",
                    type_choice="task",
                    related_id=task.id
                )

        except User.DoesNotExist:
            pass

    task.save()
    return task


# =========================
# TASK FROM EMAIL
# =========================
@router.post("/from-email/{email_id}", response_model=TaskRead)
def create_task_from_email(email_id: int, current_user: User = Depends(get_current_user)):

    try:
        email = Email.objects.get(id=email_id)
    except Email.DoesNotExist:
        raise HTTPException(status_code=404, detail="Email not found")

    task = Task.objects.create(
        title=email.subject or f"Task from Email #{email.id}",
        description=email.body or "",
        created_by=current_user,
        assigned_to=current_user,
        email=email,
        priority="medium",
        status="todo"
    )

    log_activity(task, current_user, "task_created",
                 f"Task created from email #{email.id}")

    return task


# =========================
# TASK FROM CHAT
# =========================
@router.post("/from-chat/{message_id}", response_model=TaskRead)
def create_task_from_chat(message_id: int, current_user: User = Depends(get_current_user)):

    try:
        chat_msg = ChatMessage.objects.get(id=message_id)
    except ChatMessage.DoesNotExist:
        raise HTTPException(status_code=404, detail="Chat message not found")

    task = Task.objects.create(
        title=f"Task from Chat #{chat_msg.id}",
        description=chat_msg.content or "",
        created_by=current_user,
        priority="medium"
    )

    return task


# =========================
# ADD COMMENT
# =========================
@router.post("/{task_id}/comments", response_model=CommentRead)
def add_comment(task_id: int, comment: CommentCreate, current_user: User = Depends(get_current_user)):

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        raise HTTPException(status_code=404, detail="Task not found")

    new_comment = TaskComment.objects.create(
        task=task,
        author=current_user,
        content=comment.content
    )

    if task.assigned_to and task.assigned_to != current_user:
        create_notification(
            recipient=task.assigned_to,
            title="Task Comment",
            message=f"{current_user.email} commented on task: {task.title}",
            type_choice="task",
            related_id=task.id
        )

    return new_comment


# =========================
# LIST COMMENTS
# =========================
@router.get("/{task_id}/comments", response_model=List[CommentRead])
def list_comments(task_id: int, current_user: User = Depends(get_current_user)):

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        raise HTTPException(status_code=404, detail="Task not found")

    return task.comments.all().order_by("-created_at")


# =========================
# TASK HISTORY
# =========================
@router.get("/{task_id}/history", response_model=List[ActivityRead])
def get_task_history(task_id: int, current_user: User = Depends(get_current_user)):

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        raise HTTPException(status_code=404, detail="Task not found")

    return task.activity_log.all().order_by("-created_at")


# =========================
# TAGS
# =========================
@router.post("/{task_id}/tags", response_model=TaskRead)
def add_tag_to_task(task_id: int, tag_data: AddTagRequest, current_user: User = Depends(get_current_user)):

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        raise HTTPException(status_code=404, detail="Task not found")

    tag, _ = Tag.objects.get_or_create(name=tag_data.tag_name)
    task.tags.add(tag)

    log_activity(task, current_user, "tag_added", f"Added tag: {tag.name}")

    return task


# =========================
# PROJECTS
# =========================
@router.post("/projects", response_model=ProjectRead)
def create_project(data: ProjectCreate, current_user: User = Depends(get_current_user)):

    return Project.objects.create(
        name=data.name,
        description=data.description,
        owner=current_user
    )


@router.get("/projects", response_model=List[ProjectRead])
def list_projects(current_user: User = Depends(get_current_user)):

    return Project.objects.all()