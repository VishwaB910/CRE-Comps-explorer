from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    sql_user: str = "statbrio"
    sql_pass: str = "2001"
    sql_host: str = "localhost"
    sql_port: int = 5432
    sql_db: str = "cre_comps"
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.sql_user}:{self.sql_pass}"
            f"@{self.sql_host}:{self.sql_port}/{self.sql_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
