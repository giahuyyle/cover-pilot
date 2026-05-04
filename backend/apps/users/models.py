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
    full_name: str = ""
    display_name: str = ""
    photo_url: str = ""
    bio: str = ""
    basic: dict = field(default_factory=dict)
    experience: list = field(default_factory=list)
    projects: list = field(default_factory=list)
    education: list = field(default_factory=list)
    certificates: list = field(default_factory=list)
    skills: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(
            uid=data.get("uid", ""),
            email=data.get("email", ""),
            full_name=data.get("full_name", ""),
            display_name=data.get("display_name", ""),
            photo_url=data.get("photo_url", ""),
            bio=data.get("bio", ""),
            basic=data.get("basic", {}) if isinstance(data.get("basic"), dict) else {},
            experience=data.get("experience", []) if isinstance(data.get("experience"), list) else [],
            projects=data.get("projects", []) if isinstance(data.get("projects"), list) else [],
            education=data.get("education", []) if isinstance(data.get("education"), list) else [],
            certificates=data.get("certificates", []) if isinstance(data.get("certificates"), list) else [],
            skills=data.get("skills", []) if isinstance(data.get("skills"), list) else [],
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
        )
