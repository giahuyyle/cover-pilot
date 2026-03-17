from enum import Enum


class ResumeTemplate(str, Enum):
    CLASSIC = "classic"
    MODERN = "modern"
    MINIMAL = "minimal"
    ACADEMIC = "academic"

    @classmethod
    def choices(cls) -> list[str]:
        return [t.value for t in cls]

    @classmethod
    def default(cls) -> str:
        return cls.CLASSIC.value
