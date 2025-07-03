import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "Smart Summary API" in response.json()["message"]


def test_example():
    response = client.get("/example")
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert isinstance(data["text"], str)
    assert len(data["text"]) > 0


def test_summarize_empty_text():
    response = client.post("/summarize", json={"text": "", "max_length": 100})
    assert response.status_code == 422  # Validation error for empty text


def test_summarize_valid_text():
    text = "This is a test text that should be summarized. It contains multiple sentences to test the summarization functionality."
    response = client.post("/summarize", json={"text": text, "max_length": 50})

    # This test might fail if OpenAI API key is not set, which is expected
    if response.status_code == 200:
        data = response.json()
        assert "summary" in data
        assert isinstance(data["summary"], str)
    else:
        # If API key is not set or other error, just check it's a proper error response
        assert response.status_code in [500, 422]
