"""Gmail AI Agent – interactive CLI entry point."""

import sys

from ai_processor import AIProcessor
from config import DEFAULT_INBOX_LABEL, MAX_EMAILS_TO_FETCH
from gmail_client import GmailClient


def print_header(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def print_email_list(emails: list[dict]) -> None:
    """Print a numbered index of emails."""
    print(f"\n{'#':<4} {'From':<35} {'Subject'}")
    print("-" * 80)
    for idx, email in enumerate(emails, start=1):
        sender = email["from"][:33] + ".." if len(email["from"]) > 35 else email["from"]
        subject = email["subject"][:39] + ".." if len(email["subject"]) > 41 else email["subject"]
        print(f"{idx:<4} {sender:<35} {subject}")


def pick_email(emails: list[dict]) -> dict | None:
    """Prompt the user to select an email by number."""
    while True:
        raw = input("\nEnter email number (or 'b' to go back): ").strip()
        if raw.lower() == "b":
            return None
        if raw.isdigit():
            idx = int(raw) - 1
            if 0 <= idx < len(emails):
                return emails[idx]
        print("Invalid selection. Please try again.")


def display_email(email: dict) -> None:
    """Pretty-print the full content of an email."""
    print_header("Email Detail")
    print(f"From   : {email['from']}")
    print(f"To     : {email['to']}")
    print(f"Date   : {email['date']}")
    print(f"Subject: {email['subject']}")
    print(f"\n{'-' * 60}\n{email['body'] or email['snippet']}\n{'-' * 60}")


def run_email_actions(email: dict, gmail: GmailClient, ai: AIProcessor) -> None:
    """Sub-menu for actions on a single selected email."""
    while True:
        print_header(f"Actions – \"{email['subject'][:50]}\"")
        print("  1. View full email")
        print("  2. Summarize email")
        print("  3. Categorize email")
        print("  4. Draft a reply")
        print("  5. Extract action items")
        print("  6. Ask a question about this email")
        print("  7. Send a reply")
        print("  8. Mark as read")
        print("  b. Back to inbox")

        choice = input("\nChoose an action: ").strip().lower()

        if choice == "1":
            display_email(email)

        elif choice == "2":
            print("\nSummarizing …")
            print(ai.summarize(email))

        elif choice == "3":
            print("\nCategorizing …")
            category = ai.categorize(email)
            print(f"Category: {category}")

        elif choice == "4":
            instructions = input("Any special instructions for the reply (or press Enter to skip): ").strip()
            print("\nDrafting reply …")
            draft = ai.draft_reply(email, instructions)
            print(f"\n{draft}")

        elif choice == "5":
            print("\nExtracting action items …")
            print(ai.extract_action_items(email))

        elif choice == "6":
            question = input("Your question: ").strip()
            if question:
                print("\nThinking …")
                print(ai.answer_question(email, question))

        elif choice == "7":
            print("\n--- Draft reply ---")
            instructions = input("Any instructions for the reply (or press Enter to skip): ").strip()
            draft = ai.draft_reply(email, instructions)
            print(f"\n{draft}\n")
            confirm = input("Send this reply? (yes/no): ").strip().lower()
            if confirm == "yes":
                recipient = email["from"]
                subject = (
                    email["subject"]
                    if email["subject"].startswith("Re:")
                    else f"Re: {email['subject']}"
                )
                gmail.send_message(recipient, subject, draft)
                print("Reply sent successfully.")
            else:
                print("Reply cancelled.")

        elif choice == "8":
            gmail.mark_as_read(email["id"])
            print("Marked as read.")

        elif choice == "b":
            break

        else:
            print("Unknown option. Please try again.")


def main() -> None:
    print_header("Gmail AI Agent")
    print("Authenticating with Gmail …")

    gmail = GmailClient()
    try:
        gmail.authenticate()
    except FileNotFoundError as exc:
        print(f"\nError: {exc}")
        sys.exit(1)

    ai = AIProcessor()

    while True:
        print_header("Inbox")
        print(f"Fetching up to {MAX_EMAILS_TO_FETCH} emails from {DEFAULT_INBOX_LABEL} …")

        try:
            emails = gmail.list_messages(label=DEFAULT_INBOX_LABEL, max_results=MAX_EMAILS_TO_FETCH)
        except RuntimeError as exc:
            print(f"Error: {exc}")
            sys.exit(1)

        if not emails:
            print("No emails found.")
            sys.exit(0)

        print_email_list(emails)

        email = pick_email(emails)
        if email is None:
            print("Goodbye!")
            sys.exit(0)

        run_email_actions(email, gmail, ai)


if __name__ == "__main__":
    main()
