import pytest

@pytest.mark.asyncio
async def test_register_user(async_client):
    response = await async_client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "password": "StrongPassword123!",
        "name": "New User",
        "role": "student",
        "ageGroup": "15-18"
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Verification code sent"

@pytest.mark.asyncio
async def test_login_user(async_client):
    response = await async_client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Password123!",
        "role": "student"
    })
    assert response.status_code == 200
    data = response.json()
    assert "accessToken" in data
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_login_invalid_password(async_client):
    response = await async_client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPassword123!",
        "role": "student"
    })
    assert response.status_code == 401
