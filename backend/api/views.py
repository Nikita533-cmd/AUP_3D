from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, viewsets, mixins
from elements.models import Sprinkler, CalculateResult, Type, TubeType
from rest_framework.pagination import LimitOffsetPagination
from api.serializers import SprinklerSerializer, ResultSerializer, TypeSerializer, TubeTypeSerializer
from django_filters.rest_framework import DjangoFilterBackend



class RecipeViewSet(
    mixins.ListModelMixin,  # GET (список)
    mixins.RetrieveModelMixin,  # GET (один объект по id)
    mixins.CreateModelMixin,  # POST (создание)
    viewsets.GenericViewSet,
):
    queryset = Sprinkler.objects.all()
    serializer_class = SprinklerSerializer
    # pagination_class = LimitOffsetPagination
    # filter_backends = [DjangoFilterBackend]
    filterset_fields = ['name', 'K']

class ResultViewSet(
    mixins.ListModelMixin,  # GET (список)
    mixins.RetrieveModelMixin,  # GET (один объект по id)
    mixins.CreateModelMixin,  # POST (создание)
    viewsets.GenericViewSet,
):
    queryset = CalculateResult.objects.all()
    serializer_class = ResultSerializer
    # pagination_class = LimitOffsetPagination
    # filter_backends = [DjangoFilterBackend]
    # filterset_fields = ['name', 'K']


@api_view(['GET'])
def tubes_types(request):
    data = TubeType.objects.all()
    serializer = TubeTypeSerializer(instance=data, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def tubes_list(request, type_id: int):
    data = Type.objects.filter(tube_type=type_id)
    serializer = TypeSerializer(instance=data, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)