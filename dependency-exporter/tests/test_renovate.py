from datetime import datetime, timezone

from app.renovate import (
    is_renovate_merge_request,
    parse_renovate_merge_request,
    get_renovate_merge_requests,
    get_oldest_renovate_mr_age_seconds,
)


def test_is_renovate_merge_request():
    merge_request = {
        "source_branch": "renovate/some-dependency"
    }

    assert is_renovate_merge_request(merge_request) is True

def test_is_not_renovate_merge_request():
    merge_request = {
        "source_branch": "feature/some-change"
    }

    assert is_renovate_merge_request(merge_request) is False

def test_is_not_renovate_merge_request_when_branch_contains_renovate():
    merge_request = {
        "source_branch": "feature/renovate-change"
    }

    assert is_renovate_merge_request(merge_request) is False

def test_is_not_renovate_merge_request_without_source_branch():
    merge_request = {}

    assert is_renovate_merge_request(merge_request) is False

def test_is_not_renovate_when_author_is_renovate():
    merge_request = {
        "author": {
            "username": "renovate"
        },
        "source_branch": "feature/my-change"
    }

    assert is_renovate_merge_request(merge_request) is False

def test_parse_renovate_merge_request_with_update_type():
    merge_request = {
        "description": """
    This MR contains the following updates:

    | Package | Update | Change |
    |---|---|---|
    | grafana/alloy | patch | `v1.19.1` → `v1.19.2` |
    """
    }

    result = parse_renovate_merge_request(merge_request)

    assert result == {
        "package": "grafana/alloy",
        "current_version": "1.19.1",
        "new_version": "1.19.2",
        "update_type": "patch",
    }

def test_parse_renovate_merge_request_without_update_type():
    merge_request = {
        "description": """
    This MR contains the following updates:

    | Package | Change | Age | Confidence |
    |---|---|---|---|
    | coverage | `==7.15.0` → `==7.15.4` | age | confidence |
    """
    }

    result = parse_renovate_merge_request(merge_request)

    assert result == {
        "package": "coverage",
        "current_version": "7.15.0",
        "new_version": "7.15.4",
        "update_type": "unknown",
    }

def test_parse_non_renovate_description():
    merge_request = {
        "description": "This is a normal merge request."
    }

    result = parse_renovate_merge_request(merge_request)

    assert result is None

def test_get_renovate_merge_requests():
    merge_requests = [
        {
            "source_branch": "renovate/dependency-a",
        },
        {
            "source_branch": "feature/some-change",
        },
        {
            "source_branch": "renovate/dependency-b",
        },
    ]

    result = get_renovate_merge_requests(merge_requests)

    assert len(result) == 2

def test_get_oldest_renovate_mr_age_seconds():
    merge_requests = [
        {
            "source_branch": "renovate/dependency-a",
            "created_at": "2026-08-28T04:00:00Z",
        },
        {
            "source_branch": "renovate/dependency-b",
            "created_at": "2026-08-28T05:00:00Z",
        },
        {
            "source_branch": "feature/documentation",
            "created_at": "2026-08-28T01:00:00Z",
        },
    ]

    now = datetime(
        2026,
        8,
        28,
        6,
        0,
        tzinfo=timezone.utc,
    )

    result = get_oldest_renovate_mr_age_seconds(
        merge_requests,
        now=now,
    )

    assert result == 7200
