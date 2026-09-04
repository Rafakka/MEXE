import uuid


class RequestIdService:

    def get_or_create(self, request) -> str:

        request_id = request.headers.get("X-Request-ID")

        if not request_id:
            request_id = str(uuid.uuid4())

        return request_id

    def get(self, request) -> str:

        return request.state.request_id


