from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite:///./roadguardian.db"
    
    # WebSocket
    WS_HOST: str = "0.0.0.0"
    WS_PORT: int = 8000
    
    # Risk thresholds
    DROWSINESS_THRESHOLD: float = 0.7
    DISTRACTION_THRESHOLD: float = 0.6
    ACCIDENT_COUNTDOWN_SECONDS: int = 30
    
    # Google Gemini API
    GEMINI_API_KEY: str = ""

    # MSG91 & Emergency Contacts
    MSG91_AUTHKEY: str = ""
    MSG91_FLOW_ID: str = ""
    MSG91_SENDER_ID: str = ""
    MSG91_TEMPLATE_ID: str = ""
    EMERGENCY_CONTACT_1: str = ""
    EMERGENCY_CONTACT_2: str = ""
    MSG91_COUNTRY_CODE: str = "91"
    ACCIDENT_SMS_COOLDOWN_MS: int = 300000

settings = Settings()
