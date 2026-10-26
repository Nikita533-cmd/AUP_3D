"""URL-маршруты для API v1."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import RecipeViewSet, ResultViewSet

router = DefaultRouter()
router.register('sprinkler', RecipeViewSet)
router.register('results', ResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
]