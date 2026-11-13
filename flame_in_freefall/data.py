from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import pandas as pd


class DatasetLoadError(RuntimeError):
    def __init__(self, message: str, fallback_summary: dict):
        super().__init__(message)
        self.fallback_summary = fallback_summary


@dataclass(frozen=True)
class DatasetSummary:
    source_label: str
    is_verified_nasa_data: bool
    record_count: int
    columns: list[str]
    note: str


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
VERIFIED_DATASET_PATH = DATA_DIR / "nasa_combustion_verified.csv"
DEMO_DATASET_PATH = DATA_DIR / "demo_combustion_data.csv"


def _load_dataset() -> tuple[pd.DataFrame, DatasetSummary]:
    """Load verified NASA data when available, otherwise fallback to local demo data."""
    try:
        if VERIFIED_DATASET_PATH.exists():
            df = pd.read_csv(VERIFIED_DATASET_PATH)
            summary = DatasetSummary(
                source_label="Verified NASA dataset",
                is_verified_nasa_data=True,
                record_count=len(df),
                columns=df.columns.tolist(),
                note=(
                    "Data loaded from a verified NASA source file packaged with this repository."
                ),
            )
            return df, summary

        df = pd.read_csv(DEMO_DATASET_PATH)
        summary = DatasetSummary(
            source_label="Demonstration dataset",
            is_verified_nasa_data=False,
            record_count=len(df),
            columns=df.columns.tolist(),
            note=(
                "This is sample demonstration data for UI development only. "
                "It does not represent official NASA measurements."
            ),
        )
        return df, summary
    except (FileNotFoundError, pd.errors.EmptyDataError, pd.errors.ParserError) as exc:
        fallback_summary = DatasetSummary(
            source_label="Dataset unavailable",
            is_verified_nasa_data=False,
            record_count=0,
            columns=[],
            note=(
                "No dataset could be loaded. Add a verified NASA CSV file at "
                f"{VERIFIED_DATASET_PATH.name} to replace demonstration mode."
            ),
        )
        raise DatasetLoadError("Unable to load dataset.", asdict(fallback_summary)) from exc


def get_dataset_summary() -> dict:
    _, summary = _load_dataset()
    return asdict(summary)


def get_visualization_payload() -> dict:
    """Prepare chart payload expected by Plotly.js on the client side."""
    df, summary = _load_dataset()
    if df.empty:
        return {}

    avg_temp = (
        df.groupby("experiment_group", as_index=False)["flame_temperature_k"]
        .mean()
        .rename(columns={"flame_temperature_k": "average_temperature_k"})
    )

    # Derived indicator for comparison panel: normalized flame stability index.
    stability_index = np.clip(
        (df["flame_height_mm"] * df["oxygen_ratio_percent"]) / 100,
        a_min=0,
        a_max=None,
    )

    comparison_points = df[["experiment_id", "flame_height_mm"]].copy()
    comparison_points["stability_index"] = stability_index.round(2)

    return {
        "is_verified_nasa_data": summary.is_verified_nasa_data,
        "line": {
            "x": df["time_s"].tolist(),
            "y": df["flame_temperature_k"].tolist(),
            "name": "Flame temperature (K)",
        },
        "bar": {
            "x": avg_temp["experiment_group"].tolist(),
            "y": avg_temp["average_temperature_k"].round(2).tolist(),
            "name": "Average temperature by experiment group",
        },
        "comparison": {
            "x": comparison_points["flame_height_mm"].tolist(),
            "y": comparison_points["stability_index"].tolist(),
            "text": comparison_points["experiment_id"].tolist(),
            "name": "Flame height vs stability index",
        },
    }
