from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session



from app.db.session import get_db

from app.schemas import LoginRequest, LoginResponse, UserResponse

from app.security import create_access_token, get_current_user

from app.services import user_service



router = APIRouter(prefix="/auth", tags=["auth"])





@router.post("/login", response_model=LoginResponse)

def login(

    body: LoginRequest,

    db: Session = Depends(get_db),

) -> LoginResponse:

    user = user_service.authenticate_user(db, body.username, body.password)

    if user is None:

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Неверный логин или пароль",

        )

    username = user["username"]

    token = create_access_token(username, extra={"role": user["role"]})

    return LoginResponse(token=token, username=username)





@router.get("/me", response_model=UserResponse)

def me(

    current_user: dict[str, str] = Depends(get_current_user),

) -> UserResponse:

    return UserResponse(

        username=current_user["username"],

        role=current_user["role"],

    )

