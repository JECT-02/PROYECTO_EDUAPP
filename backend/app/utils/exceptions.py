from fastapi import HTTPException, status

class BaseAPIException(HTTPException):
    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": detail})

class BadRequestException(BaseAPIException):
    def __init__(self, code: str, detail: str):
        super().__init__(status.HTTP_400_BAD_REQUEST, code, detail)

class UnauthorizedException(BaseAPIException):
    def __init__(self, code: str = "UNAUTHORIZED", detail: str = "Not authenticated"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, code, detail)

class ForbiddenException(BaseAPIException):
    def __init__(self, code: str = "FORBIDDEN", detail: str = "Not enough privileges"):
        super().__init__(status.HTTP_403_FORBIDDEN, code, detail)

class NotFoundException(BaseAPIException):
    def __init__(self, code: str = "NOT_FOUND", detail: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, code, detail)

class ConflictException(BaseAPIException):
    def __init__(self, code: str = "CONFLICT", detail: str = "Resource conflict"):
        super().__init__(status.HTTP_409_CONFLICT, code, detail)

class UnprocessableEntityException(BaseAPIException):
    def __init__(self, code: str = "UNPROCESSABLE_ENTITY", detail: str = "Invalid data"):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, code, detail)

class TooManyRequestsException(BaseAPIException):
    def __init__(self, code: str = "TOO_MANY_REQUESTS", detail: str = "Rate limit exceeded"):
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, code, detail)

class InternalServerException(BaseAPIException):
    def __init__(self, code: str = "INTERNAL_SERVER_ERROR", detail: str = "Internal server error"):
        super().__init__(status.HTTP_500_INTERNAL_SERVER_ERROR, code, detail)
