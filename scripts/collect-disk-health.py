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
    "dataSsd": os.environ.get("KONFIRMASI_DATA_SSD_DEVICE", "/dev/sda"),
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


def attribute_display(attributes, names):
    attribute = find_attribute(attributes, names)
    if not attribute:
        return None
    raw = attribute.get("raw", {})
    if not isinstance(raw, dict):
        return None
    display = raw.get("string")
    if isinstance(display, str) and display.strip():
        return display.strip()
    value = nullable_number(raw.get("value"))
    return str(value) if value is not None else None


def attribute_bytes(attributes, names, logical_block_size=512):
    attribute = find_attribute(attributes, names)
    if not attribute:
        return None
    value = raw_value(attribute)
    if value is None:
        return None

    name = str(attribute.get("name", "")).lower()
    if "32mib" in name:
        multiplier = 32 * 1024 * 1024
    elif "gib" in name:
        multiplier = 1024 * 1024 * 1024
    elif "lbas" in name:
        multiplier = logical_block_size
    else:
        return None
    return value * multiplier


def nested_number(data, parent, field):
    value = data.get(parent, {})
    return nullable_number(value.get(field)) if isinstance(value, dict) else None


def nested_string(data, parent, field):
    value = data.get(parent, {})
    result = value.get(field) if isinstance(value, dict) else None
    return result.strip() if isinstance(result, str) and result.strip() else None


def latest_self_test(data):
    self_test_log = data.get("ata_smart_self_test_log", {})
    if not isinstance(self_test_log, dict):
        return None, None

    for log_name in ("standard", "extended"):
        log = self_test_log.get(log_name, {})
        table = log.get("table", []) if isinstance(log, dict) else []
        if not isinstance(table, list) or not table:
            continue
        latest = table[0]
        if not isinstance(latest, dict):
            continue
        test_type = nested_string(latest, "type", "string")
        status = nested_string(latest, "status", "string")
        lifetime_hours = nullable_number(latest.get("lifetime_hours"))
        description = " - ".join(value for value in (test_type, status) if value)
        return description or None, lifetime_hours

    return None, None


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
        "firmwareVersion": None,
        "capacityBytes": None,
        "interface": None,
        "status": "unavailable",
        "smartPassed": None,
        "temperatureC": None,
        "powerOnHours": None,
        "powerCycleCount": None,
        "smartErrorCount": None,
        "lastSelfTestStatus": None,
        "lastSelfTestHours": None,
        "reallocatedSectors": None,
        "pendingSectors": None,
        "offlineUncorrectable": None,
        "lifeRemainingPercentage": None,
        "hostWrites": None,
        "hostReads": None,
        "hostWritesBytes": None,
        "hostReadsBytes": None,
        "unsafeShutdowns": None,
        "crcErrorCount": None,
        "commandTimeouts": None,
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
    firmware = data.get("firmware_version")
    firmware = firmware.strip() if isinstance(firmware, str) and firmware.strip() else None
    capacity_bytes = nested_number(data, "user_capacity", "bytes")
    interface = (
        nested_string(data.get("interface_speed", {}), "current", "string")
        or nested_string(data, "sata_version", "string")
    )
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
    power_cycle_count = nullable_number(data.get("power_cycle_count"))
    smart_error_count = nested_number(
        data.get("ata_smart_error_log", {}),
        "summary",
        "count",
    )
    last_test_status, last_test_hours = latest_self_test(data)
    host_writes = attribute_display(
        attributes,
        {"Total_LBAs_Written", "Host_Writes_32MiB", "Host_Writes_GiB"},
    )
    host_reads = attribute_display(
        attributes,
        {"Total_LBAs_Read", "Host_Reads_32MiB", "Host_Reads_GiB"},
    )
    logical_block_size = nullable_number(data.get("logical_block_size")) or 512
    host_writes_bytes = attribute_bytes(
        attributes,
        {"Total_LBAs_Written", "Host_Writes_32MiB", "Host_Writes_GiB"},
        logical_block_size,
    )
    host_reads_bytes = attribute_bytes(
        attributes,
        {"Total_LBAs_Read", "Host_Reads_32MiB", "Host_Reads_GiB"},
        logical_block_size,
    )
    unsafe_shutdowns = attribute_raw(
        attributes,
        {"Unsafe_Shutdown_Count", "Unexpected_Power_Loss_Ct", "Power_Loss_Protection_Failure"},
    )
    crc_errors = attribute_raw(attributes, {"UDMA_CRC_Error_Count"})
    command_timeouts = attribute_raw(attributes, {"Command_Timeout"})

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
        "firmwareVersion": firmware,
        "capacityBytes": capacity_bytes,
        "interface": interface,
        "status": status,
        "smartPassed": smart_passed,
        "temperatureC": temperature_c,
        "powerOnHours": power_on_hours,
        "powerCycleCount": power_cycle_count,
        "smartErrorCount": smart_error_count,
        "lastSelfTestStatus": last_test_status,
        "lastSelfTestHours": last_test_hours,
        "reallocatedSectors": reallocated,
        "pendingSectors": pending,
        "offlineUncorrectable": uncorrectable,
        "lifeRemainingPercentage": remaining,
        "hostWrites": host_writes,
        "hostReads": host_reads,
        "hostWritesBytes": host_writes_bytes,
        "hostReadsBytes": host_reads_bytes,
        "unsafeShutdowns": unsafe_shutdowns,
        "crcErrorCount": crc_errors,
        "commandTimeouts": command_timeouts,
    }


def main():
    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "hdd": read_device(DEVICES["hdd"], False),
        "ssd": read_device(DEVICES["ssd"], True),
        "dataSsd": read_device(DEVICES["dataSsd"], True),
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
