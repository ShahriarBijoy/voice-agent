import random
from typing import List


_GREETINGS: List[str] = [
    "Heeey! How may I help you today?",
    "Heeey! What's up today?",
    "Hi! What's your name?",
    "Hey there! How's everything going in your life?",
    "Heeey! What can I do for you right now?",
    "Hiya! Before we dive in, what should I call you?",
    "Hey hey! What's happening on your side today?",
]


def get_random_greeting() -> str:
    if not _GREETINGS:
        return "Heeey! How may I help you today?"
    return random.choice(_GREETINGS)


