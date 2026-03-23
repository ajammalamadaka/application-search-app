# Gmail AI Agent

An AI-powered agent that integrates with Gmail to help you manage, summarize, categorize, and reply to emails using OpenAI GPT.

## Features

| Feature | Description |
|---|---|
| **Read inbox** | Fetches recent emails from any Gmail label |
| **Summarize** | One-paragraph AI summary of any email |
| **Categorize** | Auto-label emails (Important, Newsletter, Promotional, Social, Update, Spam, Other) |
| **Draft reply** | AI-generated professional reply with optional instructions |
| **Action items** | Bullet-point list of tasks extracted from an email |
| **Q&A** | Ask any free-form question about an email |
| **Send reply** | Review and send the AI-drafted reply directly from the CLI |
| **Mark as read** | Remove the UNREAD label from an email |

## Prerequisites

- Python 3.11 or later
- A Google Cloud project with the **Gmail API** enabled
- An **OAuth2 Desktop App** credential (`credentials.json`)
- An **OpenAI API key**

## Quick Start

### 1. Set up Google Cloud credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **Gmail API** under *APIs & Services → Library*.
4. Create an **OAuth 2.0 Client ID** (Application type: *Desktop app*).
5. Download the JSON file and save it as `credentials.json` inside the `gmail-agent/` directory.

### 2. Install dependencies

```bash
cd gmail-agent
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your OPENAI_API_KEY
```

### 4. Run the agent

```bash
python agent.py
```

On the **first run** a browser window will open asking you to authorise the app. After authorisation a `token.json` file is created locally so subsequent runs do not require re-authorisation.

## Project Structure

```
gmail-agent/
├── agent.py           # Interactive CLI entry point
├── gmail_client.py    # Gmail API wrapper (OAuth2 + REST operations)
├── ai_processor.py    # OpenAI GPT integration (summarize, categorize, reply …)
├── config.py          # Environment variable loading
├── requirements.txt   # Python dependencies
├── .env.example       # Template for your .env file
├── tests.py           # Unit tests (no real credentials required)
└── README.md          # This file
```

## Running the Tests

```bash
cd gmail-agent
pip install -r requirements.txt
python -m pytest tests.py -v
# or using the built-in runner
python tests.py
```

## Security Notes

- **Never commit** `credentials.json` or `token.json` – both are listed in `.gitignore`.
- **Never commit** your `.env` file.
- The agent requests only the minimum Gmail scopes needed:
  - `gmail.readonly` – read emails
  - `gmail.send` – send replies
  - `gmail.modify` – mark as read / add labels

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `GMAIL_CREDENTIALS_FILE` | `credentials.json` | Path to OAuth2 credentials |
| `GMAIL_TOKEN_FILE` | `token.json` | Path to cached OAuth2 token |
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `MAX_EMAILS_TO_FETCH` | `20` | Max emails loaded per session |
| `DEFAULT_INBOX_LABEL` | `INBOX` | Gmail label to read from |
