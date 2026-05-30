import re

def validate_password_strength(password: str) -> bool:
    """
    Dev/demo mode: password must be at least 6 characters long.
    """
    if len(password) < 6:
        return False
    return True

# Original strict validation (commented for dev mode):
# def validate_password_strength_strict(password: str) -> bool:
#     """
#     Production: at least 8 characters, one uppercase, one number, one special char.
#     """
#     if len(password) < 8:
#         return False
#     if not re.search(r"[A-Z]", password):
#         return False
#     if not re.search(r"\d", password):
#         return False
#     if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
#         return False
#     return True
