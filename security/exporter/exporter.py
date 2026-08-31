
import glob
import json
import os

from flask import Flask, Response
from prometheus_client import Gauge, generate_latest

app = Flask(__name__)

RESULTS_DIR = os.getenv("RESULTS_DIR", "/results")

vulnerabilities = Gauge(
    "mexe_security_vulnerabilities",
    "MEXE vulnerabilities detected by Trivy",
    [
        "image",
        "vulnerability_id",
        "package",
        "severity",
        "installed_version",
        "fixed_version",
    ],
)


def load_results() -> list[dict]:
    results = []

    CURRENT_DIR = os.path.join(RESULTS_DIR, "current")

    for path in glob.glob(os.path.join(CURRENT_DIR, "*.json")):
        with open(path, encoding="utf-8") as file:
            results.append(json.load(file))

    return results


def update_metrics() -> None:
    vulnerabilities.clear()

    for report in load_results():
        for result in report.get("Results", []):
            for vulnerability in result.get("Vulnerabilities", []) or []:
                vulnerabilities.labels(
                    image=report.get("ArtifactName", "unknown"),
                    vulnerability_id=vulnerability.get(
                        "VulnerabilityID", "unknown"
                    ),
                    package=vulnerability.get("PkgName", "unknown"),
                    severity=vulnerability.get("Severity", "UNKNOWN"),
                    installed_version=vulnerability.get(
                        "InstalledVersion", "unknown"
                    ),
                    fixed_version=vulnerability.get(
                        "FixedVersion", ""
                    ),
                ).set(1)


@app.get("/metrics")
def metrics():
    update_metrics()
    return Response(
        generate_latest(),
        mimetype="text/plain",
    )


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
