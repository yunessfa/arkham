"""Curated visual presets, stored through the existing SiteContent resource."""
from rest_framework import serializers

DESIGN_KEY = "site-design"
PALETTES = {"golden_gallery", "botanical_ivory", "rose_nectar", "mineral_sand", "noir_hive"}


def validate_design(settings):
    if not isinstance(settings, dict) or set(settings) != {"schemaVersion", "styleId"}:
        raise serializers.ValidationError("تنظیمات تم باید فقط schemaVersion و styleId داشته باشد.")
    if type(settings["schemaVersion"]) is not int or settings["schemaVersion"] != 1:
        raise serializers.ValidationError("نسخه تنظیمات تم پشتیبانی نمی‌شود.")
    if not isinstance(settings["styleId"], str) or settings["styleId"] not in PALETTES:
        raise serializers.ValidationError("تم انتخاب‌شده معتبر نیست.")
    return settings
