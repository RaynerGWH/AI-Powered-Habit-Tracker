import requests
import json
from datetime import datetime, timedelta
import os

class AIService:
    def __init__(self, model="mistral"):
        self.model = model
        self.api_url = "http://localhost:11434/api/generate"
        
    def analyze_patterns(self, habits_data):
        """
        Analyze habit completion patterns using Ollama's Mistral model
        """
        # If no habits or not enough data, return basic message
        if not habits_data or len(habits_data) == 0:
            return {
                "message": "Add some habits to get insights",
                "analysis_ready": False
            }
            
        # Count total completions to see if we have enough data
        total_completions = sum(len(habit.get('completions', [])) for habit in habits_data)
        
        if total_completions < 3:
            # Not enough data for meaningful analysis
            return {
                "message": "Complete more habits to get AI insights",
                "analysis_ready": False,
                "basic_stats": self._calculate_basic_stats(habits_data)
            }
        
        # We have enough data, so let's analyze patterns
        insights = self._calculate_basic_stats(habits_data)
        
        # For each habit with enough data, analyze patterns
        habits_with_insights = []
        
        for habit in habits_data:
            if len(habit.get('completions', [])) >= 3:
                habit_insight = self._analyze_habit_pattern(habit)
                habits_with_insights.append({
                    "habit_name": habit.get('name'),
                    "habit_id": habit.get('id'),
                    "insight": habit_insight
                })
        
        # Generate overall analysis using Ollama
        if habits_with_insights:
            overall_analysis = self._generate_overall_analysis(habits_data, insights)
            
            return {
                "message": "AI analysis complete",
                "analysis_ready": True,
                "basic_stats": insights,
                "habit_insights": habits_with_insights,
                "overall_analysis": overall_analysis
            }
        else:
            return {
                "message": "Track more habit completions to get detailed insights",
                "analysis_ready": False,
                "basic_stats": insights
            }
    
    def suggest_goals(self, habits_data, patterns):
        """
        Suggest adaptive goals based on habit patterns
        This will be implemented on Day 4 with Ollama integration.
        """
        if not habits_data or len(habits_data) == 0:
            return {"message": "Add some habits to get goal suggestions"}
        
        # Check if we have enough data for goal suggestions
        total_completions = sum(len(habit.get('completions', [])) for habit in habits_data)
        
        if total_completions < 5:
            return {
                "message": "Goal suggestions will be available after more habit tracking",
                "suggestion": "Try to complete at least one habit every day"
            }
        
        # This will be fully implemented on Day 4
        return {
            "message": "Adaptive goal-setting will be implemented on Day 4",
            "placeholder_suggestion": "Keep up the good work! Try to increase your consistency."
        }
    
    def _calculate_basic_stats(self, habits_data):
        """Calculate basic statistics with correctly weighted average of completion rates"""
        if not habits_data:
            return {}
                
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
        
        # Calculate completion rates for each habit
        today = datetime.now().date()
        individual_rates = []
        
        for habit in habits_data:
            completions = habit.get('completions', [])
            
            # Skip if no completions
            if not completions:
                individual_rates.append(0)
                continue
                
            # Determine start date (creation date or earliest completion)
            start_date = today  # Default fallback
            
            # Try getting from creation date
            created_at = habit.get('created_at')
            if created_at:
                try:
                    if 'T' in created_at:
                        start_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).date()
                    else:
                        start_date = datetime.strptime(created_at, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    start_date = today
                    
            # If creation date parsing failed, use earliest completion
            if start_date == today and completions:
                try:
                    # Find earliest completion date
                    unique_dates = set(c['date'] for c in completions if 'date' in c)
                    if unique_dates:
                        earliest_date = min(unique_dates)
                        start_date = datetime.strptime(earliest_date, '%Y-%m-%d').date()
                except (ValueError, KeyError):
                    start_date = today
            
            # Calculate days tracked (minimum 1 to avoid division by zero)
            days_tracked = max((today - start_date).days + 1, 1)
            
            # Get unique completion dates to avoid duplicates
            unique_completion_dates = set(c['date'] for c in completions if 'date' in c)
            
            # Calculate completion rate (capped at 100%)
            completion_rate = min((len(unique_completion_dates) / days_tracked) * 100, 100.0)
            individual_rates.append(completion_rate)
        
        # Simply take the sum of all completion rates and divide by number of habits
        # This is a true average - each habit counts equally
        overall_rate = sum(individual_rates) / len(habits_data) if habits_data else 0
        
        return {
            "total_habits": len(habits_data),
            "total_completions": total_completions,
            "avg_completions_per_habit": round(avg_completions, 1),
            "best_performing_habit": best_habit["name"] if best_habit else None,
            "overall_completion_rate": round(overall_rate, 1)
        }
    
    def _analyze_habit_pattern(self, habit):
        """Analyze patterns for a specific habit using Ollama"""
        completions = habit.get('completions', [])
        
        if not completions or len(completions) < 3:
            return "Need more data to analyze patterns (at least 3 completions)."
        
        # Sort completions by date
        completion_dates = sorted([c['date'] for c in completions])
        
        # Calculate basic stats
        today = datetime.now().date()
        
        # Get creation date
        creation_date = None
        created_at = habit.get('created_at', '')
        
        try:
            if 'T' in created_at:
                creation_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).date()
            else:
                creation_date = datetime.strptime(created_at, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            creation_date = None
        
        # Find earliest date between creation and first completion
        earliest_completion = datetime.strptime(completion_dates[0], '%Y-%m-%d').date()
        start_date = earliest_completion
        
        if creation_date and creation_date < earliest_completion:
            start_date = creation_date
        
        days_tracked = (today - start_date).days + 1
        completion_rate = round(len(set(completion_dates)) / days_tracked * 100)
        
        # Simplified prompt
        prompt = f"""Analyze habit "{habit.get('name')}" briefly:
        - Dates: {', '.join(completion_dates[-7:]) + ('...' if len(completion_dates) > 7 else '')}
        - Completion rate: {completion_rate}%
        - Total tracked days: {days_tracked}
        
        In 2-3 sentences only:
        1. Is there a pattern to when this habit is completed?
        2. One actionable tip to improve consistency.
        """
        
        # Call Ollama API
        result = self._call_ollama_api(prompt)
        
        # If we get an error from Ollama, return a default message
        if "error" in result:
            return "Analysis in progress... Please try again in a moment."
        
        return result.get("response", "Pattern analysis not available.")
    
    def _generate_overall_analysis(self, habits_data, basic_stats):
        """Generate an overall analysis of all habits using Ollama"""
        # Get habit names and completion counts (limited data for faster response)
        habit_stats = []
        for habit in habits_data:
            habit_stats.append({
                "name": habit.get('name'),
                "completions": len(habit.get('completions', []))
            })
        
        # Simplified prompt for Ollama
        prompt = f"""
        Analyze these habits briefly:
        - Total habits: {basic_stats.get('total_habits')}
        - Overall completion rate: {basic_stats.get('overall_completion_rate')}%
        - Best habit: {basic_stats.get('best_performing_habit')}
        
        In 3 sentences maximum:
        1. What's the main consistency trend?
        2. One specific, actionable recommendation to build better habits.
        """
        
        # Call Ollama API
        result = self._call_ollama_api(prompt)
        
        # If we get an error from Ollama, return a default message
        if "error" in result:
            return "Overall analysis is processing. Please check back in a moment."
        
        return result.get("response", "Overall analysis not available.")
    
    def _call_ollama_api(self, prompt, system_prompt=None, timeout=10):
        """
        Call the Ollama API with a timeout
        """
        try:
            # Prepare the request payload
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Lower temperature for faster, more consistent responses
                    "num_predict": 200   # Limit token generation
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            # Make the API call with timeout
            response = requests.post(self.api_url, json=payload, timeout=timeout)
            
            # Check if the request was successful
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error calling Ollama API: {response.status_code}")
                print(response.text)
                return {"error": f"API error: {response.status_code}", "response": "Analysis in progress..."}
        
        except requests.exceptions.Timeout:
            print(f"Timeout calling Ollama API")
            return {"error": "Timeout", "response": "Analysis is taking longer than expected. Try again later."}
        except Exception as e:
            print(f"Exception calling Ollama API: {str(e)}")
            return {"error": str(e), "response": "Unable to connect to the AI service."}