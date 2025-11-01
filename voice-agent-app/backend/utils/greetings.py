import random
from typing import List


_GREETINGS: List[str] = [
    "Heeey! I'm Nicole! How may I help you today?",
    "Heeey! I'm Nicole! What's up today?",
    "Hi! I'm Nicole. What's your name?",
    "Hey there! Nicole here. How's everything going in your life?",
    "Heeey! I'm Nicole! What can I do for you right now?",
    "Hiya! I'm Nicole. Before we dive in, what should I call you?",
    "Hey hey! I'm Nicole! What's happening on your side today?",
]


def get_random_greeting() -> str:
    if not _GREETINGS:
        return "Heeey! I'm Nicole! How may I help you today?"
    return random.choice(_GREETINGS)


