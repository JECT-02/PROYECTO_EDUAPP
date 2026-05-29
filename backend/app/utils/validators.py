import re

def validate_password_strength(password: str) -> bool:
    """
    Password must be at least 8 characters long, 
    contain at least one uppercase letter, 
    one number and one special character.
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False
    return True
