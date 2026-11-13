# Flame in Freefall

Flame in Freefall is an initial web application foundation for the NASA Space Apps Challenge 2026. The platform is focused on microgravity combustion exploration and spacecraft fire-safety context, with a clean architecture ready for verified NASA dataset integration.

## Features in this foundation

- Responsive, dark space-science themed interface (desktop/tablet/mobile).
- Landing page with project purpose and scientific context.
- Dashboard section for combustion experiment exploration.
- Dataset information panel with clear source labeling.
- Flame behaviour analysis and three Plotly visualization areas:
  - line chart with separate traces per experiment,
  - bar chart,
  - flame-height versus oxygen-concentration scatter comparison.
- Dedicated microgravity combustion and spacecraft fire-safety sections.
- About and references section with official NASA links.

## Data integrity, provenance and limitations

- The application **does not fabricate NASA findings**.
- A CSV filename alone is never used to classify data as verified NASA data.
- Verified status requires explicit provenance metadata in `data/nasa_combustion_metadata.json` including NASA source references.
- If provenance metadata is missing or incomplete, the dataset is labeled **unverified**.
- If no uploaded dataset is available, the app uses `data/demo_combustion_data.csv` and clearly marks it as **demonstration data**.
- Demonstration data is for interface development only and must not be interpreted as real NASA experiment results.

## Dataset validation rules

The backend validates loaded data before visualization:

- Required columns must exist:
  - `experiment_id`,
  - `experiment_group`,
  - `time_s`,
  - `flame_temperature_k`,
  - `flame_height_mm`,
  - `oxygen_ratio_percent`.
- Numeric fields are validated for parseability.
- Missing values in required fields are rejected.
- Invalid measurements are rejected, including:
  - negative time,
  - non-positive temperature,
  - negative flame height,
  - oxygen concentration outside 0-100%.

## Project structure

```text
.
├── app.py
├── requirements.txt
├── data/
│   └── demo_combustion_data.csv
└── flame_in_freefall/
    ├── __init__.py
    ├── data.py
    ├── static/
    │   ├── css/style.css
    │   └── js/dashboard.js
    └── templates/
        └── index.html
```

## Local setup

1. Clone the repository.
2. Create and activate a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the app:

```bash
python app.py
```

5. Open `http://127.0.0.1:5000` in your browser.

## Notes for future development

- Keep data ingestion modular via `flame_in_freefall/data.py`.
- Add verified NASA datasets and provenance documentation before publishing scientific conclusions.
- Expand route structure and automated tests as the platform evolves.
