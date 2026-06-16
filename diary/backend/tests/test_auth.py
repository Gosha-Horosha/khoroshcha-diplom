import pytest
from app.core.security import get_password_hash
from app.db.models import User


class TestAuth:
    def test_register_user(self, client, db):
        """Test user registration"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == user_data["username"]
        assert data["email"] == user_data["email"]
        assert "password" not in data
        
        # Verify user was created in database
        user = db.query(User).filter(User.username == "testuser").first()
        assert user is not None
        assert user.email == "test@example.com"

    def test_register_existing_username(self, client, db):
        """Test registration with existing username"""
        # Create existing user
        user = User(
            username="existinguser",
            email="existing@example.com",
            hashed_password=get_password_hash("password123")
        )
        db.add(user)
        db.commit()
        
        user_data = {
            "username": "existinguser",
            "email": "new@example.com",
            "password": "newpassword123"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "Username already registered" in response.json()["detail"]

    def test_login_success(self, client, db):
        """Test successful login"""
        # Create user first
        user = User(
            username="loginuser",
            email="login@example.com",
            hashed_password=get_password_hash("password123")
        )
        db.add(user)
        db.commit()
        
        login_data = {
            "username": "loginuser",
            "password": "password123"
        }
        
        response = client.post("/api/auth/token", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client, db):
        """Test login with invalid credentials"""
        login_data = {
            "username": "nonexistent",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/token", data=login_data)
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_get_current_user(self, client, db):
        """Test getting current user with valid token"""
        # Create user and get token
        user = User(
            username="currentuser",
            email="current@example.com",
            hashed_password=get_password_hash("password123")
        )
        db.add(user)
        db.commit()
        
        # Login to get token
        login_response = client.post("/api/auth/token", data={
            "username": "currentuser",
            "password": "password123"
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "currentuser"
        assert data["email"] == "current@example.com"

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]