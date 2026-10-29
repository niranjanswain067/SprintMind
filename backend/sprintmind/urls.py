"""
SprintMind URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI Schema and Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1 routes
    path('api/v1/', include('core.urls')),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/workspaces/', include('apps.workspaces.urls')),
    path('api/v1/projects/', include('apps.projects.urls')),
    path('api/v1/issues/', include('apps.issues.urls')),
]
