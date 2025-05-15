from flask import Flask, render_template, request, jsonify
import json
import os
import time
from functools import lru_cache
from datetime import datetime, timedelta


app = Flask(__name__)

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Initialize habits.json with valid JSON if it doesn't exist or is empty
if not os.path.exists('data/habits.json') or os.path.getsize('data/habits.json') == 0:
    with open('data/habits.json', 'w') as f:
        json.dump({"habits": []}, f, indent=2)

# AI insights cache - defined only once
_insights_cache = {}
_insights_cache_time = 0
_CACHE_DURATION = 300  # 5 minutes in seconds

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/habits', methods=['GET'])
def get_habits():
    try:
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except (FileNotFoundError, json.JSONDecodeError):
        # If file doesn't exist or is empty/invalid, return empty habits list
        return jsonify({"habits": []})

@app.route('/api/habits', methods=['POST'])
def add_habit():
    new_habit = request.json
    new_habit['id'] = datetime.now().strftime('%Y%m%d%H%M%S')  # Simple ID generation
    new_habit['created_at'] = datetime.now().isoformat()
    new_habit['completions'] = []
    
    try:
        with open('data/habits.json', 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                # If file exists but contains invalid JSON
                data = {"habits": []}
    except FileNotFoundError:
        # If file doesn't exist
        data = {"habits": []}
    
    if "habits" not in data:
        data["habits"] = []
    
    data['habits'].append(new_habit)
    
    with open('data/habits.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    # Clear the insights cache when habits change
    global _insights_cache, _insights_cache_time
    _insights_cache = {}
    _insights_cache_time = None
    
    return jsonify(new_habit)

@app.route('/api/habits/<habit_id>/toggle', methods=['POST'])
def toggle_habit(habit_id):
    date_str = request.json.get('date')
    
    if not date_str:
        return jsonify({"error": "Date is required"}), 400
    
    try:
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        
        habit_found = False
        completion_toggled = False
        
        for habit in data.get('habits', []):
            if habit['id'] == habit_id:
                habit_found = True
                # Check if already completed for this date
                completion_exists = False
                for i, completion in enumerate(habit['completions']):
                    if completion.get('date') == date_str:
                        # Remove completion if exists
                        del habit['completions'][i]
                        completion_toggled = False  # Indicates we removed it
                        completion_exists = True
                        break
                
                # Add new completion if didn't exist
                if not completion_exists:
                    habit['completions'].append({
                        "date": date_str,
                        "timestamp": datetime.now().isoformat()
                    })
                    completion_toggled = True  # Indicates we added it
                break
        
        if not habit_found:
            return jsonify({"error": "Habit not found"}), 404
        
        # Save updates back to file
        with open('data/habits.json', 'w') as f:
            json.dump(data, f, indent=2)
        
        # Clear the insights cache when habits change
        global _insights_cache, _insights_cache_time
        _insights_cache = {}
        _insights_cache_time = None
        
        return jsonify({
            "habit_id": habit_id,
            "date": date_str,
            "completed": completion_toggled
        })
    
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/habits/<habit_id>', methods=['PUT'])
def update_habit(habit_id):
    updated_data = request.json
    try:
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        
        habit_found = False
        for habit in data.get('habits', []):
            if habit['id'] == habit_id:
                # Update only allowed fields (name and description)
                habit['name'] = updated_data.get('name', habit['name'])
                habit['description'] = updated_data.get('description', habit['description'])
                habit_found = True
                break
        
        if not habit_found:
            return jsonify({"error": "Habit not found"}), 404
        
        # Save updates back to file
        with open('data/habits.json', 'w') as f:
            json.dump(data, f, indent=2)
        
        # Clear the insights cache when habits change
        global _insights_cache, _insights_cache_time
        _insights_cache = {}
        _insights_cache_time = None
        
        return jsonify({"message": "Habit updated successfully", "habit_id": habit_id})
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/habits/<habit_id>', methods=['DELETE'])
def delete_habit(habit_id):
    try:
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        
        initial_count = len(data.get('habits', []))
        data['habits'] = [h for h in data.get('habits', []) if h['id'] != habit_id]
        
        if len(data.get('habits', [])) == initial_count:
            return jsonify({"error": "Habit not found"}), 404
        
        # Save updates back to file
        with open('data/habits.json', 'w') as f:
            json.dump(data, f, indent=2)
        
        # Clear the insights cache when habits change
        global _insights_cache, _insights_cache_time
        _insights_cache = {}
        _insights_cache_time = None
        
        return jsonify({"message": "Habit deleted successfully", "habit_id": habit_id})
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/habits/stats', methods=['GET'])
def get_habit_stats():
    try:
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        
        stats = {
            "total_habits": len(data.get('habits', [])),
            "habits_data": []
        }
        
        for habit in data.get('habits', []):
            habit_stats = {
                "id": habit['id'],
                "name": habit['name'],
                "total_completions": len(habit['completions']),
                "streak": calculate_streak(habit['completions']),
                "completion_rate": calculate_completion_rate(habit['completions'], habit.get('created_at'))
            }
            stats["habits_data"].append(habit_stats)
        
        return jsonify(stats)
    
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 500

def calculate_streak(completions):
    """Calculate current streak for a habit"""
    if not completions:
        return 0
    
    # Sort completions by date (newest first)
    sorted_completions = sorted(
        completions,
        key=lambda c: c['date'],
        reverse=True
    )
    
    # Check if completed today or yesterday
    today = datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    
    if sorted_completions[0]['date'] != today and sorted_completions[0]['date'] != yesterday:
        return 0  # Streak broken if neither today nor yesterday
    
    # Count consecutive days
    streak = 1
    last_date = datetime.strptime(sorted_completions[0]['date'], '%Y-%m-%d')
    
    for i in range(1, len(sorted_completions)):
        current_date = datetime.strptime(sorted_completions[i]['date'], '%Y-%m-%d')
        expected_date = last_date - timedelta(days=1)
        
        if current_date.date() == expected_date.date():
            streak += 1
            last_date = current_date
        else:
            break
    
    return streak

def calculate_completion_rate(completions, created_at=None):
    """
    Calculate completion rate correctly accounting for habit creation date and earliest completion
    """
    if not completions:
        return 0
    
    # Get today's date and find all completion dates
    today = datetime.now().date()
    completion_dates = [datetime.strptime(c['date'], '%Y-%m-%d').date() for c in completions]
    
    # Find earliest date between: creation date and earliest completion date
    start_date = today
    
    # Check creation date
    if created_at:
        try:
            if 'T' in created_at:
                creation_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).date()
            else:
                creation_date = datetime.strptime(created_at, '%Y-%m-%d').date()
            start_date = min(start_date, creation_date)
        except (ValueError, TypeError):
            pass
    
    # Check earliest completion date
    if completion_dates:
        earliest_completion = min(completion_dates)
        start_date = min(start_date, earliest_completion)
    
    # Calculate days to track (from earliest date to today)
    days_to_track = (today - start_date).days + 1
    
    # Return completion rate
    return round(len(set(c['date'] for c in completions)) / days_to_track * 100)

@app.route('/api/insights', methods=['GET'])
def get_insights():
    global _insights_cache, _insights_cache_time
    
    try:
        current_time = time.time()
        
        # Check if we have a valid cache
        if _insights_cache and (current_time - _insights_cache_time) < _CACHE_DURATION:
            return jsonify(_insights_cache)
        
        # Cache expired or doesn't exist, generate new insights
        from models.ai_service import AIService
        
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        
        # Create AI service instance
        ai_service = AIService()
        
        # Get insights with error handling
        insights = ai_service.analyze_patterns(data.get('habits', []))
        
        # Check if we got an error
        if "error" in insights:
            return jsonify({
                "message": insights.get("message", "Unable to generate insights at this time."),
                "error": insights.get("error", "Unknown error")
            }), 500
        
        # Update cache
        _insights_cache = insights
        _insights_cache_time = current_time
        
        return jsonify(insights)
    
    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": "Failed to generate insights"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)