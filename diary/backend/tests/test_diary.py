import pytest
from app.core.security import get_password_hash
from app.db.models import User, DiaryEntry


class TestDiary:
    def create_test_user(self, db, username="testuser"):
        """Helper method to create test user"""
        user = User(
            username=username,
            email=f"{username}@example.com",
            hashed_password=get_password_hash("password123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_auth_token(self, client, username="testuser", password="password123"):
        """Helper method to get authentication token"""
        response = client.post("/api/auth/token", data={
            "username": username,
            "password": password
        })
        return response.json()["access_token"]

    def test_create_diary_entry(self, client, db):
        """Test creating a diary entry"""
        user = self.create_test_user(db)
        token = self.get_auth_token(client, user.username)
        
        entry_data = {
            "title": "Test Entry",
            "content": "This is a test diary entry.",
            "is_public": False
        }
        
        response = client.post(
            "/api/diary/",
            json=entry_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == entry_data["title"]
        assert data["content"] == entry_data["content"]
        assert data["is_public"] == entry_data["is_public"]
        assert data["user_id"] == user.id

    def test_get_diary_entries(self, client, db):
        """Test getting user's diary entries"""
        user = self.create_test_user(db)
        token = self.get_auth_token(client, user.username)
        
        # Create test entries
        entries = [
            DiaryEntry(
                title=f"Entry {i}",
                content=f"Content {i}",
                user_id=user.id,
                is_public=(i % 2 == 0)
            ) for i in range(3)
        ]
        
        for entry in entries:
            db.add(entry)
        db.commit()
        
        response = client.get(
            "/api/diary/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        
        for i, entry in enumerate(data):
            assert entry["title"] == f"Entry {i}"
            assert entry["user_id"] == user.id

    def test_get_single_entry(self, client, db):
        """Test getting a single diary entry"""
        user = self.create_test_user(db)
        token = self.get_auth_token(client, user.username)
        
        # Create test entry
        entry = DiaryEntry(
            title="Single Entry",
            content="Single entry content",
            user_id=user.id,
            is_public=False
        )
        db.add(entry)
        db.commit()
        
        response = client.get(
            f"/api/diary/{entry.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Single Entry"
        assert data["id"] == entry.id

    def test_update_diary_entry(self, client, db):
        """Test updating a diary entry"""
        user = self.create_test_user(db)
        token = self.get_auth_token(client, user.username)
        
        # Create test entry
        entry = DiaryEntry(
            title="Original Title",
            content="Original content",
            user_id=user.id,
            is_public=False
        )
        db.add(entry)
        db.commit()
        
        update_data = {
            "title": "Updated Title",
            "content": "Updated content",
            "is_public": True
        }
        
        response = client.put(
            f"/api/diary/{entry.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["content"] == "Updated content"
        assert data["is_public"] == True

    def test_delete_diary_entry(self, client, db):
        """Test deleting a diary entry"""
        user = self.create_test_user(db)
        token = self.get_auth_token(client, user.username)
        
        # Create test entry
        entry = DiaryEntry(
            title="Entry to delete",
            content="This entry will be deleted",
            user_id=user.id,
            is_public=False
        )
        db.add(entry)
        db.commit()
        
        response = client.delete(
            f"/api/diary/{entry.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Entry deleted successfully"
        
        # Verify entry was deleted
        deleted_entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry.id).first()
        assert deleted_entry is None

    def test_access_private_entry_of_other_user(self, client, db):
        """Test accessing private entry of another user"""
        user1 = self.create_test_user(db, "user1")
        user2 = self.create_test_user(db, "user2")
        
        token_user2 = self.get_auth_token(client, "user2")
        
        # Create private entry for user1
        entry = DiaryEntry(
            title="Private Entry",
            content="Private content",
            user_id=user1.id,
            is_public=False
        )
        db.add(entry)
        db.commit()
        
        # User2 tries to access user1's private entry
        response = client.get(
            f"/api/diary/{entry.id}",
            headers={"Authorization": f"Bearer {token_user2}"}
        )
        
        assert response.status_code == 403
        assert "Not enough permissions" in response.json()["detail"]

    def test_access_public_entry_of_other_user(self, client, db):
        """Test accessing public entry of another user"""
        user1 = self.create_test_user(db, "user1")
        user2 = self.create_test_user(db, "user2")
        
        token_user2 = self.get_auth_token(client, "user2")
        
        # Create public entry for user1
        entry = DiaryEntry(
            title="Public Entry",
            content="Public content",
            user_id=user1.id,
            is_public=True
        )
        db.add(entry)
        db.commit()
        
        # User2 accesses user1's public entry
        response = client.get(
            f"/api/diary/{entry.id}",
            headers={"Authorization": f"Bearer {token_user2}"}
        )
        
        assert response.status_code == 200
        assert response.json()["title"] == "Public Entry"