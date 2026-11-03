from __future__ import annotations

import io
import json
import re
import uuid
from pathlib import Path
from typing import Annotated
from zipfile import BadZipFile

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.analytics import chart_data, dataframe_summary, insights, preview_rows, statistics
from app.config import get_settings
from app.database import get_db
from app.models import Dataset
from app.schemas import ChartRequest, CleaningOperation, CleaningRequest

router = APIRouter()


def require_owner(x_session_id: Annotated[str | None, Header(alias="X-Session-ID")] = None) -> str:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="A browser session is required.")
    try:
        return str(uuid.UUID(x_session_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid browser session identifier.") from exc


def get_dataset(dataset_id: str, owner: str, db: Session) -> Dataset:
    dataset = db.scalar(select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner))
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return dataset


def data_path(dataset: Dataset, working: bool = False) -> Path:
    root = get_settings().data_storage_dir.resolve()
    directory = (root / dataset.owner_id).resolve()
    if directory.parent != root:
        raise HTTPException(status_code=400, detail="Invalid dataset storage location.")
    directory.mkdir(parents=True, exist_ok=True)
    suffix = "working.csv" if working else dataset.file_type.removeprefix(".")
    path = (directory / f"{dataset.id}.{suffix}").resolve()
    if path.parent != directory:
        raise HTTPException(status_code=400, detail="Invalid dataset storage location.")
    return path


def read_dataset(dataset: Dataset, working: bool = True) -> pd.DataFrame:
    path = data_path(dataset, working=working)
    if working and not path.exists():
        path = data_path(dataset)
    try:
        if path.suffix.lower() == ".xlsx":
            return pd.read_excel(path, engine="openpyxl")
        return pd.read_csv(path, low_memory=False)
    except (OSError, ValueError, UnicodeError, pd.errors.ParserError, BadZipFile) as exc:
        raise HTTPException(status_code=422, detail=f"Could not read dataset file: {exc}") from exc


def dataset_info(dataset: Dataset) -> dict:
    return {
        "id": dataset.id,
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "file_type": dataset.file_type.removeprefix(".").upper(),
        "file_size": dataset.file_size,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "columns": json.loads(dataset.columns_json),
        "created_at": dataset.created_at.isoformat() if dataset.created_at else None,
        "status": "ready",
    }


def apply_operation(frame: pd.DataFrame, item: CleaningOperation) -> tuple[pd.DataFrame, int]:
    operation = item.operation
    if operation == "remove_duplicates":
        cleaned = frame.drop_duplicates()
        return cleaned, len(frame) - len(cleaned)
    if operation == "drop_missing":
        cleaned = frame.dropna()
        return cleaned, len(frame) - len(cleaned)
    if operation in {"fill_mean", "fill_median", "fill_mode"}:
        column = require_column(frame, item.column)
        series = frame[column]
        if operation in {"fill_mean", "fill_median"}:
            if not pd.api.types.is_numeric_dtype(series):
                raise HTTPException(status_code=422, detail=f"{operation} requires a numeric column.")
            value = series.mean() if operation == "fill_mean" else series.median()
        else:
            modes = series.mode(dropna=True)
            if modes.empty:
                raise HTTPException(status_code=422, detail="Cannot fill a column with no non-missing values.")
            value = modes.iloc[0]
        if pd.isna(value):
            raise HTTPException(status_code=422, detail="Cannot fill missing values because this column has no valid values.")
        count = int(series.isna().sum())
        frame[column] = series.fillna(value)
        return frame, count
    if operation == "drop_columns":
        columns = list(dict.fromkeys(item.columns or ([item.column] if item.column else [])))
        if not columns:
            raise HTTPException(status_code=422, detail="Select at least one column to remove.")
        missing = [column for column in columns if column not in frame.columns]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown column: {missing[0]}")
        if len(columns) >= len(frame.columns):
            raise HTTPException(status_code=422, detail="At least one column must remain in the dataset.")
        return frame.drop(columns=columns), len(columns)
    if operation == "rename_column":
        column = require_column(frame, item.column)
        new_name = (item.new_name or "").strip()
        if not new_name or len(new_name) > 255:
            raise HTTPException(status_code=422, detail="Enter a column name between 1 and 255 characters.")
        if new_name != column and new_name in frame.columns:
            raise HTTPException(status_code=422, detail="That column name already exists.")
        return frame.rename(columns={column: new_name}), 1
    if operation == "convert_dtype":
        column = require_column(frame, item.column)
        if item.dtype is None:
            raise HTTPException(status_code=422, detail="Select a data type.")
        try:
            if item.dtype == "integer":
                converted = pd.to_numeric(frame[column], errors="raise").astype("Int64")
            elif item.dtype == "float":
                converted = pd.to_numeric(frame[column], errors="raise")
            elif item.dtype == "datetime":
                converted = pd.to_datetime(frame[column], errors="raise")
            elif item.dtype == "boolean":
                mapping = {"true": True, "false": False, "1": True, "0": False, "yes": True, "no": False}
                converted = frame[column].map(
                    lambda value: mapping[str(value).strip().lower()] if pd.notna(value) else pd.NA
                ).astype("boolean")
            else:
                converted = frame[column].astype("string")
        except (ValueError, TypeError, KeyError) as exc:
            raise HTTPException(status_code=422, detail=f"Could not convert {column} to {item.dtype}: {exc}") from exc
        changed = int((frame[column].astype("string") != converted.astype("string")).fillna(False).sum())
        frame[column] = converted
        return frame, changed
    raise HTTPException(status_code=422, detail="Unsupported cleaning operation.")


def require_column(frame: pd.DataFrame, column: str | None) -> str:
    if not column or column not in frame.columns:
        raise HTTPException(status_code=422, detail="Select a valid column.")
    return column


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "DataPilot API"}


@router.post("/datasets", status_code=201)
async def upload_dataset(
    file: Annotated[UploadFile, File()],
    name: Annotated[str | None, Form(max_length=255)] = None,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if extension not in {".csv", ".xlsx"}:
        raise HTTPException(status_code=415, detail="Upload a .csv or .xlsx file.")
    limit = get_settings().max_upload_mb * 1024 * 1024
    payload = await file.read(limit + 1)
    if not payload:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(payload) > limit:
        raise HTTPException(status_code=413, detail=f"File exceeds the {get_settings().max_upload_mb} MB upload limit.")
    if extension == ".xlsx" and not payload.startswith(b"PK\x03\x04"):
        raise HTTPException(status_code=415, detail="The file content is not a valid XLSX document.")
    try:
        frame = pd.read_excel(io.BytesIO(payload), engine="openpyxl") if extension == ".xlsx" else pd.read_csv(io.BytesIO(payload), low_memory=False)
    except (ValueError, UnicodeError, pd.errors.ParserError, OSError, BadZipFile) as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse uploaded file: {exc}") from exc
    if frame.empty and len(frame.columns) == 0:
        raise HTTPException(status_code=422, detail="The file does not contain tabular data.")
    if len(frame.columns) > 500:
        raise HTTPException(status_code=422, detail="Datasets are limited to 500 columns.")
    dataset_id = str(uuid.uuid4())
    directory = (get_settings().data_storage_dir.resolve() / owner).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    storage_key = f"{dataset_id}{extension}"
    original_path = directory / storage_key
    working_path = directory / f"{dataset_id}.working.csv"
    dataset = Dataset(
        id=dataset_id,
        owner_id=owner,
        name=(name or Path(filename).stem).strip()[:255] or "Untitled dataset",
        original_filename=filename[:255],
        storage_key=storage_key,
        file_type=extension,
        file_size=len(payload),
        row_count=len(frame),
        column_count=len(frame.columns),
        columns_json=json.dumps(dataframe_summary(frame)["columns"], ensure_ascii=False),
    )
    try:
        original_path.write_bytes(payload)
        frame.to_csv(working_path, index=False)
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
    except (OSError, SQLAlchemyError) as exc:
        db.rollback()
        original_path.unlink(missing_ok=True)
        working_path.unlink(missing_ok=True)
        message = "Could not save uploaded dataset file." if isinstance(exc, OSError) else "Database could not save dataset metadata."
        status = 500 if isinstance(exc, OSError) else 503
        raise HTTPException(status_code=status, detail=message) from exc
    return {"dataset": dataset_info(dataset), "summary": dataframe_summary(frame)}


@router.get("/datasets")
def list_datasets(
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    datasets = db.scalars(select(Dataset).where(Dataset.owner_id == owner).order_by(Dataset.created_at.desc())).all()
    return {"datasets": [dataset_info(item) for item in datasets]}


@router.get("/datasets/{dataset_id}")
def dataset_details(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    dataset = get_dataset(dataset_id, owner, db)
    frame = read_dataset(dataset)
    return {"dataset": dataset_info(dataset), "summary": dataframe_summary(frame)}


@router.get("/datasets/{dataset_id}/preview")
def dataset_preview(
    dataset_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1),
    search: str = Query(default="", max_length=200),
    sort_by: str | None = Query(default=None, max_length=255),
    descending: bool = False,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    dataset = get_dataset(dataset_id, owner, db)
    frame = read_dataset(dataset)
    max_preview_rows = get_settings().max_preview_rows
    limit = min(limit, max_preview_rows)
    if sort_by:
        if sort_by not in frame.columns:
            raise HTTPException(status_code=422, detail="Unknown sort column.")
        frame = frame.sort_values(sort_by, ascending=not descending, na_position="last")
    return preview_rows(frame, offset, limit, search)


@router.delete("/datasets/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> None:
    dataset = get_dataset(dataset_id, owner, db)
    original_path, working_path = data_path(dataset), data_path(dataset, working=True)
    db.delete(dataset)
    db.commit()
    original_path.unlink(missing_ok=True)
    working_path.unlink(missing_ok=True)


@router.post("/datasets/{dataset_id}/clean")
def clean_dataset(
    dataset_id: str,
    request: CleaningRequest,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    dataset = get_dataset(dataset_id, owner, db)
    frame = read_dataset(dataset)
    results = []
    for operation in request.operations:
        previous_rows, previous_cols = len(frame), len(frame.columns)
        frame, changed = apply_operation(frame, operation)
        results.append(
            {
                "operation": operation.operation,
                "changed": changed,
                "rows_before": previous_rows,
                "rows_after": len(frame),
                "columns_before": previous_cols,
                "columns_after": len(frame.columns),
            }
        )
    if request.apply:
        frame.to_csv(data_path(dataset, working=True), index=False)
        dataset.row_count = len(frame)
        dataset.column_count = len(frame.columns)
        dataset.columns_json = json.dumps(dataframe_summary(frame)["columns"], ensure_ascii=False)
        db.commit()
    return {
        "applied": request.apply,
        "operations": results,
        "summary": dataframe_summary(frame),
        "preview": preview_rows(frame, limit=20),
    }


@router.post("/datasets/{dataset_id}/reset")
def reset_working_copy(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    dataset = get_dataset(dataset_id, owner, db)
    original_path = data_path(dataset)
    working_path = data_path(dataset, working=True)
    if not original_path.exists():
        raise HTTPException(status_code=404, detail="Original dataset file was not found.")
    working_path.write_bytes(original_path.read_bytes())
    frame = read_dataset(dataset, working=False)
    dataset.row_count = len(frame)
    dataset.column_count = len(frame.columns)
    dataset.columns_json = json.dumps(dataframe_summary(frame)["columns"], ensure_ascii=False)
    db.commit()
    return {"status": "reset", "dataset": dataset_info(dataset), "summary": dataframe_summary(frame)}


@router.get("/datasets/{dataset_id}/statistics")
def dataset_statistics(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    return statistics(read_dataset(get_dataset(dataset_id, owner, db)))


@router.post("/datasets/{dataset_id}/chart")
def dataset_chart(
    dataset_id: str,
    request: ChartRequest,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    try:
        return chart_data(read_dataset(get_dataset(dataset_id, owner, db)), request.x, request.y, request.chart_type, request.limit)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/datasets/{dataset_id}/insights")
def dataset_insights(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    frame = read_dataset(get_dataset(dataset_id, owner, db))
    return {"insights": insights(frame)}


@router.get("/datasets/{dataset_id}/export")
def export_dataset(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    dataset = get_dataset(dataset_id, owner, db)
    buffer = io.StringIO()
    read_dataset(dataset).to_csv(buffer, index=False)
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", dataset.name).strip("._") or "dataset"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_cleaned.csv"'},
    )


@router.get("/datasets/{dataset_id}/summary/export")
def export_summary(
    dataset_id: str,
    owner: str = Depends(require_owner),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    dataset = get_dataset(dataset_id, owner, db)
    frame = read_dataset(dataset)
    content = json.dumps({"dataset": dataset_info(dataset), "statistics": statistics(frame), "insights": insights(frame)}, indent=2)
    return StreamingResponse(iter([content]), media_type="application/json")
