from datetime import datetime, timedelta
import json

class Habit:
    def __init__(self, name, description="", id=None):
        self.id = id or datetime.now().strftime('%Y%m%d%H%M%S')
        self.name = name
        self.description = description
        self.created_at = datetime.now().isoformat()
        self.completions = []
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "completions": self.completions
        }
    
    def toggle_completion(self, date=None):
        """Toggle completion status for a specific date"""
        date = date or datetime.now().strftime('%Y-%m-%d')
        
        # Check if already completed for this date
        for completion in self.completions:
            if completion.get('date') == date:
                self.completions.remove(completion)
                return False
        
        # Add new completion
        self.completions.append({
            "date": date,
            "timestamp": datetime.now().isoformat()
        })
        return True
    
    def calculate_streak(self):
        """Calculate current streak for this habit"""
        if not self.completions:
            return 0
        
        # Sort completions by date (newest first)
        sorted_completions = sorted(
            self.completions, 
            key=lambda c: c['date'], 
            reverse=True
        )
        
        # Check if completed today
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
    
    def calculate_completion_rate(self, days=30):
        """Calculate completion rate over specified period (default 30 days)"""
        if not self.completions:
            return 0
        
        today = datetime.now().date()
        start_date = (today - timedelta(days=days-1))
        
        # Create a set of dates with completions
        completion_dates = {
            datetime.strptime(c['date'], '%Y-%m-%d').date() 
            for c in self.completions 
            if datetime.strptime(c['date'], '%Y-%m-%d').date() >= start_date
        }
        
        days_tracked = min(days, (today - datetime.strptime(self.created_at, '%Y-%m-%dT%H:%M:%S.%f' if '.' in self.created_at else '%Y-%m-%dT%H:%M:%S').date()).days + 1)
        
        return len(completion_dates) / days_tracked * 100

    @classmethod
    def from_dict(cls, data):
        """Create a Habit instance from dictionary data"""
        habit = cls(
            name=data.get('name', ''),
            description=data.get('description', ''),
            id=data.get('id')
        )
        habit.created_at = data.get('created_at', habit.created_at)
        habit.completions = data.get('completions', [])
        return habit
    
    @classmethod
    def load_all_habits(cls, filename='data/habits.json'):
        """Load all habits from JSON file"""
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
                habits = []
                for habit_data in data.get('habits', []):
                    habits.append(cls.from_dict(habit_data))
                return habits
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    @classmethod
    def save_all_habits(cls, habits, filename='data/habits.json'):
        """Save all habits to JSON file"""
        data = {"habits": [habit.to_dict() for habit in habits]}
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)