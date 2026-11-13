from flask import Flask, render_template

from .data import DatasetLoadError, get_dataset_summary, get_visualization_payload


def create_app() -> Flask:
    app = Flask(__name__)

    @app.route("/")
    def index() -> str:
        """Render the single-page dashboard foundation."""
        dataset_summary = get_dataset_summary()
        chart_data = get_visualization_payload()
        return render_template(
            "index.html",
            dataset_summary=dataset_summary,
            chart_data=chart_data,
            dataset_load_error=False,
        )

    @app.errorhandler(DatasetLoadError)
    def handle_dataset_error(error: DatasetLoadError):
        return (
            render_template(
                "index.html",
                dataset_summary=error.fallback_summary,
                chart_data={},
                dataset_load_error=True,
            ),
            200,
        )

    return app
