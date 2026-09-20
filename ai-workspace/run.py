"""
AI Workspace - Local Development Runner
اجرا: python run.py
"""
import os
import sys
import webbrowser
import threading
import time
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════
# اضافه کردن مسیر پروژه به sys.path
# ═══════════════════════════════════════════════════════════════════
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def get_local_ip() -> str:
    """گرفتن IP داخلی کامپیوتر (برای نمایش به کاربر)"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def print_banner(host: str, port: int):
    """نمایش بنر خوش‌آمد با اطلاعات سرور"""
    local_ip = get_local_ip()
    print()
    print("=" * 66)
    print("  🧠  AI WORKSPACE  ─  سرور در حال اجراست")
    print("=" * 66)
    print()
    print(f"  💻  دسترسی محلی (خودت):")
    print(f"      http://localhost:{port}")
    print(f"      http://127.0.0.1:{port}")
    print()
    print(f"  📱  دسترسی از شبکه (موبایل / بقیه دستگاه‌ها):")
    print(f"      http://{local_ip}:{port}")
    print()
    print(f"  🌐  برای دسترسی از راه دور، اجرا کن:")
    print(f"      python start_public.py")
    print()
    print("-" * 66)
    print(f"  🔐  ورود ادمین پیش‌فرض:")
    print(f"      Username: admin")
    print(f"      Password: m0641370261")
    print()
    print("-" * 66)
    print(f"  ⚠️  برای بستن سرور: Ctrl + C")
    print("=" * 66)
    print()


def open_browser(url: str, delay: float = 1.5):
    """باز کردن مرورگر بعد از تاخیر"""
    def _open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
        except Exception:
            pass
    threading.Thread(target=_open, daemon=True).start()


def main():
    # ═══════════════════════════════════════════════════════════════
    # بررسی نسخه‌ی پایتون
    # ═══════════════════════════════════════════════════════════════
    if sys.version_info < (3, 8):
        print("❌ خطا: نیاز به Python 3.8 یا بالاتر داری.")
        print(f"   نسخه‌ی فعلی: {sys.version}")
        sys.exit(1)

    # ═══════════════════════════════════════════════════════════════
    # بررسی نصب بودن پکیج‌های اصلی
    # ═══════════════════════════════════════════════════════════════
    try:
        import uvicorn
    except ImportError:
        print("❌ خطا: پکیج uvicorn نصب نیست.")
        print("   اجرا کن: pip install -r requirements.txt")
        sys.exit(1)

    try:
        from app.config import settings
    except ImportError as e:
        print(f"❌ خطا در import کردن config: {e}")
        print("   مطمئن شو توی پوشه‌ی پروژه هستی و فایل app/config.py وجود داره.")
        sys.exit(1)

    # ═══════════════════════════════════════════════════════════════
    # تنظیمات
    # ═══════════════════════════════════════════════════════════════
    HOST = settings.APP_HOST if hasattr(settings, "APP_HOST") else "0.0.0.0"
    PORT = settings.APP_PORT if hasattr(settings, "APP_PORT") else 8000

    # اگه پورت اشغال بود، یه پورت دیگه بردار
    def is_port_free(port: int) -> bool:
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", port))
                return True
            except OSError:
                return False

    original_port = PORT
    if not is_port_free(PORT):
        print(f"⚠️  پورت {PORT} اشغاله. جستجوی پورت آزاد...")
        for p in range(PORT + 1, PORT + 20):
            if is_port_free(p):
                PORT = p
                print(f"✅ پورت {p} انتخاب شد.")
                break
        else:
            print(f"❌ هیچ پورت آزادی پیدا نشد.")
            sys.exit(1)

    # ═══════════════════════════════════════════════════════════════
    # نمایش بنر
    # ═══════════════════════════════════════════════════════════════
    print_banner(HOST, PORT)

    # ═══════════════════════════════════════════════════════════════
    # باز کردن مرورگر (اگه محلی هستیم)
    # ═══════════════════════════════════════════════════════════════
    if os.getenv("NO_BROWSER", "").lower() not in ("1", "true", "yes"):
        open_browser(f"http://localhost:{PORT}")

    # ═══════════════════════════════════════════════════════════════
    # اجرای سرور
    # ═══════════════════════════════════════════════════════════════
    try:
        uvicorn.run(
            "app.main:app",
            host=HOST,
            port=PORT,
            reload=True,
            reload_dirs=[str(BASE_DIR / "app")],
            log_level="info",
            access_log=True,
        )
    except KeyboardInterrupt:
        print("\n👋 سرور متوقف شد. خداحافظ!")
    except Exception as e:
        print(f"\n❌ خطا در اجرای سرور: {e}")
        sys.exit(1)


# ═══════════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    main()