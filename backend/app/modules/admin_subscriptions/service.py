from datetime import datetime

from bson import ObjectId
from fastapi import HTTPException, status

from app.modules.admin_subscriptions.repository import AdminSubscriptionsRepository
from app.modules.admin_subscriptions.schemas import SubscriptionResponse, SubscriptionUpdatePayload


class AdminSubscriptionsService:
    def __init__(self, repo: AdminSubscriptionsRepository):
        self.repo = repo

    @staticmethod
    def _format_date(value) -> str:
        if value is None:
            return ""
        if isinstance(value, datetime):
            return value.date().isoformat()
        return str(value)

    def _to_response(self, row: dict) -> SubscriptionResponse:
        return SubscriptionResponse(
            id=str(row.get("_id")),
            gymId=str(row.get("gym_id")),
            plan=row.get("plan", "Starter"),
            seats=int(row.get("seats", 1)),
            usedSeats=int(row.get("used_seats", 0)),
            status=row.get("status", "trial"),
            startDate=self._format_date(row.get("start_date")),
            endDate=self._format_date(row.get("end_date")),
            monthlyAmount=float(row.get("base_amount", row.get("monthly_amount", 0))),
            extraSeatPrice=float(row.get("extra_staff_price", row.get("extra_seat_price", 0))),
        )

    def list_subscriptions(self) -> list[SubscriptionResponse]:
        return [self._to_response(row) for row in self.repo.list_subscriptions()]

    def update_subscription(self, gym_id: str, payload: SubscriptionUpdatePayload) -> SubscriptionResponse:
        if not ObjectId.is_valid(gym_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
        update_data = {}
        if payload.plan is not None:
            update_data["plan"] = payload.plan
        if payload.seatCount is not None:
            update_data["seats"] = payload.seatCount
        if payload.usedSeats is not None:
            update_data["used_seats"] = payload.usedSeats
        if payload.baseAmount is not None:
            update_data["base_amount"] = payload.baseAmount
            update_data["monthly_amount"] = payload.baseAmount
        if payload.extraStaffPrice is not None:
            update_data["extra_staff_price"] = payload.extraStaffPrice
            update_data["extra_seat_price"] = payload.extraStaffPrice
        if payload.status is not None:
            update_data["status"] = payload.status
        if payload.periodStart is not None:
            update_data["start_date"] = payload.periodStart
        if payload.periodEnd is not None:
            update_data["end_date"] = payload.periodEnd
        row = self.repo.upsert_by_gym_id(ObjectId(gym_id), update_data)
        return self._to_response(row)
