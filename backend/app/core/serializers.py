from bson import ObjectId


def as_str_id(value: ObjectId | str | None) -> str | None:
    if value is None:
        return None
    return str(value)

