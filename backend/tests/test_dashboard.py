import pytest

@pytest.mark.asyncio
async def test_dashboard_unauthorized(async_client):
    response = await async_client.get("/api/dashboard")
    assert response.status_code == 401 # Since no token provided

@pytest.mark.asyncio
async def test_dashboard_authorized(async_client):
    # 1. Login to get token
    login_res = await async_client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Password123!",
        "role": "student"
    })
    token = login_res.json()["accessToken"]
    
    # 2. Access dashboard
    headers = {"Authorization": f"Bearer {token}"}
    response = await async_client.get("/api/dashboard", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "greeting" in data
    assert "pet" in data
    assert data["pet"]["name"] == "Duo" or data["pet"]["name"] == "owl"
