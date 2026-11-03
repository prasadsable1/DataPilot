from __future__ import annotations

from datetime import datetime
from io import BytesIO

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import routes
from app.config import Settings
from app.database import get_db
from app.routes import router


class FakeResult:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class FakeDatabase:
    def __init__(self):
        self.datasets = {}

    def scalar(self, _statement):
        return next(iter(self.datasets.values()), None)

    def scalars(self, _statement):
        return FakeResult(list(self.datasets.values()))

    def add(self, dataset):
        self.datasets[dataset.id] = dataset

    def commit(self):
        pass

    def refresh(self, dataset):
        dataset.created_at = datetime.now()

    def rollback(self):
        pass

    def delete(self, dataset):
        self.datasets.pop(dataset.id, None)


@pytest.fixture
def client(tmp_path, monkeypatch):
    database = FakeDatabase()
    settings = Settings(data_storage_dir=tmp_path)
    test_app = FastAPI()
    test_app.include_router(router, prefix="/api")
    monkeypatch.setattr(routes, "get_settings", lambda: settings)

    def fake_db():
        yield database

    test_app.dependency_overrides[get_db] = fake_db
    with TestClient(test_app) as test_client:
        yield test_client, database, settings
    test_app.dependency_overrides.clear()


def headers():
    return {"X-Session-ID": "efa6b087-513e-4ddb-901c-3713aa265b28"}


def upload(client, filename="sales.csv", payload=b"Region,Amount,Flag\nEast,10,yes\nEast,,no\nWest,30,yes\nWest,30,yes\n"):
    return client.post(
        "/api/datasets",
        headers=headers(),
        files={"file": (filename, payload)},
        data={"name": "Quarter sales"},
    )


def test_health_and_session_validation(client):
    test_client, _, _ = client
    assert test_client.get("/api/health").json()["status"] == "ok"
    response = test_client.get("/api/datasets")
    assert response.status_code == 401


def test_csv_upload_preview_clean_statistics_chart_insights_export_and_delete(client):
    test_client, database, settings = client
    response = upload(test_client)
    assert response.status_code == 201
    result = response.json()
    dataset_id = result["dataset"]["id"]
    assert result["dataset"]["name"] == "Quarter sales"
    assert result["summary"]["row_count"] == 4
    assert result["summary"]["column_count"] == 3
    assert result["summary"]["missing_cells"] == 1
    details = test_client.get(f"/api/datasets/{dataset_id}", headers=headers())
    assert details.status_code == 200
    assert details.json()["summary"]["duplicate_rows"] == 1
    listing = test_client.get("/api/datasets", headers=headers())
    assert listing.status_code == 200
    assert len(listing.json()["datasets"]) == 1

    preview = test_client.get(f"/api/datasets/{dataset_id}/preview", headers=headers(), params={"limit": 2})
    assert preview.status_code == 200
    assert len(preview.json()["rows"]) == 2
    assert preview.json()["total"] == 4

    preview_clean = test_client.post(
        f"/api/datasets/{dataset_id}/clean",
        headers=headers(),
        json={"operations": [{"operation": "fill_mean", "column": "Amount"}], "apply": False},
    )
    assert preview_clean.status_code == 200
    assert preview_clean.json()["operations"][0]["changed"] == 1
    assert preview_clean.json()["applied"] is False
    insight_response = test_client.get(f"/api/datasets/{dataset_id}/insights", headers=headers())
    assert insight_response.status_code == 200
    assert any("Missing values" in item["title"] for item in insight_response.json()["insights"])

    applied = test_client.post(
        f"/api/datasets/{dataset_id}/clean",
        headers=headers(),
        json={"operations": [{"operation": "fill_mean", "column": "Amount"}], "apply": True},
    )
    assert applied.status_code == 200
    stored = database.datasets[dataset_id]
    original_path = settings.data_storage_dir / stored.owner_id / stored.storage_key
    working_path = settings.data_storage_dir / stored.owner_id / f"{dataset_id}.working.csv"
    assert pd.read_csv(original_path)["Amount"].isna().sum() == 1
    assert pd.read_csv(working_path)["Amount"].isna().sum() == 0

    reset = test_client.post(f"/api/datasets/{dataset_id}/reset", headers=headers())
    assert reset.status_code == 200
    assert reset.json()["status"] == "reset"
    assert pd.read_csv(working_path)["Amount"].isna().sum() == 1

    statistics = test_client.get(f"/api/datasets/{dataset_id}/statistics", headers=headers()).json()
    numeric = next(column for column in statistics["columns"] if column["name"] == "Amount")
    assert numeric["mean"] == pytest.approx(70 / 3)
    chart = test_client.post(
        f"/api/datasets/{dataset_id}/chart",
        headers=headers(),
        json={"x": "Region", "y": "Amount", "chart_type": "bar"},
    )
    assert chart.status_code == 200
    chart_values = {point["Region"]: point["Amount"] for point in chart.json()["data"]}
    assert chart_values["East"] == pytest.approx(10.0)

    reapply = test_client.post(
        f"/api/datasets/{dataset_id}/clean",
        headers=headers(),
        json={"operations": [{"operation": "fill_mean", "column": "Amount"}], "apply": True},
    )
    assert reapply.status_code == 200
    assert pd.read_csv(working_path)["Amount"].isna().sum() == 0

    duplicates = test_client.post(
        f"/api/datasets/{dataset_id}/clean",
        headers=headers(),
        json={"operations": [{"operation": "remove_duplicates"}], "apply": True},
    )
    assert duplicates.status_code == 200
    assert duplicates.json()["summary"]["row_count"] == 3

    exported = test_client.get(f"/api/datasets/{dataset_id}/export", headers=headers())
    exported_frame = pd.read_csv(BytesIO(exported.content))
    assert len(exported_frame) == 3
    assert exported_frame["Amount"].isna().sum() == 0
    summary_export = test_client.get(f"/api/datasets/{dataset_id}/summary/export", headers=headers())
    assert summary_export.status_code == 200
    assert "statistics" in summary_export.json()

    deleted = test_client.delete(f"/api/datasets/{dataset_id}", headers=headers())
    assert deleted.status_code == 204
    assert dataset_id not in database.datasets


def test_excel_upload_and_invalid_extension(client):
    test_client, _, _ = client
    workbook = BytesIO()
    pd.DataFrame({"team": ["Blue", "Gold"], "score": [4, 9]}).to_excel(workbook, index=False)
    excel = upload(test_client, "scores.xlsx", workbook.getvalue())
    assert excel.status_code == 201
    assert excel.json()["dataset"]["file_type"] == "XLSX"

    invalid = upload(test_client, "notes.txt", b"not a dataset")
    assert invalid.status_code == 415


def test_invalid_xlsx_content_is_rejected(client):
    test_client, _, _ = client
    response = upload(test_client, "fake.xlsx", b"not an excel workbook")
    assert response.status_code == 415


def test_upload_size_limit(client):
    test_client, _, settings = client
    settings.max_upload_mb = 1
    response = upload(test_client, payload=b"x" * (1024 * 1024 + 1))
    assert response.status_code == 413
