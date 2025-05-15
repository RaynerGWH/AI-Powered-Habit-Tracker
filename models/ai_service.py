import requests
import json
from datetime import datetime, timedelta

class AIService:
    def __init__(self, model="phi"):
        self.model = model
        self.api_url = "http://localhost:11434/api/generate"
    
    def analyze_patterns(self, habits_data):
        """
        Analyze habit completion patterns
        
        This will be fully implemented in Day 3 with Ollama integration.
        For now, it's a placeholder that returns basic analytics.
        """
        insights = {
            "message": "Pattern analysis will be implemented on Day 3",
            "analysis_ready": False,
            "basic_stats": {}
        }
        
        # Basic analytics without AI (placeholder)
        if habits_data and len(habits_data) > 0:
            total_completions = sum(len(habit.get('completions', [])) for habit in habits_data)
            avg_completions = total_completions / len(habits_data) if len(habits_data) > 0 else 0
            
            # Find best performing habit
            best_habit = None
            best_completion_count = -1
            
            for habit in habits_data:
                completion_count = len(habit.get('completions', []))
                if completion_count > best_completion_count:
                    best_completion_count = completion_count
                    best_habit = habit
            
            # Calculate overall completion rate
            today = datetime.now().date()
            thirty_days_ago = (today - timedelta(days=30)).isoformat()
            
            recent_completions = 0
            for habit in habits_data:
                for completion in habit.get('completions', []):
                    if completion.get('date') >= thirty_days_ago:
                        recent_completions += 1
            
            overall_rate = min(recent_completions / (30 * len(habits_data)) * 100, 100) if len(habits_data) > 0 else 0
            
            insights["basic_stats"] = {
                "total_habits": len(habits_data),
                "total_completions": total_completions,
                "avg_completions_per_habit": round(avg_completions, 1),
                "best_performing_habit": best_habit["name"] if best_habit else None,
                "overall_completion_rate": round(overall_rate, 1)
            }
            
            # If there's enough data, mark analysis as ready
            if total_completions > 5:
                insights["analysis_ready"] = True
        
        return insights
    
    def suggest_goals(self, habits_data, patterns):
        """
        Suggest adaptive goals based on habit patterns
        
        This will be implemented on Day 4 with Ollama integration.
        For now, returns a placeholder message.
        """
        if not habits_data or len(habits_data) == 0:
            return {"message": "Add some habits to get goal suggestions"}
        
        # Basic placeholder suggestions
        total_completions = sum(len(habit.get('completions', [])) for habit in habits_data)
        
        if total_completions < 5:
            return {
                "message": "Goal suggestions will be available after more habit tracking",
                "suggestion": "Try to complete at least one habit every day"
            }
        
        return {
            "message": "Adaptive goal-setting will be implemented on Day 4",
            "placeholder_suggestion": "Keep up the good work! Try to increase your consistency."
        }
    
    def _call_ollama_api(self, prompt, system_prompt=None):
        """
        Call the local Ollama API
        
        This will be implemented on Day 3. For now, it's a placeholder.
        """
        return {
            "message": "Ollama integration will be implemented on Day 3",
            "prompt_received": prompt[:100] + "..." if len(prompt) > 100 else prompt
        }