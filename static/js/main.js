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
    const habitDetail = document.getElementById('habit-detail');
    const aiInsights = document.getElementById('ai-insights');
    
    // State
    let habits = [];
    let currentDate = new Date();
    let selectedHabitId = null;
    
    // Format date as YYYY-MM-DD
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    // Format date for display
    function formatDateForDisplay(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
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
            const data = await response.json();
            habits = data.habits || [];
            renderHabitList();
            renderHabitToggles();
            
            // Load AI insights
            loadAIInsights();
        } catch (error) {
            console.error('Error loading habits:', error);
            showNotification('Error loading habits. Please try again.', 'error');
        }
    }
    
    // Load AI insights
    async function loadAIInsights() {
        try {
            // Show loading state
            aiInsights.innerHTML = `
                <h3>AI Insights</h3>
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Generating AI insights...</p>
                </div>
            `;
            
            // Set a timeout to provide feedback if it's taking too long
            const timeoutId = setTimeout(() => {
                // Update the loading message after 5 seconds
                const loadingMsg = aiInsights.querySelector('.loading-spinner p');
                if (loadingMsg) {
                    loadingMsg.textContent = "This is taking longer than usual. The AI model is processing your habits...";
                }
            }, 5000);
            
            const response = await fetch('/api/insights');
            clearTimeout(timeoutId);
            const insights = await response.json();
            
            renderAIInsights(insights);
        } catch (error) {
            console.error('Error loading AI insights:', error);
            aiInsights.innerHTML = `
                <h3>AI Insights</h3>
                <p class="placeholder-text">Unable to load AI insights. Please try again later.</p>
                <button id="refresh-insights-btn" class="btn-secondary">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            `;
            
            // Add event listener to refresh button
            document.getElementById('refresh-insights-btn').addEventListener('click', loadAIInsights);
        }
    }
    
    // Render AI insights
    function renderAIInsights(insights) {
        // Check if insights are ready
        if (!insights.analysis_ready) {
            aiInsights.innerHTML = `
                <h3>AI Insights</h3>
                <p class="placeholder-text">${insights.message || 'Track more habits to get AI insights'}</p>
            `;
            return;
        }
        
        // Render insights
        let basicStatsHtml = '';
        const stats = insights.basic_stats || {};
        
        if (stats) {
            basicStatsHtml = `
                <div class="stats-container">
                    <div class="stat-item">
                        <div class="stat-value">${stats.total_habits || 0}</div>
                        <div class="stat-label">Habits</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.total_completions || 0}</div>
                        <div class="stat-label">Completions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.overall_completion_rate || 0}%</div>
                        <div class="stat-label">Completion Rate</div>
                    </div>
                </div>
            `;
        }
        
        // Render habit insights
        let habitInsightsHtml = '';
        if (insights.habit_insights && insights.habit_insights.length > 0) {
            habitInsightsHtml = '<h4>Habit Patterns</h4>';
            
            for (const habit of insights.habit_insights) {
                habitInsightsHtml += `
                    <div class="habit-insight">
                        <h5>${habit.habit_name}</h5>
                        <p>${habit.insight}</p>
                    </div>
                `;
            }
        }
        
        // Render overall analysis
        let overallAnalysisHtml = '';
        if (insights.overall_analysis) {
            overallAnalysisHtml = `
                <div class="overall-analysis">
                    <h4>Overall Analysis</h4>
                    <p>${insights.overall_analysis}</p>
                </div>
            `;
        }
        
        // Update the AI insights section
        aiInsights.innerHTML = `
            <h3>AI Insights</h3>
            ${basicStatsHtml}
            ${overallAnalysisHtml}
            ${habitInsightsHtml}
            <div class="refresh-insights">
                <button id="refresh-insights-btn" class="btn-secondary">
                    <i class="fas fa-sync-alt"></i> Refresh Insights
                </button>
            </div>
        `;
        
        // Add event listener to refresh button
        document.getElementById('refresh-insights-btn').addEventListener('click', loadAIInsights);
    }
    
    // Render the sidebar habit list
    function renderHabitList() {
        habitList.innerHTML = '';
        
        if (habits.length === 0) {
            habitList.innerHTML = '<div class="placeholder-text">No habits yet. Create one to get started.</div>';
            return;
        }
        
        habits.forEach(habit => {
            const streak = calculateStreak(habit.completions);
            const completionRate = calculateCompletionRate(habit.completions, habit.created_at);
            
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-item';
            if (selectedHabitId === habit.id) {
                habitElement.classList.add('active');
            }
            
            habitElement.innerHTML = `
                <div class="habit-name">${habit.name}</div>
                <div class="habit-meta">
                    <span class="habit-streak" title="Current streak">
                        <i class="fas fa-fire"></i> ${streak}
                    </span>
                    <span class="habit-completion-rate" title="Completion rate">
                        <i class="fas fa-chart-line"></i> ${completionRate}%
                    </span>
                </div>
            `;
            
            habitElement.addEventListener('click', () => {
                selectedHabitId = habit.id;
                renderHabitList(); // Re-render to update selection
                renderHabitDetail(habit);
            });
            
            habitList.appendChild(habitElement);
        });
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
                <div class="habit-actions">
                    <button class="btn-icon edit-habit" data-habit-id="${habit.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-habit" data-habit-id="${habit.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            habitToggles.appendChild(habitToggle);
            
            // Add event listeners
            const checkbox = habitToggle.querySelector('.toggle-checkbox');
            checkbox.addEventListener('change', function() {
                toggleHabitCompletion(habit.id, currentDateStr, this.checked);
            });
            
            const editBtn = habitToggle.querySelector('.edit-habit');
            editBtn.addEventListener('click', () => {
                showEditHabitForm(habit);
            });
            
            const deleteBtn = habitToggle.querySelector('.delete-habit');
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete "${habit.name}"?`)) {
                    deleteHabit(habit.id);
                }
            });
        });
    }
    
    // Render habit detail
    function renderHabitDetail(habit) {
        if (!habit) {
            habitDetail.style.display = 'none';
            return;
        }
        
        const streak = calculateStreak(habit.completions);
        const completionRate = calculateCompletionRate(habit.completions, habit.created_at);
        
        // Sort completions by date (newest first)
        const sortedCompletions = [...habit.completions].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // Generate calendar view (last 30 days)
        const calendarHtml = generateCalendarView(habit);
        
        habitDetail.innerHTML = `
            <h3>${habit.name}</h3>
            ${habit.description ? `<p class="habit-description">${habit.description}</p>` : ''}
            
            <div class="habit-stats">
                <div class="stat-item">
                    <div class="stat-value">${streak}</div>
                    <div class="stat-label">Current Streak</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${completionRate}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${sortedCompletions.length}</div>
                    <div class="stat-label">Total Completions</div>
                </div>
            </div>
            
            <div class="habit-calendar">
                <h4>Completion History</h4>
                ${calendarHtml}
            </div>
            
            <div class="habit-actions">
                <button class="btn-secondary edit-habit-detail" data-habit-id="${habit.id}">
                    <i class="fas fa-edit"></i> Edit Habit
                </button>
                <button class="btn-danger delete-habit-detail" data-habit-id="${habit.id}">
                    <i class="fas fa-trash"></i> Delete Habit
                </button>
            </div>
        `;
        
        // Add event listeners
        const editBtn = habitDetail.querySelector('.edit-habit-detail');
        editBtn.addEventListener('click', () => {
            showEditHabitForm(habit);
        });
        
        const deleteBtn = habitDetail.querySelector('.delete-habit-detail');
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete "${habit.name}"?`)) {
                deleteHabit(habit.id);
            }
        });
        
        habitDetail.style.display = 'block';
    }
    
    // Generate calendar view for habit completions
    function generateCalendarView(habit) {
        const today = new Date();
        const days = [];
        
        // Create a set of completion dates for quick lookup
        const completionDates = new Set(habit.completions.map(c => c.date));
        
        // Generate last 30 days
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            
            days.push({
                date: dateStr,
                display: formatDateForDisplay(dateStr),
                completed: completionDates.has(dateStr)
            });
        }
        
        // Generate HTML
        let calendarHtml = '<div class="calendar-grid">';
        
        days.forEach(day => {
            calendarHtml += `
                <div class="calendar-day ${day.completed ? 'completed' : ''}">
                    <div class="calendar-date">${day.display}</div>
                    <div class="calendar-status">
                        ${day.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                </div>
            `;
        });
        
        calendarHtml += '</div>';
        
        return calendarHtml;
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
                throw new Error('Failed to toggle habit completion');
            }
            
            const result = await response.json();
            
            // Update local state
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
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
                
                // Re-render affected elements
                renderHabitList();
                if (selectedHabitId === habitId) {
                    renderHabitDetail(habit);
                }
                
                // Show notification
                showNotification(`Habit ${result.completed ? 'completed' : 'uncompleted'} for ${formatDateForDisplay(date)}`, 'success');
            }
        } catch (error) {
            console.error('Error toggling habit completion:', error);
            showNotification('Failed to update habit. Please try again.', 'error');
        }
    }
    
    // Calculate streak for a habit
    function calculateStreak(completions) {
        if (!completions || completions.length === 0) {
            return 0;
        }
        
        // Sort completions by date (newest first)
        const sortedCompletions = [...completions].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // Check if completed today or yesterday
        const today = formatDate(new Date());
        const yesterday = formatDate(new Date(Date.now() - 86400000));
        
        if (sortedCompletions[0].date !== today && sortedCompletions[0].date !== yesterday) {
            return 0; // Streak broken if neither today nor yesterday
        }
        
        // Count consecutive days
        let streak = 1;
        let lastDate = new Date(sortedCompletions[0].date);
        
        for (let i = 1; i < sortedCompletions.length; i++) {
            const currentDate = new Date(sortedCompletions[i].date);
            const expectedDate = new Date(lastDate);
            expectedDate.setDate(expectedDate.getDate() - 1);
            
            if (currentDate.toDateString() === expectedDate.toDateString()) {
                streak++;
                lastDate = currentDate;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    // Calculate completion rate correctly accounting for habit creation date and earliest completion
    function calculateCompletionRate(completions, createdAt) {
        if (!completions || completions.length === 0) {
            return 0;
        }
        
        // Get today's date and find all completion dates
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const completion_dates = completions.map(c => new Date(c.date));
        completion_dates.forEach(date => date.setHours(0, 0, 0, 0));
        
        // Find earliest date between: creation date and earliest completion date
        let start_date = today;
        
        // Check creation date
        if (createdAt) {
            const creation_date = new Date(createdAt);
            if (!isNaN(creation_date.getTime())) {
                creation_date.setHours(0, 0, 0, 0);
                if (creation_date < start_date) {
                    start_date = creation_date;
                }
            }
        }
        
        // Check earliest completion date
        if (completion_dates.length > 0) {
            const earliest_completion = new Date(Math.min(...completion_dates.map(d => d.getTime())));
            if (earliest_completion < start_date) {
                start_date = earliest_completion;
            }
        }
        
        // Calculate days to track (from earliest date to today)
        const days_to_track = Math.floor((today - start_date) / (1000 * 60 * 60 * 24)) + 1;
        
        // Count unique dates with completions
        const completed_dates = new Set();
        completions.forEach(completion => {
            completed_dates.add(completion.date);
        });
        
        // Calculate and return the rate
        if (days_to_track > 0) {
            return Math.round((completed_dates.size / days_to_track) * 100);
        } else {
            return completed_dates.size > 0 ? 100 : 0; // Handle any date calculation issues
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-message">${message}</div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // Add close button event
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Show edit habit form
    function showEditHabitForm(habit) {
        // Hide other forms
        habitForm.style.display = 'none';
        
        // Fill form with habit data
        document.getElementById('edit-habit-id').value = habit.id;
        document.getElementById('edit-habit-name').value = habit.name;
        document.getElementById('edit-habit-description').value = habit.description || '';
        
        // Show edit form
        editHabitForm.style.display = 'block';
    }
    
    // Delete habit
    async function deleteHabit(habitId) {
        try {
            const response = await fetch(`/api/habits/${habitId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete habit');
            }
            
            // Update local state
            habits = habits.filter(h => h.id !== habitId);
            
            // Reset selected habit if it was deleted
            if (selectedHabitId === habitId) {
                selectedHabitId = null;
                habitDetail.style.display = 'none';
            }
            
            // Re-render affected elements
            renderHabitList();
            renderHabitToggles();
            
            // Show notification
            showNotification('Habit deleted successfully', 'success');
            
            // Refresh AI insights
            loadAIInsights();
        } catch (error) {
            console.error('Error deleting habit:', error);
            showNotification('Failed to delete habit. Please try again.', 'error');
        }
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
        // Hide other forms
        editHabitForm.style.display = 'none';
        
        // Show create form
        habitForm.style.display = 'block';
    });
    
    cancelHabitBtn.addEventListener('click', function() {
        habitForm.style.display = 'none';
        newHabitForm.reset();
    });
    
    cancelEditBtn.addEventListener('click', function() {
        editHabitForm.style.display = 'none';
        updateHabitForm.reset();
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
            
            // Add to local state
            habits.push(savedHabit);
            
            // Reset form and hide it
            newHabitForm.reset();
            habitForm.style.display = 'none';
            
            // Re-render UI
            renderHabitList();
            renderHabitToggles();
            
            // Show notification
            showNotification('Habit created successfully', 'success');
            
            // Refresh AI insights
            loadAIInsights();
        } catch (error) {
            console.error('Error creating habit:', error);
            showNotification('Failed to create habit. Please try again.', 'error');
        }
    });
    
    // Handle habit update form submission
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
            
            // Update local state
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                habit.name = updatedHabit.name;
                habit.description = updatedHabit.description;
                
                // Re-render affected elements
                renderHabitList();
                renderHabitToggles();
                
                if (selectedHabitId === habitId) {
                    renderHabitDetail(habit);
                }
            }
            
            // Reset form and hide it
            updateHabitForm.reset();
            editHabitForm.style.display = 'none';
            
            // Show notification
            showNotification('Habit updated successfully', 'success');
        } catch (error) {
            console.error('Error updating habit:', error);
            showNotification('Failed to update habit. Please try again.', 'error');
        }
    });
    
    // Initialize
    updateCurrentDateDisplay();
    loadHabits();
});