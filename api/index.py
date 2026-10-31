import os
import sys
from pathlib import Path

# Ensure backend directory is in Python path for Django imports
BASE_DIR = Path(__file__).resolve().parent.parent
backend_path = str(BASE_DIR / 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sprintmind.settings')

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
