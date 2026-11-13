from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

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
VERIFIED_METADATA_PATH = DATA_DIR / "nasa_combustion_metadata.json"
DEMO_DATASET_PATH = DATA_DIR / "demo_combustion_data.csv"

REQUIRED_COLUMNS = {
    "experiment_id",
    "experiment_group",
    "time_s",
    "flame_temperature_k",
    "flame_height_mm",
    "oxygen_ratio_percent",
}
NUMERIC_COLUMNS = ["time_s", "flame_temperature_k", "flame_height_mm", "oxygen_ratio_percent"]


def _build_unavailable_summary(message: str) -> dict:
    return asdict(
        DatasetSummary(
            source_label="Dataset unavailable",
            is_verified_nasa_data=False,
            record_count=0,
            columns=[],
            note=message,
        )
    )


def _read_provenance_metadata() -> dict:
    if not VERIFIED_METADATA_PATH.exists():
        return {}

    with VERIFIED_METADATA_PATH.open("r", encoding="utf-8") as metadata_file:
        metadata = json.load(metadata_file)

    if not isinstance(metadata, dict):
        raise ValueError("Metadata JSON must be an object.")
    return metadata


def _is_verified_nasa_dataset(metadata: dict) -> bool:
    """Require explicit provenance fields to classify a dataset as verified NASA data."""
    required_fields = ["source_name", "source_url", "retrieved_at", "verification_status"]
    if not all(metadata.get(field) for field in required_fields):
        return False

    source_name = str(metadata.get("source_name", "")).lower()
    source_url = str(metadata.get("source_url", "")).lower()
    verification_status = str(metadata.get("verification_status", "")).lower()

    return (
        verification_status == "verified"
        and "nasa" in source_name
        and "nasa.gov" in source_url
    )


def _validate_dataset(df: pd.DataFrame) -> pd.DataFrame:
    missing_columns = REQUIRED_COLUMNS - set(df.columns)
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing_columns))}.")

    validated_df = df.copy()

    for col in NUMERIC_COLUMNS:
        validated_df[col] = pd.to_numeric(validated_df[col], errors="coerce")

    required_null_counts = validated_df[list(REQUIRED_COLUMNS)].isna().sum()
    missing_value_columns = required_null_counts[required_null_counts > 0]
    if not missing_value_columns.empty:
        details = ", ".join(
            f"{column}({int(count)})" for column, count in missing_value_columns.items()
        )
        raise ValueError(f"Missing or non-numeric values found in required fields: {details}.")

    if (validated_df["time_s"] < 0).any():
        raise ValueError("Invalid measurement: time_s must be non-negative.")
    if (validated_df["flame_temperature_k"] <= 0).any():
        raise ValueError("Invalid measurement: flame_temperature_k must be greater than zero.")
    if (validated_df["flame_height_mm"] < 0).any():
        raise ValueError("Invalid measurement: flame_height_mm must be non-negative.")
    if (
        (validated_df["oxygen_ratio_percent"] < 0)
        | (validated_df["oxygen_ratio_percent"] > 100)
    ).any():
        raise ValueError(
            "Invalid measurement: oxygen_ratio_percent must be within 0 to 100."
        )

    return validated_df


def _load_dataset() -> tuple[pd.DataFrame, DatasetSummary]:
    """Load and validate the best available dataset while preserving provenance labels."""
    try:
        if VERIFIED_DATASET_PATH.exists():
            df = pd.read_csv(VERIFIED_DATASET_PATH)
            metadata = _read_provenance_metadata()
            df = _validate_dataset(df)
            is_verified = _is_verified_nasa_dataset(metadata)

            if is_verified:
                summary = DatasetSummary(
                    source_label="Verified NASA dataset",
                    is_verified_nasa_data=True,
                    record_count=len(df),
                    columns=df.columns.tolist(),
                    note=(
                        "Dataset classified as verified NASA data using explicit provenance "
                        "metadata from data/nasa_combustion_metadata.json."
                    ),
                )
            else:
                summary = DatasetSummary(
                    source_label="Unverified uploaded dataset",
                    is_verified_nasa_data=False,
                    record_count=len(df),
                    columns=df.columns.tolist(),
                    note=(
                        "A non-demo dataset is present but is not marked verified because "
                        "NASA provenance metadata is missing or incomplete."
                    ),
                )
            return df, summary

        df = pd.read_csv(DEMO_DATASET_PATH)
        df = _validate_dataset(df)
        summary = DatasetSummary(
            source_label="Demonstration dataset",
            is_verified_nasa_data=False,
            record_count=len(df),
            columns=df.columns.tolist(),
            note=(
                "This is sample demonstration data for interface development only. "
                "It does not represent verified NASA experimental results."
            ),
        )
        return df, summary
    except (
        FileNotFoundError,
        ValueError,
        json.JSONDecodeError,
        pd.errors.EmptyDataError,
        pd.errors.ParserError,
    ) as exc:
        fallback_summary = _build_unavailable_summary(
            "No valid dataset could be loaded. Provide a complete dataset with required columns and "
            "valid numeric measurements. NASA verification also requires "
            "data/nasa_combustion_metadata.json provenance details."
        )
        raise DatasetLoadError(str(exc), fallback_summary) from exc


def get_dataset_summary() -> dict:
    _, summary = _load_dataset()
    return asdict(summary)


def get_visualization_payload() -> dict:
    """Prepare chart payload expected by Plotly.js on the client side."""
    df, summary = _load_dataset()
    if df.empty:
        return {}

    line_traces = []
    sorted_df = df.sort_values(["experiment_id", "time_s"])

    for experiment_id, group_df in sorted_df.groupby("experiment_id", sort=True):
        experiment_group = str(group_df["experiment_group"].iloc[0])
        line_traces.append(
            {
                "x": group_df["time_s"].tolist(),
                "y": group_df["flame_temperature_k"].tolist(),
                "name": f"{experiment_id} (Group {experiment_group})",
            }
        )

    avg_temp = (
        df.groupby("experiment_group", as_index=False)["flame_temperature_k"]
        .mean()
        .rename(columns={"flame_temperature_k": "average_temperature_k"})
    )

    comparison_points = df[["experiment_id", "flame_height_mm", "oxygen_ratio_percent"]].copy()

    return {
        "is_verified_nasa_data": summary.is_verified_nasa_data,
        "line": {
            "traces": line_traces,
            "name": "Flame temperature (K) by experiment",
        },
        "bar": {
            "x": avg_temp["experiment_group"].tolist(),
            "y": avg_temp["average_temperature_k"].round(2).tolist(),
            "name": "Average temperature by experiment group",
        },
        "comparison": {
            "x": comparison_points["flame_height_mm"].tolist(),
            "y": comparison_points["oxygen_ratio_percent"].tolist(),
            "text": comparison_points["experiment_id"].tolist(),
            "name": "Flame height vs oxygen concentration",
        },
    }
