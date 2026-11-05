"""URL-маршруты для API v1."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import RecipeViewSet, ResultViewSet, tubes_list, tubes_types

router = DefaultRouter()
router.register('sprinkler', RecipeViewSet)
router.register('results', ResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('tubes/types/', tubes_types),
    path('tubes/list/<int:type_id>/', tubes_list )
]