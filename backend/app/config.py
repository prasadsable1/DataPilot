from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    app_name: str = "DataPilot"
    app_env: str = "development"
    api_prefix: str = "/api"
    frontend_origins: str = "http://localhost:5173"
    max_upload_mb: int = 50
    max_preview_rows: int = 200
    data_storage_dir: Path = Path("./storage")
    database_url: str | None = None
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_database: str = "datapilot"
    mysql_user: str = "datapilot_user"
    mysql_password: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            if not self.database_url.startswith("mysql+pymysql://"):
                raise ValueError("DATABASE_URL must use the mysql+pymysql driver.")
            return self.database_url
        if not self.mysql_password:
            raise ValueError("Set DATABASE_URL or MYSQL_PASSWORD in backend/.env.")
        return URL.create(
            "mysql+pymysql",
            username=self.mysql_user,
            password=self.mysql_password,
            host=self.mysql_host,
            port=self.mysql_port,
            database=self.mysql_database,
            query={"charset": "utf8mb4"},
        ).render_as_string(hide_password=False)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
