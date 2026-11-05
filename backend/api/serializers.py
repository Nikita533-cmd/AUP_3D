"""Сериализаторы для API."""
import base64
from collections import Counter

from django.contrib.auth.hashers import make_password
from django.core.files.base import ContentFile
from django.db import transaction
from rest_framework import serializers
from elements.models import Sprinkler, CalculateResult, TubeType, Type



class SprinklerSerializer(serializers.ModelSerializer):
    """Сериализатор для класса TagViewSet."""
    class Meta:
        model = Sprinkler
        fields = ('name', 'K')

class ResultSerializer(serializers.ModelSerializer):
    
    """Сериализатор для класса TagViewSet."""
    class Meta:
        model = CalculateResult
        fields = ('name', 'data')

class TubeTypeSerializer(serializers.ModelSerializer):
    
    """Сериализатор для класса TagViewSet."""
    class Meta:
        model = TubeType
        fields = ('name', 'id')

class TypeSerializer(serializers.ModelSerializer):
    
    """Сериализатор для класса TagViewSet."""
    class Meta:
        model = Type
        fields = ('kvelocity', 'ext_size', 'k_t', 'nom_size')