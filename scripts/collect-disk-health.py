#!/usr/bin/env python3
import json
import math
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_PATH = Path(os.environ.get("DISK_HEALTH_PATH", "/var/lib/konfirmasi/disk-health.json"))
DEVICES = {
    "hdd": os.environ.get("KONFIRMASI_HDD_DEVICE", "/dev/sdb"),
    "ssd": os.environ.get("KONFIRMASI_SSD_DEVICE", "/dev/sdc"),
}


def nullable_number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return value
    return None


def raw_value(attribute):
    raw = attribute.get("raw", {})
    return nullable_number(raw.get("value")) if isinstance(raw, dict) else None


def find_attribute(attributes, names):
    normalized_names = {name.lower() for name in names}
    for attribute in attributes:
        name = str(attribute.get("name", "")).lower()
        if name in normalized_names:
            return attribute
    return None


def attribute_raw(attributes, names):
    attribute = find_attribute(attributes, names)
    return raw_value(attribute) if attribute else None


def life_remaining(attributes, data):
    percentage_used = nullable_number(data.get("percentage_used"))
    if percentage_used is not None:
        return max(0, min(100, round(100 - percentage_used)))

    attribute = find_attribute(
        attributes,
        {
            "Media_Wearout_Indicator",
            "Percent_Lifetime_Remain",
            "SSD_Life_Left",
            "Remaining_Lifetime_Perc",
        },
    )
    if not attribute:
        return None

    normalized = nullable_number(attribute.get("value"))
    return max(0, min(100, round(normalized))) if normalized is not None else None


def unavailable(model="Tidak tersedia"):
    return {
        "model": model,
        "status": "unavailable",
        "smartPassed": None,
        "temperatureC": None,
        "powerOnHours": None,
        "reallocatedSectors": None,
        "pendingSectors": None,
        "offlineUncorrectable": None,
        "lifeRemainingPercentage": None,
    }


def read_device(device, is_ssd):
    try:
        result = subprocess.run(
            ["smartctl", "-a", "-j", device],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        data = json.loads(result.stdout)
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
        return unavailable()

    model = str(data.get("model_name") or data.get("product") or device)
    smart_status = data.get("smart_status", {})
    smart_passed = smart_status.get("passed") if isinstance(smart_status, dict) else None
    if not isinstance(smart_passed, bool):
        smart_passed = None

    temperature = data.get("temperature", {})
    temperature_c = (
        nullable_number(temperature.get("current")) if isinstance(temperature, dict) else None
    )
    power_on_time = data.get("power_on_time", {})
    power_on_hours = (
        nullable_number(power_on_time.get("hours")) if isinstance(power_on_time, dict) else None
    )

    ata_attributes = data.get("ata_smart_attributes", {})
    attributes = ata_attributes.get("table", []) if isinstance(ata_attributes, dict) else []
    if not isinstance(attributes, list):
        attributes = []

    reallocated = attribute_raw(attributes, {"Reallocated_Sector_Ct", "Reallocated_Event_Count"})
    pending = attribute_raw(attributes, {"Current_Pending_Sector", "Total_Pending_Sectors"})
    uncorrectable = attribute_raw(
        attributes,
        {"Offline_Uncorrectable", "Reported_Uncorrect", "Uncorrectable_Sector_Ct"},
    )
    remaining = life_remaining(attributes, data) if is_ssd else None

    if smart_passed is False:
        status = "critical"
    elif (
        (temperature_c is not None and temperature_c >= 60)
        or (pending is not None and pending > 0)
        or (uncorrectable is not None and uncorrectable > 0)
        or (reallocated is not None and reallocated > 0)
        or (remaining is not None and remaining <= 20)
    ):
        status = "warning"
    elif smart_passed is True:
        status = "healthy"
    else:
        status = "unavailable"

    return {
        "model": model,
        "status": status,
        "smartPassed": smart_passed,
        "temperatureC": temperature_c,
        "powerOnHours": power_on_hours,
        "reallocatedSectors": reallocated,
        "pendingSectors": pending,
        "offlineUncorrectable": uncorrectable,
        "lifeRemainingPercentage": remaining,
    }


def main():
    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "hdd": read_device(DEVICES["hdd"], False),
        "ssd": read_device(DEVICES["ssd"], True),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=OUTPUT_PATH.parent,
        prefix=".disk-health-",
        delete=False,
    ) as temporary:
        json.dump(payload, temporary, separators=(",", ":"))
        temporary.write("\n")
        temporary_path = Path(temporary.name)

    os.chmod(temporary_path, 0o644)
    os.replace(temporary_path, OUTPUT_PATH)


if __name__ == "__main__":
    main()
