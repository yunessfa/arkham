"""Persian text helpers shared by search, addresses and OTP input.

Mobile keyboards in Iran mix Arabic and Persian code points (ي/ی، ك/ک) and
send Persian or Arabic-Indic digits. Everything that is compared or stored as
an identifier goes through these helpers first.
"""

DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
LETTERS = str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه", "‏": "", "‎": ""})


def latin_digits(value):
    return str(value or "").translate(DIGITS)


def normalize_fa(value):
    """Canonical Persian form: Persian ی/ک, Latin digits, single spaces."""
    text = latin_digits(value).translate(LETTERS)
    return " ".join(text.split())


def search_variants(value):
    """The normalized query plus its Arabic-letter spelling.

    Rows saved before normalization (or pasted from Arabic keyboards) still
    match, without a data migration and on both PostgreSQL and SQLite.
    """
    base = normalize_fa(value)[:180]
    if not base:
        return []
    arabic = base.replace("ی", "ي").replace("ک", "ك")
    return list(dict.fromkeys([base, arabic]))


def normalize_phone(value):
    """Return 09xxxxxxxxx for common Iranian mobile spellings, else ''."""
    digits = "".join(ch for ch in latin_digits(value) if ch.isdigit())
    if digits.startswith("0098"):
        digits = "0" + digits[4:]
    elif digits.startswith("98") and len(digits) == 12:
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    return digits if len(digits) == 11 and digits.startswith("09") else ""
