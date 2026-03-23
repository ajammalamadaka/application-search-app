"""Configuration and environment variable loading for the Gmail AI Agent."""

import os
from dotenv import load_dotenv

load_dotenv()

# Gmail OAuth2 credentials file (download from Google Cloud Console)
CREDENTIALS_FILE = os.environ.get("GMAIL_CREDENTIALS_FILE", "credentials.json")

# OAuth2 token cache file (auto-created on first run)
TOKEN_FILE = os.environ.get("GMAIL_TOKEN_FILE", "token.json")

# Gmail API scopes
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]

# OpenAI settings
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

# Agent behaviour
MAX_EMAILS_TO_FETCH = int(os.environ.get("MAX_EMAILS_TO_FETCH", "20"))
DEFAULT_INBOX_LABEL = os.environ.get("DEFAULT_INBOX_LABEL", "INBOX")
