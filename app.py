from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime, timedelta
app = Flask(__name__)

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

# Initialize habits.json with valid JSON if it doesn't exist or is empty
if not os.path.exists('data/habits.json') or os.path.getsize('data/habits.json') == 0:
    with open('data/habits.json', 'w') as f:
        json.dump({"habits": []}, f, indent=2)

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
                "completion_rate": calculate_completion_rate(habit['completions'])
            }
            stats["habits_data"].append(habit_stats)
        
        return jsonify(stats)
    
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/insights', methods=['GET'])
def get_insights():
    try:
        # Import AI service here to avoid circular imports
        from models.ai_service import AIService
        
        with open('data/habits.json', 'r') as f:
            data = json.load(f)
        
        # Create AI service instance
        ai_service = AIService()
        
        # Get basic insights (placeholder for Day 3)
        insights = ai_service.analyze_patterns(data.get('habits', []))
        
        return jsonify(insights)
    
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

def calculate_completion_rate(completions):
    """Calculate completion rate over the last 30 days"""
    if not completions:
        return 0
    
    today = datetime.now().date()
    thirty_days_ago = (today - timedelta(days=30)).isoformat()
    
    # Create a set of dates with completions in the last 30 days
    recent_dates = set()
    for c in completions:
        date = c['date']
        if date >= thirty_days_ago:
            recent_dates.add(date)
    
    # Simple approximation - will improve in Day 3
    return round(len(recent_dates) / 30 * 100)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)