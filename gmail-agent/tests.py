"""Unit tests for the Gmail AI Agent components.

These tests use mocking so that no real Gmail or OpenAI credentials are required.
"""

import base64
import types
import unittest
from email.mime.text import MIMEText
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------


class TestConfig(unittest.TestCase):
    def test_defaults(self):
        import config

        self.assertEqual(config.MAX_EMAILS_TO_FETCH, int(config.MAX_EMAILS_TO_FETCH))
        self.assertIsInstance(config.GMAIL_SCOPES, list)
        self.assertTrue(len(config.GMAIL_SCOPES) > 0)
        self.assertEqual(config.DEFAULT_INBOX_LABEL, "INBOX")


# ---------------------------------------------------------------------------
# GmailClient helper tests (no network)
# ---------------------------------------------------------------------------


class TestGmailClientDecodeBody(unittest.TestCase):
    def _encode(self, text: str) -> str:
        return base64.urlsafe_b64encode(text.encode()).decode()

    def test_plain_text_body(self):
        from gmail_client import GmailClient

        payload = {
            "mimeType": "text/plain",
            "body": {"data": self._encode("Hello world")},
            "parts": [],
        }
        result = GmailClient._decode_body(payload)
        self.assertEqual(result, "Hello world")

    def test_multipart_body(self):
        from gmail_client import GmailClient

        payload = {
            "mimeType": "multipart/mixed",
            "body": {},
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": self._encode("Nested text")},
                    "parts": [],
                }
            ],
        }
        result = GmailClient._decode_body(payload)
        self.assertEqual(result, "Nested text")

    def test_empty_payload_returns_empty_string(self):
        from gmail_client import GmailClient

        result = GmailClient._decode_body({})
        self.assertEqual(result, "")


class TestGmailClientAuth(unittest.TestCase):
    def test_raises_without_credentials_file(self):
        """authenticate() must raise FileNotFoundError when credentials.json is missing."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            # Patch file paths so nothing real is touched
            with patch("gmail_client.TOKEN_FILE", str(os.path.join(tmpdir, "token.json"))), patch(
                "gmail_client.CREDENTIALS_FILE", str(os.path.join(tmpdir, "credentials.json"))
            ):
                from gmail_client import GmailClient

                client = GmailClient()
                with self.assertRaises(FileNotFoundError):
                    client.authenticate()

    def test_service_not_set_raises_runtime_error(self):
        from gmail_client import GmailClient

        client = GmailClient()
        with self.assertRaises(RuntimeError):
            client._svc()


# ---------------------------------------------------------------------------
# AIProcessor tests (no real OpenAI calls)
# ---------------------------------------------------------------------------


SAMPLE_EMAIL = {
    "id": "abc123",
    "threadId": "thread1",
    "subject": "Test Subject",
    "from": "sender@example.com",
    "to": "me@example.com",
    "date": "Mon, 1 Jan 2025 12:00:00 +0000",
    "snippet": "This is a test email snippet.",
    "body": "This is the full body of the test email.",
    "labels": ["INBOX"],
}


class TestAIProcessor(unittest.TestCase):
    def _make_processor(self):
        """Return an AIProcessor with a mocked OpenAI client."""
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            # Reload config so OPENAI_API_KEY is picked up
            import importlib

            import config
            import ai_processor

            importlib.reload(config)
            importlib.reload(ai_processor)

            from ai_processor import AIProcessor

            processor = AIProcessor.__new__(AIProcessor)

        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Mocked AI response"
        mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
        processor._client = mock_client
        return processor

    def test_summarize_returns_string(self):
        processor = self._make_processor()
        result = processor.summarize(SAMPLE_EMAIL)
        self.assertIsInstance(result, str)

    def test_categorize_calls_openai(self):
        processor = self._make_processor()
        result = processor.categorize(SAMPLE_EMAIL)
        self.assertEqual(result, "Mocked AI response")
        processor._client.chat.completions.create.assert_called_once()

    def test_draft_reply_includes_instructions(self):
        processor = self._make_processor()
        processor.draft_reply(SAMPLE_EMAIL, instructions="Be formal")
        call_kwargs = processor._client.chat.completions.create.call_args
        messages = call_kwargs[1]["messages"] if call_kwargs[1] else call_kwargs[0][0]
        user_message = next(m["content"] for m in messages if m["role"] == "user")
        self.assertIn("Be formal", user_message)

    def test_extract_action_items_calls_openai(self):
        processor = self._make_processor()
        result = processor.extract_action_items(SAMPLE_EMAIL)
        self.assertEqual(result, "Mocked AI response")

    def test_answer_question_includes_question(self):
        processor = self._make_processor()
        processor.answer_question(SAMPLE_EMAIL, "What is the deadline?")
        call_kwargs = processor._client.chat.completions.create.call_args
        messages = call_kwargs[1]["messages"] if call_kwargs[1] else call_kwargs[0][0]
        user_message = next(m["content"] for m in messages if m["role"] == "user")
        self.assertIn("What is the deadline?", user_message)

    def test_missing_api_key_raises(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": ""}):
            import importlib

            import config
            import ai_processor

            importlib.reload(config)
            importlib.reload(ai_processor)

            from ai_processor import AIProcessor

            with self.assertRaises(ValueError):
                AIProcessor()


if __name__ == "__main__":
    unittest.main()
