"""AI processing layer – uses OpenAI GPT to analyse and respond to emails."""

from openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL


class AIProcessor:
    """Wraps OpenAI chat completions with email-specific helper methods."""

    _SYSTEM_PROMPT = (
        "You are a helpful email assistant. "
        "You read emails carefully and provide concise, professional responses. "
        "Always be polite and clear."
    )

    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not set. "
                "Add it to your .env file or export it as an environment variable."
            )
        self._client = OpenAI(api_key=OPENAI_API_KEY)

    # ------------------------------------------------------------------
    # Internal helper
    # ------------------------------------------------------------------

    def _chat(self, user_prompt: str, system_prompt: str | None = None) -> str:
        """Send a chat completion request and return the reply text."""
        messages = [
            {"role": "system", "content": system_prompt or self._SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        response = self._client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def summarize(self, email: dict) -> str:
        """Return a one-paragraph summary of an email."""
        prompt = (
            f"Subject: {email['subject']}\n"
            f"From: {email['from']}\n"
            f"Date: {email['date']}\n\n"
            f"Body:\n{email['body'] or email['snippet']}\n\n"
            "Please summarize this email in one short paragraph."
        )
        return self._chat(prompt)

    def categorize(self, email: dict) -> str:
        """Return a single category label for the email."""
        prompt = (
            f"Subject: {email['subject']}\n"
            f"From: {email['from']}\n\n"
            f"Snippet: {email['snippet']}\n\n"
            "Classify this email into exactly ONE of the following categories and "
            "respond with only the category name:\n"
            "Important, Newsletter, Promotional, Social, Update, Spam, Other"
        )
        return self._chat(prompt)

    def draft_reply(self, email: dict, instructions: str = "") -> str:
        """Draft a professional reply to an email."""
        extra = f"\nSpecial instructions: {instructions}" if instructions else ""
        prompt = (
            f"Subject: {email['subject']}\n"
            f"From: {email['from']}\n\n"
            f"Original email:\n{email['body'] or email['snippet']}\n\n"
            f"Please draft a professional reply to this email.{extra}"
        )
        return self._chat(prompt)

    def extract_action_items(self, email: dict) -> str:
        """Extract a bullet-point list of action items from an email."""
        prompt = (
            f"Subject: {email['subject']}\n"
            f"From: {email['from']}\n\n"
            f"Body:\n{email['body'] or email['snippet']}\n\n"
            "List every action item or task mentioned in this email as a bullet-point list. "
            "If there are none, respond with 'No action items found.'"
        )
        return self._chat(prompt)

    def answer_question(self, email: dict, question: str) -> str:
        """Answer a free-form question about an email."""
        prompt = (
            f"Subject: {email['subject']}\n"
            f"From: {email['from']}\n\n"
            f"Body:\n{email['body'] or email['snippet']}\n\n"
            f"Question: {question}"
        )
        return self._chat(prompt)
