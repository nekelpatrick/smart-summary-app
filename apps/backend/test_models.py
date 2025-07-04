import pytest
from pydantic import ValidationError
from app.models import TextRequest, SummaryResponse


class TestTextRequest:
    def test_valid_request(self):
        request = TextRequest(text="Sample text", max_length=100)
        assert request.text == "Sample text"
        assert request.max_length == 100

    def test_empty_text_raises_error(self):
        with pytest.raises(ValidationError):
            TextRequest(text="", max_length=100)

    def test_negative_max_length_raises_error(self):
        with pytest.raises(ValidationError):
            TextRequest(text="Sample text", max_length=-1)

    def test_zero_max_length_raises_error(self):
        with pytest.raises(ValidationError):
            TextRequest(text="Sample text", max_length=0)

    def test_max_length_too_large_raises_error(self):
        with pytest.raises(ValidationError):
            TextRequest(text="Sample text", max_length=1001)

    def test_default_max_length(self):
        request = TextRequest(text="Sample text")
        assert request.max_length == 200

    def test_valid_max_length_range(self):
        # Test minimum valid value
        request1 = TextRequest(text="Sample text", max_length=1)
        assert request1.max_length == 1

        # Test maximum valid value
        request2 = TextRequest(text="Sample text", max_length=1000)
        assert request2.max_length == 1000


class TestSummaryResponse:
    def test_valid_response(self):
        response = SummaryResponse(summary="This is a summary")
        assert response.summary == "This is a summary"

    def test_empty_summary_allowed(self):
        response = SummaryResponse(summary="")
        assert response.summary == ""
