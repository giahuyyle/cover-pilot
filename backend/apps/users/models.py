from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone


@dataclass
class User:
    """
    Represents a user profile stored in Firestore.

    Firebase Auth manages authentication (email, password, tokens).
    This dataclass stores profile data that Firebase Auth doesn't handle.

    The `uid` is the Firebase Auth UID — used as the Firestore document ID.
    """

    uid: str
    email: str
    display_name: str = ""
    photo_url: str = ""
    bio: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(
            uid=data.get("uid", ""),
            email=data.get("email", ""),
            display_name=data.get("display_name", ""),
            photo_url=data.get("photo_url", ""),
            bio=data.get("bio", ""),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
        )
