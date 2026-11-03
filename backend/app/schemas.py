from typing import Literal

from pydantic import BaseModel, Field


class CleaningOperation(BaseModel):
    operation: Literal[
        "remove_duplicates",
        "fill_mean",
        "fill_median",
        "fill_mode",
        "drop_missing",
        "drop_columns",
        "rename_column",
        "convert_dtype",
    ]
    column: str | None = None
    columns: list[str] = Field(default_factory=list)
    new_name: str | None = None
    dtype: Literal["string", "integer", "float", "boolean", "datetime"] | None = None


class CleaningRequest(BaseModel):
    operations: list[CleaningOperation] = Field(min_length=1, max_length=20)
    apply: bool = False


class ChartRequest(BaseModel):
    x: str
    y: str | None = None
    chart_type: Literal["bar", "line", "pie", "scatter", "histogram"]
    limit: int = Field(default=1000, ge=10, le=5000)
