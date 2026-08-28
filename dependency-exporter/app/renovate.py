import re
from datetime import datetime, timezone

def is_renovate_merge_request(merge_request: dict) -> bool:
    source_branch = merge_request.get("source_branch", "")

    return source_branch.startswith("renovate/")


def parse_renovate_merge_request(merge_request: dict) -> dict | None:
    description = merge_request.get("description", "")

    lines = [
        line.strip()
        for line in description.splitlines()
        if line.strip().startswith("|")
    ]

    if len(lines) < 3:
        return None

    headers = [
        cell.strip().lower()
        for cell in lines[0].strip("|").split("|")
    ]

    separator = lines[1]

    if not all(
        set(cell.strip()) <= {"-", ":"}
        for cell in separator.strip("|").split("|")
    ):
        return None

    try:
        package_index = headers.index("package")
        change_index = headers.index("change")
    except ValueError:
        return None

    update_index = (
        headers.index("update")
        if "update" in headers
        else None
    )

    values = [
        cell.strip()
        for cell in lines[2].strip("|").split("|")
    ]

    if len(values) != len(headers):
        return None

    package = values[package_index]
    change = values[change_index]

    version_match = re.search(
        r"`([^`]+)`\s*→\s*`([^`]+)`",
        change,
    )

    if not version_match:
        return None

    current_version = version_match.group(1)
    new_version = version_match.group(2)

    current_version = re.sub(
        r"^[^0-9]*",
        "",
        current_version,
    )

    new_version = re.sub(
        r"^[^0-9]*",
        "",
        new_version,
    )

    update_type = "unknown"

    if update_index is not None:
        update_value = values[update_index].lower()

        if update_value in {"major", "minor", "patch"}:
            update_type = update_value

    return {
        "package": package,
        "current_version": current_version,
        "new_version": new_version,
        "update_type": update_type,
    }

def get_renovate_merge_requests(
    merge_requests: list[dict],
) -> list[dict]:
    return [
        merge_request
        for merge_request in merge_requests
        if is_renovate_merge_request(merge_request)
    ]

def get_oldest_renovate_mr_age_seconds(
    merge_requests: list[dict],
    now: datetime | None = None,
) -> float:

    renovate_mrs = get_renovate_merge_requests(merge_requests)

    if not renovate_mrs:
        return 0.0

    if now is None:
        now = datetime.now(timezone.utc)

    ages = [
        (
            now
            - datetime.fromisoformat(
                merge_request["created_at"].replace("Z", "+00:00")
            )
        ).total_seconds()
        for merge_request in renovate_mrs
        if merge_request.get("created_at")
    ]

    if not ages:
        return 0.0

    return max(ages)
