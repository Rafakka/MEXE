

from contextvars import ContextVar


request_id_context: ContextVar[str | None] = ContextVar(
    "request_id_context",
    default=None,
)

operation_context: ContextVar[str | None] = ContextVar(
    "operation_context",
    default=None,
)

