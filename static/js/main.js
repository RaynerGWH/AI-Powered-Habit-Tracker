document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const habitList = document.getElementById('habit-list');
    const habitToggles = document.getElementById('habit-toggles');
    const habitForm = document.getElementById('habit-form');
    const editHabitForm = document.getElementById('edit-habit-form');
    const newHabitForm = document.getElementById('new-habit-form');
    const updateHabitForm = document.getElementById('update-habit-form');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const cancelHabitBtn = document.getElementById('cancel-habit');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const currentDateSpan = document.getElementById('current-date');
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    const aiInsightsSection = document.getElementById('ai-insights');
    const habitDetailSection = document.getElementById('habit-detail');
    
    // State
    let habits = [];
    let currentDate = new Date();
    let activeHabitId = null;
    
    // Format date as YYYY-MM-DD
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    // Update current date display
    function updateCurrentDateDisplay() {
        const today = new Date();
        const isToday = formatDate(currentDate) === formatDate(today);
        const isYesterday = formatDate(new Date(today - 86400000)) === formatDate(currentDate);
        const isTomorrow = formatDate(new Date(today.getTime() + 86400000)) === formatDate(currentDate);
        
        if (isToday) {
            currentDateSpan.textContent = 'Today';
        } else if (isYesterday) {
            currentDateSpan.textContent = 'Yesterday';
        } else if (isTomorrow) {
            currentDateSpan.textContent = 'Tomorrow';
        } else {
            currentDateSpan.textContent = currentDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    }
    
    // Load habits from server
    async function loadHabits() {
        try {
            const response = await fetch('/api/habits');
            if (!response.ok) {
                throw new Error('Failed to load habits: ' + response.status);
            }
            const data = await response.json();
            habits = data.habits || [];
            renderHabitList();
            renderHabitToggles();
            loadInsights();
        } catch (error) {
            console.error('Error loading habits:', error);
            showNotification('Failed to load habits', 'error');
        }
    }
    
    // Render the sidebar habit list
    function renderHabitList() {
        habitList.innerHTML = '';
        
        if (habits.length === 0) {
            habitList.innerHTML = '<div class="placeholder-text">No habits yet. Create one to get started!</div>';
            return;
        }
        
        habits.forEach(habit => {
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-item';
            if (habit.id === activeHabitId) {
                habitElement.classList.add('active');
            }
            
            // Calculate streak and completion rate
            const streak = calculateStreak(habit.completions);
            const completionRate = calculateCompletionRate(habit.completions);
            
            habitElement.innerHTML = `
                <div class="habit-name">${habit.name}</div>
                <div class="habit-stats">
                    <span class="streak" title="Current streak">${streak}🔥</span>
                    <span class="completion-rate" title="Completion rate">${completionRate}%</span>
                </div>
            `;
            
            habitElement.addEventListener('click', () => {
                // Set as active habit
                activeHabitId = habit.id;
                document.querySelectorAll('.habit-item').forEach(item => item.classList.remove('active'));
                habitElement.classList.add('active');
                
                // Update habit details view (to be implemented)
                renderHabitDetails(habit);
            });
            
            habitList.appendChild(habitElement);
        });
    }
    
    // Calculates the current streak for a habit
    function calculateStreak(completions) {
        if (!completions || completions.length === 0) return 0;
        
        // A simple implementation - will be enhanced with AI in Day 3
        const sortedCompletions = [...completions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        // Check if completed today
        const completedToday = sortedCompletions.some(c => 
            new Date(c.date).setHours(0, 0, 0, 0) === currentDate.getTime()
        );
        
        if (!completedToday) {
            // Check if completed yesterday
            const yesterday = new Date(currentDate);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const completedYesterday = sortedCompletions.some(c => 
                new Date(c.date).setHours(0, 0, 0, 0) === yesterday.getTime()
            );
            
            if (!completedYesterday) {
                return 0; // Streak broken
            }
        }
        
        // Count consecutive days
        let checkDate = new Date(currentDate);
        if (!completedToday) {
            checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday
        }
        
        while (true) {
            const dateStr = formatDate(checkDate);
            const completedOnDate = sortedCompletions.some(c => c.date === dateStr);
            
            if (completedOnDate) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    // Calculate completion rate over last 30 days
    function calculateCompletionRate(completions) {
        if (!completions || completions.length === 0) return 0;
        
        const today = new Date();
        let daysTracked = 0;
        let daysCompleted = 0;
        
        // Check the last 30 days
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            checkDate.setHours(0, 0, 0, 0);
            
            const dateStr = formatDate(checkDate);
            
            // Only count days since habit creation
            const completedOnDate = completions.some(c => c.date === dateStr);
            daysTracked++;
            
            if (completedOnDate) {
                daysCompleted++;
            }
        }
        
        return Math.round((daysCompleted / daysTracked) * 100);
    }
    
    // Render the habit details (placeholder for now)
    function renderHabitDetails(habit) {
        const habitDetail = document.getElementById('habit-detail');
        
        // Calculate stats
        const streak = calculateStreak(habit.completions);
        const completionRate = calculateCompletionRate(habit.completions);
        const totalCompletions = habit.completions.length;
        
        // Format creation date
        const createdDate = new Date(habit.created_at);
        const formattedCreationDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Generate calendar data for the last 28 days
        const calendarData = generateCalendarData(habit.completions);
        
        // Render detail view
        habitDetail.style.display = 'block';
        habitDetail.innerHTML = `
            <div class="habit-detail-header">
                <h3>${habit.name}</h3>
                <div class="habit-detail-actions">
                    <button id="edit-habit" class="btn-secondary">
                        <i class="fas fa-pencil-alt"></i> Edit
                    </button>
                    <button id="delete-habit" class="btn-secondary">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            
            <p>${habit.description || 'No description'}</p>
            <p class="text-muted">Created on ${formattedCreationDate}</p>
            
            <div class="habit-stats-grid">
                <div class="stat-card">
                    <h4>Current Streak</h4>
                    <div class="value">${streak}🔥</div>
                </div>
                <div class="stat-card">
                    <h4>Completion Rate</h4>
                    <div class="value">${completionRate}%</div>
                </div>
                <div class="stat-card">
                    <h4>Total Completions</h4>
                    <div class="value">${totalCompletions}</div>
                </div>
            </div>
            
            <div class="calendar-view">
                <h4>Last 28 Days</h4>
                <div class="calendar-weekdays">
                    <div class="calendar-weekday">Sun</div>
                    <div class="calendar-weekday">Mon</div>
                    <div class="calendar-weekday">Tue</div>
                    <div class="calendar-weekday">Wed</div>
                    <div class="calendar-weekday">Thu</div>
                    <div class="calendar-weekday">Fri</div>
                    <div class="calendar-weekday">Sat</div>
                </div>
                <div class="calendar-grid">
                    ${renderCalendarGrid(calendarData)}
                </div>
            </div>
        `;
        
        // Set up event listeners for edit and delete buttons
        document.getElementById('edit-habit').addEventListener('click', () => {
            showEditForm(habit);
        });
        
        document.getElementById('delete-habit').addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete the habit "${habit.name}"?`)) {
                deleteHabit(habit.id);
            }
        });
    }
    
    // Show edit form with habit data
    function showEditForm(habit) {
        // Hide other forms
        habitForm.style.display = 'none';
        habitDetailSection.style.display = 'none';
        
        // Populate form fields
        document.getElementById('edit-habit-id').value = habit.id;
        document.getElementById('edit-habit-name').value = habit.name;
        document.getElementById('edit-habit-description').value = habit.description || '';
        
        // Show edit form
        editHabitForm.style.display = 'block';
        document.getElementById('edit-habit-name').focus();
    }
    
    // Delete habit
    async function deleteHabit(habitId) {
        try {
            const response = await fetch(`/api/habits/${habitId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete habit: ' + response.status);
            }
            
            // Remove from local data
            habits = habits.filter(h => h.id !== habitId);
            
            // Reset active habit
            activeHabitId = null;
            
            // Hide habit detail section
            habitDetailSection.style.display = 'none';
            
            // Re-render UI
            renderHabitList();
            renderHabitToggles();
            
            // Show success notification
            showNotification('Habit deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting habit:', error);
            showNotification('Failed to delete habit', 'error');
        }
    }
    
    // Generate calendar data for the last 28 days
    function generateCalendarData(completions) {
        const calendarData = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Generate last 28 days of data
        for (let i = 27; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const dateStr = formatDate(date);
            const isCompleted = completions.some(c => c.date === dateStr);
            
            calendarData.push({
                date: date,
                dateStr: dateStr,
                isCompleted: isCompleted
            });
        }
        
        return calendarData;
    }
    
    // Render calendar grid
    function renderCalendarGrid(calendarData) {
        let html = '';
        
        calendarData.forEach(day => {
            const classes = day.isCompleted ? 'calendar-day completed' : 'calendar-day';
            const dayNumber = day.date.getDate();
            
            html += `<div class="${classes}" title="${day.dateStr}">${dayNumber}</div>`;
        });
        
        return html;
    }
    
    // Render the habit toggles for the current date
    function renderHabitToggles() {
        habitToggles.innerHTML = '';
        
        if (habits.length === 0) {
            habitToggles.innerHTML = '<div class="placeholder-text">No habits to track yet.</div>';
            return;
        }
        
        const currentDateStr = formatDate(currentDate);
        habits.forEach(habit => {
            const isCompleted = habit.completions.some(completion => 
                completion.date === currentDateStr
            );
            
            const habitToggle = document.createElement('div');
            habitToggle.className = 'habit-toggle';
            habitToggle.innerHTML = `
                <div class="toggle-container">
                    <input type="checkbox" class="toggle-checkbox" data-habit-id="${habit.id}" ${isCompleted ? 'checked' : ''}>
                </div>
                <div class="habit-info">
                    <h4>${habit.name}</h4>
                    ${habit.description ? `<p>${habit.description}</p>` : ''}
                </div>
                <div class="toggle-timestamp">
                    ${isCompleted ? formatTimestamp(habit.completions.find(c => c.date === currentDateStr).timestamp) : ''}
                </div>
            `;
            
            habitToggles.appendChild(habitToggle);
            
            // Add event listener to checkbox
            const checkbox = habitToggle.querySelector('.toggle-checkbox');
            checkbox.addEventListener('change', function() {
                toggleHabitCompletion(habit.id, currentDateStr, this.checked);
            });
        });
    }
    
    // Format timestamp for display
    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Toggle habit completion status
    async function toggleHabitCompletion(habitId, date, isCompleted) {
        try {
            const response = await fetch(`/api/habits/${habitId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update habit: ' + response.status);
            }
            
            const result = await response.json();
            
            // Update local habit data
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;
            
            if (result.completed) {
                // Add completion if not already completed
                if (!habit.completions.some(c => c.date === date)) {
                    habit.completions.push({
                        date: date,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // Remove completion if exists
                habit.completions = habit.completions.filter(c => c.date !== date);
            }
            
            // Re-render the UI
            renderHabitToggles();
            renderHabitList(); // Update streaks in the list
            
            // Show success feedback
            showNotification(
                result.completed ? 'Habit marked as completed!' : 'Habit marked as incomplete', 
                'success'
            );
            
            // Refresh insights if needed
            if (habits.length > 0 && habits[0].completions.length > 5) {
                loadInsights();
            }
            
        } catch (error) {
            console.error('Error toggling habit completion:', error);
            showNotification('Failed to update habit status', 'error');
        }
    }
    
    // Load AI insights (placeholder for Day 3)
    async function loadInsights() {
        if (habits.length === 0) {
            aiInsightsSection.innerHTML = `
                <h3>AI Insights</h3>
                <p class="placeholder-text">Add some habits to get started with AI insights.</p>
                <div class="coming-soon">
                    <p>Coming in Day 3: Pattern recognition and consistency analysis</p>
                </div>
            `;
            return;
        }
        
        try {
            const response = await fetch('/api/insights');
            if (!response.ok) {
                throw new Error('Failed to load insights');
            }
            
            const insights = await response.json();
            
            // If we have basic stats to show
            if (insights.basic_stats && Object.keys(insights.basic_stats).length > 0) {
                const stats = insights.basic_stats;
                
                aiInsightsSection.innerHTML = `
                    <h3>AI Insights</h3>
                    <div class="insights-content">
                        <div class="stats-summary">
                            <p>You're tracking <strong>${stats.total_habits}</strong> habits with a total of 
                            <strong>${stats.total_completions}</strong> completions.</p>
                            
                            ${stats.best_performing_habit ? 
                                `<p>Your best performing habit is <strong>${stats.best_performing_habit}</strong>.</p>` : ''}
                            
                            <p>Your overall completion rate is <strong>${stats.overall_completion_rate}%</strong>.</p>
                        </div>
                        
                        <div class="chart-container">
                            Charts coming in Day 3
                        </div>
                        
                        <div class="coming-soon">
                            <p><strong>Coming in Day 3:</strong> Advanced pattern recognition and consistency analysis with AI</p>
                        </div>
                    </div>
                `;
            } else {
                aiInsightsSection.innerHTML = `
                    <h3>AI Insights</h3>
                    <p class="placeholder-text">AI insights will be available after you track habits for a few days.</p>
                    <div class="coming-soon">
                        <p>Coming in Day 3: Pattern recognition and consistency analysis</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading insights:', error);
            aiInsightsSection.innerHTML = `
                <h3>AI Insights</h3>
                <p class="placeholder-text">Unable to load insights. Please try again later.</p>
                <div class="coming-soon">
                    <p>Coming in Day 3: Pattern recognition and consistency analysis</p>
                </div>
            `;
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Add animation class
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Handle date navigation
    prevDayBtn.addEventListener('click', function() {
        currentDate = new Date(currentDate.getTime() - 86400000); // Subtract one day
        updateCurrentDateDisplay();
        renderHabitToggles();
    });
    
    nextDayBtn.addEventListener('click', function() {
        currentDate = new Date(currentDate.getTime() + 86400000); // Add one day
        updateCurrentDateDisplay();
        renderHabitToggles();
    });
    
    // Show/hide habit form
    addHabitBtn.addEventListener('click', function() {
        habitForm.style.display = 'block';
        editHabitForm.style.display = 'none';
        habitDetailSection.style.display = 'none';
        document.getElementById('habit-name').focus();
    });
    
    cancelHabitBtn.addEventListener('click', function() {
        habitForm.style.display = 'none';
        newHabitForm.reset();
    });
    
    // Cancel edit button handler
    cancelEditBtn.addEventListener('click', function() {
        editHabitForm.style.display = 'none';
        
        // Show habit detail if there's an active habit
        if (activeHabitId) {
            const habit = habits.find(h => h.id === activeHabitId);
            if (habit) {
                renderHabitDetails(habit);
            }
        }
    });
    
    // Update habit form submission
    updateHabitForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const habitId = document.getElementById('edit-habit-id').value;
        const nameInput = document.getElementById('edit-habit-name');
        const descriptionInput = document.getElementById('edit-habit-description');
        
        // Check if name is empty
        if (!nameInput.value.trim()) {
            showNotification('Habit name cannot be empty', 'error');
            return;
        }
        
        const updatedHabit = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim()
        };
        
        try {
            const response = await fetch(`/api/habits/${habitId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedHabit)
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            
            // Update local habit data
            const habitIndex = habits.findIndex(h => h.id === habitId);
            if (habitIndex !== -1) {
                habits[habitIndex].name = updatedHabit.name;
                habits[habitIndex].description = updatedHabit.description;
            }
            
            // Hide form
            editHabitForm.style.display = 'none';
            
            // Re-render UI
            renderHabitList();
            renderHabitToggles();
            
            // Show habit detail view with updated data
            if (habitIndex !== -1) {
                renderHabitDetails(habits[habitIndex]);
            }
            
            // Show success notification
            showNotification('Habit updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating habit:', error);
            showNotification('Failed to update habit', 'error');
        }
    });
    
    // Handle habit form submission
    newHabitForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('habit-name');
        const descriptionInput = document.getElementById('habit-description');
        
        // Check if name is empty
        if (!nameInput.value.trim()) {
            showNotification('Habit name cannot be empty', 'error');
            return;
        }
        
        const newHabit = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim()
        };
        
        try {
            const response = await fetch('/api/habits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newHabit)
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            
            const savedHabit = await response.json();
            habits.push(savedHabit);
            
            // Reset form and hide it
            newHabitForm.reset();
            habitForm.style.display = 'none';
            
            // Re-render UI
            renderHabitList();
            renderHabitToggles();
            
            // Show success notification
            showNotification('Habit created successfully!', 'success');
            
        } catch (error) {
            console.error('Error creating habit:', error);
            showNotification('Failed to create habit', 'error');
        }
    });
    
    // Initialize
    updateCurrentDateDisplay();
    loadHabits();
});