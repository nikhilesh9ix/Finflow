from fastapi.testclient import TestClient

from app.main import app


def test_csv_upload_rejects_malformed_rows() -> None:
    client = TestClient(app)
    login_response = client.post(
        "/api/auth/login",
        json={"email": "demo@finflow.ai", "password": "demo12345"},
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    response = client.post(
        "/api/transactions/upload-csv",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("bad.csv", b"date,description,amount\n2026-01-01,Groceries,not-a-number\n", "text/csv")},
    )

    assert response.status_code == 400
    assert "amount" in response.json()["detail"].lower()
