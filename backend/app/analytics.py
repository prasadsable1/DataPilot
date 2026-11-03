from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd


def dataframe_summary(frame: pd.DataFrame) -> dict[str, Any]:
    columns = []
    for name in frame.columns:
        series = frame[name]
        columns.append(
            {
                "name": str(name),
                "dtype": str(series.dtype),
                "missing": int(series.isna().sum()),
                "unique": int(series.nunique(dropna=True)),
                "sample": [json_safe(value) for value in series.dropna().head(3).tolist()],
            }
        )
    return {
        "row_count": int(len(frame)),
        "column_count": int(len(frame.columns)),
        "columns": columns,
        "missing_cells": int(frame.isna().sum().sum()),
        "duplicate_rows": int(frame.duplicated().sum()),
    }


def preview_rows(frame: pd.DataFrame, offset: int = 0, limit: int = 50, search: str = "") -> dict[str, Any]:
    filtered = frame
    if search:
        mask = frame.astype("string").apply(
            lambda column: column.str.contains(search, case=False, na=False, regex=False)
        )
        filtered = frame[mask.any(axis=1)]
    page = filtered.iloc[offset : offset + limit]
    return {
        "rows": [{str(key): json_safe(value) for key, value in row.items()} for row in page.to_dict("records")],
        "total": int(len(filtered)),
        "offset": offset,
        "limit": limit,
        "columns": [str(column) for column in frame.columns],
    }


def statistics(frame: pd.DataFrame) -> dict[str, Any]:
    columns: list[dict[str, Any]] = []
    for name in frame.columns:
        series = frame[name]
        result: dict[str, Any] = {
            "name": str(name),
            "dtype": str(series.dtype),
            "missing": int(series.isna().sum()),
            "unique": int(series.nunique(dropna=True)),
        }
        if pd.api.types.is_numeric_dtype(series):
            valid = series.dropna()
            result.update(
                {
                    "kind": "numeric",
                    "mean": json_safe(valid.mean()),
                    "median": json_safe(valid.median()),
                    "mode": json_safe(valid.mode().iloc[0]) if not valid.mode().empty else None,
                    "min": json_safe(valid.min()),
                    "max": json_safe(valid.max()),
                    "range": json_safe(valid.max() - valid.min()) if not valid.empty else None,
                    "std": json_safe(valid.std()),
                    "variance": json_safe(valid.var()),
                }
            )
        else:
            counts = series.value_counts(dropna=True).head(20)
            result.update(
                {
                    "kind": "categorical",
                    "mode": json_safe(counts.index[0]) if not counts.empty else None,
                    "frequencies": [{"value": json_safe(key), "count": int(value)} for key, value in counts.items()],
                }
            )
        columns.append(result)
    return {"row_count": int(len(frame)), "column_count": int(len(frame.columns)), "columns": columns}


def insights(frame: pd.DataFrame) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    rows, cols = frame.shape
    items.append(
        {
            "type": "overview",
            "title": f"{rows:,} rows across {cols} columns",
            "detail": f"This summary is calculated from all {rows:,} records in the current dataset.",
            "metric": f"{rows:,} x {cols}",
        }
    )
    missing = frame.isna().sum()
    for name, count in missing[missing > 0].items():
        items.append(
            {
                "type": "quality",
                "title": f"Missing values in {name}",
                "detail": f"{int(count):,} of {rows:,} values ({count / max(rows, 1):.1%}) are missing.",
                "metric": f"{int(count):,}",
            }
        )
    duplicates = int(frame.duplicated().sum())
    if duplicates:
        items.append(
            {
                "type": "quality",
                "title": f"{duplicates:,} duplicate rows",
                "detail": "These rows match another complete row across all columns.",
                "metric": f"{duplicates:,}",
            }
        )
    numeric = frame.select_dtypes(include=np.number)
    for name in numeric.columns:
        values = numeric[name].dropna()
        if values.empty:
            continue
        low, high = float(values.min()), float(values.max())
        items.append(
            {
                "type": "range",
                "title": f"{name}: {low:g} to {high:g}",
                "detail": f"Observed minimum is {low:g}; observed maximum is {high:g}.",
                "metric": f"{low:g} — {high:g}",
            }
        )
        q1, q3 = values.quantile([0.25, 0.75])
        iqr = q3 - q1
        if iqr > 0:
            count = int(((values < q1 - 1.5 * iqr) | (values > q3 + 1.5 * iqr)).sum())
            if count:
                items.append(
                    {
                        "type": "outlier",
                        "title": f"Potential outliers in {name}",
                        "detail": f"{count:,} values fall outside the 1.5×IQR range. Review them before removal.",
                        "metric": f"{count:,}",
                    }
                )
    for name in frame.columns:
        if name not in numeric.columns:
            counts = frame[name].value_counts(dropna=True)
            if not counts.empty:
                items.append(
                    {
                        "type": "category",
                        "title": f"{counts.index[0]} is most frequent in {name}",
                        "detail": f"It appears {int(counts.iloc[0]):,} times among non-missing values.",
                        "metric": f"{int(counts.iloc[0]):,}",
                    }
                )
    if len(numeric.columns) >= 2:
        corr = numeric.corr(min_periods=3)
        correlation_count = 0
        for i, first in enumerate(corr.columns):
            for second in corr.columns[i + 1 :]:
                value = corr.loc[first, second]
                if pd.notna(value) and abs(value) >= 0.7:
                    items.append(
                        {
                            "type": "correlation",
                            "title": f"Strong correlation: {first} and {second}",
                            "detail": f"Pearson correlation is {value:.2f} using valid paired numeric values; correlation does not imply causation.",
                            "metric": f"r = {value:.2f}",
                        }
                    )
                    correlation_count += 1
                    if correlation_count >= 20:
                        break
            if correlation_count >= 20:
                break
    return items


def chart_data(frame: pd.DataFrame, x: str, y: str | None, chart_type: str, limit: int) -> dict[str, Any]:
    if x not in frame.columns or (y is not None and y not in frame.columns):
        raise ValueError("Selected chart columns are not present in the dataset.")
    if chart_type in {"scatter", "histogram"} and (y if chart_type == "scatter" else x) is None:
        raise ValueError("Select the required numeric column.")
    if chart_type == "scatter":
        if y is None:
            raise ValueError("Scatter plots require both X and Y columns.")
        if not pd.api.types.is_numeric_dtype(frame[x]) or not pd.api.types.is_numeric_dtype(frame[y]):
            raise ValueError("Scatter plots require numeric X and Y columns.")
        data = frame[[x, y]].apply(pd.to_numeric, errors="coerce").dropna().head(limit)
        return {"data": [{x: json_safe(a), y: json_safe(b)} for a, b in data.itertuples(index=False, name=None)], "x": x, "y": y}
    if chart_type == "histogram":
        values = pd.to_numeric(frame[x], errors="coerce").dropna()
        if values.empty:
            raise ValueError("Histogram requires numeric data.")
        counts, edges = np.histogram(values, bins=min(20, max(5, int(np.sqrt(len(values))))))
        return {
            "data": [{"bin": f"{edges[i]:g} – {edges[i + 1]:g}", "count": int(counts[i])} for i in range(len(counts))],
            "x": "bin",
            "y": "count",
        }
    if chart_type == "pie" or y is None or not pd.api.types.is_numeric_dtype(frame[y]):
        data = frame[x].value_counts(dropna=True).head(min(limit, 20))
        return {"data": [{"name": str(key), "value": int(count)} for key, count in data.items()], "x": "name", "y": "value"}
    grouped = frame.groupby(x, dropna=True)[y].mean().sort_values(ascending=False).head(limit)
    return {
        "data": [{x: json_safe(key), y: json_safe(value)} for key, value in grouped.items()],
        "x": x,
        "y": y,
    }


def json_safe(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value) if np.isfinite(value) else None
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value
