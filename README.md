# Flame in Freefall

Flame in Freefall is an initial web application foundation for the NASA Space Apps Challenge 2026. The platform is focused on microgravity combustion exploration and spacecraft fire-safety context, with a clean architecture ready for verified NASA dataset integration.

## Features in this foundation

- Responsive, dark space-science themed interface (desktop/tablet/mobile).
- Landing page with project purpose and scientific context.
- Dashboard section for combustion experiment exploration.
- Dataset information panel with clear source labeling.
- Flame behaviour analysis and three Plotly visualization areas:
  - line chart,
  - bar chart,
  - experiment comparison scatter chart.
- Dedicated microgravity combustion and spacecraft fire-safety sections.
- About and references section with official NASA links.

## Data integrity and NASA-source handling

- The application **does not fabricate NASA findings**.
- If a verified NASA CSV is not integrated yet, the app loads demonstration data from `data/demo_combustion_data.csv` and clearly marks it as demonstration-only.
- To integrate verified data later, add `data/nasa_combustion_verified.csv` using validated NASA source material.

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
- Expand route structure and add automated tests as the platform evolves.
