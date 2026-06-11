"""Дымовые тесты health и auth."""


def test_health_ok(client) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "neuroexam-api"
    assert body["db_ok"] is True


def test_login_invalid_credentials(client) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": "demo", "password": "wrong"},
    )
    assert response.status_code == 401
    assert "логин" in response.json()["detail"].lower()


def test_me_requires_token(client) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401
