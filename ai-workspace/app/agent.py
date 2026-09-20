from typing import Dict, Any, List


class Agent:
    def __init__(self):
        self.tools: Dict[str, Any] = {}

    def register_tool(self, name: str, func):
        self.tools[name] = func

    def plan(self, message: str) -> List[str]:
        plan = ["🧠 تحلیل درخواست"]
        if any(k in message.lower() for k in ["فایل", "pdf", "word", "zip", "file"]):
            plan.append("📎 بررسی فایل‌ها")
        if any(k in message.lower() for k in ["کد", "code", "python", "برنامه"]):
            plan.append("💻 حالت برنامه‌نویسی")
        plan.append("🛠️ اجرای ابزار")
        plan.append("✅ تولید پاسخ")
        return plan

    def state(self, message: str) -> Dict[str, Any]:
        return {"steps": self.plan(message), "tools_available": list(self.tools.keys())}


agent = Agent()