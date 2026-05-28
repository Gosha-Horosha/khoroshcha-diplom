# from fastapi import Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordBearer
# from sqlalchemy.orm import Session
# # from jose import JWTError
#
# from app.db.session import get_db
# from app.db.models import User
# from app.core.security import verify_token
#
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
#
#
# def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#
#     payload = verify_token(token)
#     if payload is None:
#         raise credentials_exception
#
#     username: str = payload.get("sub")
#     if username is None:
#         raise credentials_exception
#
#     user = db.query(User).filter(User.username == username).first()
#     if user is None:
#         raise credentials_exception
#
#     return user