from datetime import datetime, timezone
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers


class HealthCheckView(APIView):
    """
    Public health check endpoint verifying system and database connectivity.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="System Health Check",
        description="Verify service availability and active database connection.",
        responses={
            200: inline_serializer(
                name="HealthSuccessResponse",
                fields={
                    "status": serializers.CharField(default="healthy"),
                    "database": serializers.CharField(default="connected"),
                    "version": serializers.CharField(default="1.0.0"),
                    "timestamp": serializers.DateTimeField(),
                }
            ),
            503: inline_serializer(
                name="HealthFailureResponse",
                fields={
                    "status": serializers.CharField(default="unhealthy"),
                    "database": serializers.CharField(default="disconnected"),
                    "version": serializers.CharField(default="1.0.0"),
                    "timestamp": serializers.DateTimeField(),
                    "error": serializers.CharField(),
                }
            )
        }
    )
    def get(self, request):
        db_status = "connected"
        is_healthy = True
        error_msg = None

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                if not row or row[0] != 1:
                    db_status = "error"
                    is_healthy = False
        except Exception as e:
            db_status = "disconnected"
            is_healthy = False
            error_msg = str(e)

        payload = {
            "status": "healthy" if is_healthy else "unhealthy",
            "database": db_status,
            "version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if not is_healthy and error_msg:
            payload["error"] = error_msg
            return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(payload, status=status.HTTP_200_OK)
