"""
اجرای سرور + ngrok برای دسترسی از راه دور
"""
import threading, time, sys
from pyngrok import ngrok, conf
from app.config import settings

def run_server():
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=False)

def main():
    token = settings.NGROK_AUTHTOKEN if hasattr(settings, "NGROK_AUTHTOKEN") else None
    if token:
        conf.get_default().auth_token = token

    print("🚀 در حال اجرای سرور...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    time.sleep(3)

    print("🌐 در حال باز کردن تونل عمومی...")
    try:
        public_url = ngrok.connect(settings.APP_PORT, "http").public_url
        print("\n" + "=" * 60)
        print(f"✅ لینک عمومی ربات شما:")
        print(f"   {public_url}")
        print("=" * 60)
        print("\n📱 این لینک رو به بابایی بده!")
        print("⚠️  برای بستن، Ctrl+C بزن.\n")
    except Exception as e:
        print(f"❌ خطا در باز کردن تونل: {e}")
        print("راه‌حل: توکن ngrok رو توی .env بذار (NGROK_AUTHTOKEN=...)")
        sys.exit(1)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 خداحافظ!")
        ngrok.disconnect()
        ngrok.kill()

if __name__ == "__main__":
    main()