"""Gmail API client – handles OAuth2 authentication and all Gmail operations."""

import base64
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config import CREDENTIALS_FILE, GMAIL_SCOPES, TOKEN_FILE


class GmailClient:
    """Thin wrapper around the Gmail REST API."""

    def __init__(self):
        self._service = None

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def authenticate(self) -> None:
        """Run OAuth2 flow (browser-based) and cache the token locally."""
        creds = None

        if os.path.exists(TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, GMAIL_SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(CREDENTIALS_FILE):
                    raise FileNotFoundError(
                        f"OAuth2 credentials file not found: '{CREDENTIALS_FILE}'. "
                        "Download it from the Google Cloud Console and place it in the "
                        "gmail-agent directory (or set GMAIL_CREDENTIALS_FILE)."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_FILE, GMAIL_SCOPES
                )
                creds = flow.run_local_server(port=0)

            with open(TOKEN_FILE, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())

        self._service = build("gmail", "v1", credentials=creds)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _svc(self):
        if self._service is None:
            raise RuntimeError("Not authenticated. Call authenticate() first.")
        return self._service

    @staticmethod
    def _decode_body(payload: dict) -> str:
        """Recursively extract plain-text body from a message payload."""
        mime_type = payload.get("mimeType", "")
        body_data = payload.get("body", {}).get("data", "")

        if mime_type == "text/plain" and body_data:
            return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

        for part in payload.get("parts", []):
            text = GmailClient._decode_body(part)
            if text:
                return text

        return ""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def list_messages(self, label: str = "INBOX", max_results: int = 20) -> list[dict]:
        """Return a list of message metadata dicts (id, threadId, snippet, headers)."""
        try:
            result = (
                self._svc()
                .users()
                .messages()
                .list(userId="me", labelIds=[label], maxResults=max_results)
                .execute()
            )
        except HttpError as err:
            raise RuntimeError(f"Gmail API error: {err}") from err

        messages = result.get("messages", [])
        enriched = []
        for msg in messages:
            enriched.append(self.get_message(msg["id"]))
        return enriched

    def get_message(self, message_id: str) -> dict:
        """Fetch a single message and return a normalised dict."""
        try:
            raw = (
                self._svc()
                .users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )
        except HttpError as err:
            raise RuntimeError(f"Gmail API error: {err}") from err

        headers = {h["name"]: h["value"] for h in raw.get("payload", {}).get("headers", [])}
        body = self._decode_body(raw.get("payload", {}))

        return {
            "id": raw["id"],
            "threadId": raw["threadId"],
            "snippet": raw.get("snippet", ""),
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "date": headers.get("Date", ""),
            "body": body,
            "labels": raw.get("labelIds", []),
        }

    def send_message(self, to: str, subject: str, body: str) -> dict:
        """Send a plain-text email and return the sent message resource."""
        mime_msg = MIMEMultipart()
        mime_msg["to"] = to
        mime_msg["subject"] = subject
        mime_msg.attach(MIMEText(body, "plain"))

        encoded = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode()
        try:
            sent = (
                self._svc()
                .users()
                .messages()
                .send(userId="me", body={"raw": encoded})
                .execute()
            )
        except HttpError as err:
            raise RuntimeError(f"Gmail API send error: {err}") from err

        return sent

    def mark_as_read(self, message_id: str) -> None:
        """Remove the UNREAD label from a message."""
        try:
            self._svc().users().messages().modify(
                userId="me",
                id=message_id,
                body={"removeLabelIds": ["UNREAD"]},
            ).execute()
        except HttpError as err:
            raise RuntimeError(f"Gmail API error: {err}") from err

    def add_label(self, message_id: str, label_name: str) -> None:
        """Add a label (by name) to a message, creating the label if necessary."""
        label_id = self._get_or_create_label(label_name)
        try:
            self._svc().users().messages().modify(
                userId="me",
                id=message_id,
                body={"addLabelIds": [label_id]},
            ).execute()
        except HttpError as err:
            raise RuntimeError(f"Gmail API error: {err}") from err

    def _get_or_create_label(self, name: str) -> str:
        """Return the label id for *name*, creating it if it does not exist."""
        try:
            existing = self._svc().users().labels().list(userId="me").execute()
            for label in existing.get("labels", []):
                if label["name"].lower() == name.lower():
                    return label["id"]

            created = (
                self._svc()
                .users()
                .labels()
                .create(userId="me", body={"name": name})
                .execute()
            )
            return created["id"]
        except HttpError as err:
            raise RuntimeError(f"Gmail API error: {err}") from err
