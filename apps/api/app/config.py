from pydantic import BaseModel


class Settings(BaseModel):
    api_name: str = "RegimeGuard API"
    api_version: str = "v1"


settings = Settings()

