import os

class Config:
    """Konfigurasi aplikasi Flask"""
    
    # Secret key untuk session (ganti dengan random string untuk production)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Folder untuk upload dan model
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    MODEL_DIR = os.path.join(BASE_DIR, 'models')
    UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
    
    # Maksimum ukuran file upload (16 MB)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    
    # Allowed extensions untuk upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    
    # Model configuration
    MODEL_PATH = os.path.join(MODEL_DIR, 'sign_language_model.pkl')
    
    # Image preprocessing settings
    IMAGE_SIZE = (224, 224)  # Sesuaikan dengan input model Anda
    
    # Confidence threshold
    CONFIDENCE_THRESHOLD = 0.5
    
    # Debug mode
    DEBUG = True

# Buat folder jika belum ada
os.makedirs(Config.UPLOAD_DIR, exist_ok=True)
os.makedirs(Config.MODEL_DIR, exist_ok=True)