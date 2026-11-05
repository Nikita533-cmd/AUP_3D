from django.contrib import admin
from .models import Sprinkler, CalculateResult, Type, TubeType
from import_export.admin import ImportExportModelAdmin

@admin.register(Sprinkler)
class SprinklerAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(CalculateResult)
class CalculateResultAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(TubeType)
class TypeAdmin(admin.ModelAdmin):
    pass
@admin.register(Type)
class TypeAdmin(admin.ModelAdmin):
    list_display = ("nom_size",)
    search_fields = ("nom_size",)