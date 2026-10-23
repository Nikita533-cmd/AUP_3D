from django.contrib import admin
from .models import Sprinkler, CalculateResult
from import_export.admin import ImportExportModelAdmin

@admin.register(Sprinkler)
class SprinklerAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(CalculateResult)
class CalculateResultAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
# @admin.register(Type)
# class TypeAdmin(admin.ModelAdmin):
#     list_display = ("tube_type", "nom_size", "ext_size", "thickness", "k_t", "kvelocity")
#     list_editable = ("nom_size", "ext_size", "thickness", "k_t", "kvelocity")
#     list_filter = ("tube_type",)
#     search_fields = ("tube_type__name",)