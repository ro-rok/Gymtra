from typing import Literal

from pydantic import BaseModel

ReminderCategory = Literal["water", "meal_breakfast", "meal_lunch", "meal_dinner"]


class MemberRemindersRunResponse(BaseModel):
    processed: int
    sent: int
