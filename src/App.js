import React, { useState, useEffect } from 'react';
import './App.css';

// Hook for managing local storage
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Time conversion constants (explicit, correct)
const TIME_CONSTANTS = {
  MS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  MS_PER_MINUTE: 60 * 1000, // 60,000 ms
  MS_PER_HOUR: 60 * 60 * 1000, // 3,600,000 ms
  SECONDS_PER_HOUR: 60 * 60, // 3,600 seconds
};

// Helper function to convert minutes to milliseconds (for precise progress calculation)
const minutesToMilliseconds = (minutes) => {
  return minutes * TIME_CONSTANTS.MS_PER_MINUTE; // minutes * 60 * 1000
};

// Helper function to convert milliseconds to seconds with explicit calculation
const msToSeconds = (milliseconds) => {
  return milliseconds / TIME_CONSTANTS.MS_PER_SECOND;
};

// Helper function to convert minutes to seconds (for progress calculation)
const minutesToSeconds = (minutes) => {
  return minutes * TIME_CONSTANTS.SECONDS_PER_MINUTE;
};

// Helper function to convert milliseconds to hours with explicit calculation
const msToHours = (milliseconds) => {
  return milliseconds / TIME_CONSTANTS.MS_PER_HOUR;
};

// Helper function to convert minutes to hours
const minutesToHours = (minutes) => {
  return minutes / TIME_CONSTANTS.MINUTES_PER_HOUR;
};

// Helper function to convert hours to minutes
const hoursToMinutes = (hours) => {
  return hours * TIME_CONSTANTS.MINUTES_PER_HOUR;
};
const normalizeTaskDates = (tasks) => {
  try {
    if (!Array.isArray(tasks)) return [];
    return tasks.map((task) => ({
      ...task,
      createdAt: task.createdAt ? new Date(task.createdAt) : null,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
    }));
  } catch (error) {
    console.error('Error normalizing task dates:', error);
    return [];
  }
};

const normalizeGoalDates = (goals) => {
  try {
    if (!Array.isArray(goals)) return [];
    return goals.map((goal) => ({
      ...goal,
      createdAt: goal.createdAt ? new Date(goal.createdAt) : null,
      targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
    }));
  } catch (error) {
    console.error('Error normalizing goal dates:', error);
    return [];
  }
};

// Helper function to format time in appropriate units
const formatTime = (hours) => {
  const minutes = Math.round(hours * 60);
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useLocalStorage('studyPlannerTheme', 'light');

  // Simple state management - direct useState instead of complex useLocalStorage
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('studyPlannerTasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old data: if estimatedTime < 24, it's likely in hours, so convert to minutes
        const migrated = parsed.map((task) => ({
          ...task,
          estimatedTime:
            task.estimatedTime < 24
              ? task.estimatedTime * 60
              : task.estimatedTime,
        }));
        return normalizeTaskDates(migrated);
      }
      return [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  });

  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('studyPlannerGoals');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old data: if estimatedTime < 24, it's likely in hours, so convert to minutes
        const migrated = parsed.map((goal) => ({
          ...goal,
          estimatedTime:
            goal.estimatedTime < 24
              ? goal.estimatedTime * 60
              : goal.estimatedTime,
        }));
        return normalizeGoalDates(migrated);
      }
      return [];
    } catch (error) {
      console.error('Error loading goals:', error);
      return [];
    }
  }); // Save to localStorage whenever tasks/goals change
  useEffect(() => {
    try {
      localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('studyPlannerGoals', JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  }, [goals]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [taskFilter, setTaskFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Timer state management
  const [activeTimers, setActiveTimers] = useState({}); // { taskId: { startTime, elapsedTime, isRunning } }
  const [activeGoalTimers, setActiveGoalTimers] = useState({}); // { goalId: { startTime, elapsedTime, isRunning } }

  // Toast notification state
  const [toasts, setToasts] = useState([]);

  // Toast functions
  const addToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'assignment',
    dueDate: '',
    estimatedTime: '',
  });
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    targetDate: '',
    category: 'academic',
    estimatedTime: '',
  });

  // Apply theme on load and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Update current date
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Timer functionality useEffect
  useEffect(() => {
    const interval = setInterval(() => {
      // Update task timers
      setActiveTimers((prevTimers) => {
        const updatedTimers = { ...prevTimers };
        let hasActiveTimers = false;

        Object.keys(updatedTimers).forEach((taskId) => {
          if (updatedTimers[taskId].isRunning) {
            hasActiveTimers = true;
            const startTime = updatedTimers[taskId].startTime;
            const previousElapsedMs = updatedTimers[taskId].elapsedTime || 0;
            // Calculate elapsed time in MILLISECONDS for precise progress calculation
            const sessionElapsedMs = Date.now() - startTime; // milliseconds since start
            const totalElapsedMs = previousElapsedMs + sessionElapsedMs; // total milliseconds

            // Debug logging for timer calculation
            if (
              taskId === Object.keys(updatedTimers)[0] &&
              sessionElapsedMs > 1000
            ) {
              console.log(`⚡ MILLISECOND TIMER DEBUG [${taskId}]:`, {
                sessionElapsedMs,
                previousElapsedMs,
                totalElapsedMs,
                realTimeSeconds: Math.round(sessionElapsedMs / 1000),
                totalTimeSeconds: Math.round(totalElapsedMs / 1000),
                // ADDITIONAL DEBUG
                startTime,
                currentTime: Date.now(),
                timeDifference: Date.now() - startTime,
                isTimeDifferenceCorrect:
                  Date.now() - startTime === sessionElapsedMs,
              });
            }

            // Update task progress based on time spent vs estimated time
            setTasks((prevTasks) =>
              prevTasks.map((task) => {
                if (task.id === taskId) {
                  // Use provided time or default to 30 minutes for timer calculations
                  const taskEstimatedMinutes =
                    task.estimatedTime > 0 ? task.estimatedTime : 30;
                  const totalTimeMs = taskEstimatedMinutes * 60 * 1000; // EXACT FORMULA: minutes * 60 * 1000
                  const elapsedMs = totalElapsedMs; // elapsedMs = Date.now() - startTime
                  const rawProgressPercentage = (elapsedMs / totalTimeMs) * 100; // progress = (elapsedMs / totalTimeMs) * 100
                  const progressPercentage = Math.min(
                    Math.max(rawProgressPercentage, 0),
                    100
                  ); // Clamp to [0,100]

                  // Calculate remaining time
                  const remainingMs = Math.max(0, totalTimeMs - elapsedMs);
                  const remainingMin = Math.floor(remainingMs / 60000);
                  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

                  // Comprehensive debug with test case verification
                  console.log(
                    `🎯 TIMER PROGRESS DEBUG for Task "${task.title}":`,
                    {
                      taskEstimatedMinutes,
                      totalTimeMs,
                      elapsedMs,
                      rawProgressPercentage,
                      progressPercentage,
                      remainingMs,
                      remainingTime: `${remainingMin}m ${remainingSec}s`,
                      equation: `${elapsedMs}ms / ${totalTimeMs}ms * 100 = ${rawProgressPercentage.toFixed(
                        2
                      )}%`,
                      // TEST CASE VALIDATION
                      testCase5Min:
                        taskEstimatedMinutes === 5
                          ? {
                              expectedTotalMs: 300000,
                              actualTotalMs: totalTimeMs,
                              at6Seconds: `6000 / 300000 * 100 = 2%`,
                              currentElapsedSec: Math.round(elapsedMs / 1000),
                              shouldBe2PercentAt6s:
                                elapsedMs >= 6000
                                  ? ((6000 / totalTimeMs) * 100).toFixed(2) +
                                    '% (expected 2%)'
                                  : 'not reached 6s yet',
                            }
                          : null,
                      testCase15Min:
                        taskEstimatedMinutes === 15
                          ? {
                              expectedTotalMs: 900000,
                              actualTotalMs: totalTimeMs,
                              at2Minutes: `120000 / 900000 * 100 = 13.33%`,
                              shouldBe13_33PercentAt2m:
                                elapsedMs >= 120000
                                  ? ((120000 / totalTimeMs) * 100).toFixed(2) +
                                    '% (expected 13.33%)'
                                  : 'not reached 2m yet',
                            }
                          : null,
                      testCase1Min:
                        taskEstimatedMinutes === 1
                          ? {
                              expectedTotalMs: 60000,
                              actualTotalMs: totalTimeMs,
                              at30Seconds: `30000 / 60000 * 100 = 50%`,
                              shouldBe50PercentAt30s:
                                elapsedMs >= 30000
                                  ? ((30000 / totalTimeMs) * 100).toFixed(2) +
                                    '% (expected 50%)'
                                  : 'not reached 30s yet',
                            }
                          : null,
                    }
                  );

                  // Auto-stop timer when 100% complete
                  if (
                    progressPercentage >= 100 &&
                    updatedTimers[taskId].isRunning
                  ) {
                    updatedTimers[taskId] = {
                      ...updatedTimers[taskId],
                      isRunning: false,
                      elapsedTime: totalElapsedMs, // Store elapsed time in milliseconds
                    };
                    addToast(`Task "${task.title}" completed!`, 'success');
                  } else {
                    updatedTimers[taskId] = {
                      ...updatedTimers[taskId],
                      elapsedTime: totalElapsedMs, // Store elapsed time in milliseconds
                    };
                  }

                  return {
                    ...task,
                    progress: Math.round(progressPercentage),
                    timeSpent: totalElapsedMs, // Store time spent in milliseconds
                    status:
                      progressPercentage >= 100
                        ? 'completed'
                        : progressPercentage > 0
                        ? 'in-progress'
                        : 'pending',
                  };
                }
                return task;
              })
            );
          }
        });

        return hasActiveTimers ? updatedTimers : prevTimers;
      });

      // Update goal timers
      setActiveGoalTimers((prevTimers) => {
        const updatedTimers = { ...prevTimers };
        let hasActiveTimers = false;

        Object.keys(updatedTimers).forEach((goalId) => {
          if (updatedTimers[goalId].isRunning) {
            hasActiveTimers = true;
            const startTime = updatedTimers[goalId].startTime;
            const previousElapsedMs = updatedTimers[goalId].elapsedTime || 0;
            // Calculate elapsed time in MILLISECONDS for precise progress calculation
            const sessionElapsedMs = Date.now() - startTime; // milliseconds since start
            const totalElapsedMs = previousElapsedMs + sessionElapsedMs; // total milliseconds

            // Update goal progress based on time spent vs estimated time
            setGoals((prevGoals) =>
              prevGoals.map((goal) => {
                if (goal.id === goalId) {
                  // Use provided time or default to 60 minutes for timer calculations
                  const goalEstimatedMinutes =
                    goal.estimatedTime > 0 ? goal.estimatedTime : 60;
                  const totalTimeMs = goalEstimatedMinutes * 60 * 1000; // EXACT FORMULA: minutes * 60 * 1000
                  const elapsedMs = totalElapsedMs; // elapsedMs = Date.now() - startTime
                  const rawProgressPercentage = (elapsedMs / totalTimeMs) * 100; // progress = (elapsedMs / totalTimeMs) * 100
                  const progressPercentage = Math.min(
                    Math.max(rawProgressPercentage, 0),
                    100
                  ); // Clamp to [0,100]

                  // Calculate remaining time
                  const remainingMs = Math.max(0, totalTimeMs - elapsedMs);
                  const remainingMin = Math.floor(remainingMs / 60000);
                  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

                  // Debug progress calculation with correct formula
                  console.log(
                    `🎯 TIMER PROGRESS DEBUG for Goal "${goal.title}":`,
                    {
                      goalEstimatedMinutes,
                      totalTimeMs,
                      elapsedMs,
                      rawProgressPercentage,
                      progressPercentage,
                      remainingMs,
                      remainingTime: `${remainingMin}m ${remainingSec}s`,
                      equation: `${elapsedMs}ms / ${totalTimeMs}ms * 100 = ${rawProgressPercentage.toFixed(
                        2
                      )}%`,
                    }
                  );

                  // Auto-stop timer when 100% complete
                  if (
                    progressPercentage >= 100 &&
                    updatedTimers[goalId].isRunning
                  ) {
                    updatedTimers[goalId] = {
                      ...updatedTimers[goalId],
                      isRunning: false,
                      elapsedTime: totalElapsedMs, // Store elapsed time in milliseconds
                    };
                    addToast(`Goal "${goal.title}" completed!`, 'success');
                  } else {
                    updatedTimers[goalId] = {
                      ...updatedTimers[goalId],
                      elapsedTime: totalElapsedMs, // Store elapsed time in milliseconds
                    };
                  }

                  return {
                    ...goal,
                    progress: Math.round(progressPercentage),
                    timeSpent: totalElapsedMs, // Store time spent in milliseconds
                    status:
                      progressPercentage >= 100
                        ? 'completed'
                        : progressPercentage > 0
                        ? 'in-progress'
                        : 'active',
                  };
                }
                return goal;
              })
            );
          }
        });

        return hasActiveTimers ? updatedTimers : prevTimers;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [setTasks, setGoals]);

  // Timer functions
  const startTimer = (taskId) => {
    setActiveTimers((prev) => {
      const existingTimer = prev[taskId];
      const previousElapsed = existingTimer?.elapsedTime || 0;

      return {
        ...prev,
        [taskId]: {
          startTime: Date.now(),
          elapsedTime: previousElapsed, // Keep previous elapsed time
          isRunning: true,
        },
      };
    });
    addToast('Timer started!', 'success');
  };

  const pauseTimer = (taskId) => {
    setActiveTimers((prev) => {
      const timer = prev[taskId];
      if (!timer || !timer.isRunning) return prev;

      // Calculate the time elapsed during this session
      const sessionElapsed = (Date.now() - timer.startTime) / 1000 / 3600;
      const totalElapsed = timer.elapsedTime + sessionElapsed;

      return {
        ...prev,
        [taskId]: {
          ...timer,
          elapsedTime: totalElapsed,
          isRunning: false,
        },
      };
    });
    addToast('Timer paused', 'info');
  };

  const stopTimer = (taskId) => {
    setActiveTimers((prev) => {
      const newTimers = { ...prev };
      delete newTimers[taskId];
      return newTimers;
    });
    addToast('Timer stopped', 'info');
  };

  // Goal timer functions
  const startGoalTimer = (goalId) => {
    setActiveGoalTimers((prev) => {
      const existingTimer = prev[goalId];
      const previousElapsed = existingTimer?.elapsedTime || 0;

      return {
        ...prev,
        [goalId]: {
          startTime: Date.now(),
          elapsedTime: previousElapsed, // Keep previous elapsed time
          isRunning: true,
        },
      };
    });
    addToast('Goal timer started!', 'success');
  };

  const pauseGoalTimer = (goalId) => {
    setActiveGoalTimers((prev) => {
      const timer = prev[goalId];
      if (!timer || !timer.isRunning) return prev;

      // Calculate the time elapsed during this session
      const sessionElapsed = (Date.now() - timer.startTime) / 1000 / 3600;
      const totalElapsed = timer.elapsedTime + sessionElapsed;

      return {
        ...prev,
        [goalId]: {
          ...timer,
          elapsedTime: totalElapsed,
          isRunning: false,
        },
      };
    });
    addToast('Goal timer paused', 'info');
  };

  const stopGoalTimer = (goalId) => {
    setActiveGoalTimers((prev) => {
      const newTimers = { ...prev };
      delete newTimers[goalId];
      return newTimers;
    });
    addToast('Goal timer stopped', 'info');
  };

  // Format elapsed time from milliseconds to human readable format
  const formatElapsedTimeFromMs = (milliseconds) => {
    if (!milliseconds) return '0s';
    const totalSeconds = Math.round(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Format elapsed time from seconds to human readable format
  const formatElapsedTimeFromSeconds = (seconds) => {
    if (!seconds) return '0s';
    const totalSeconds = Math.round(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Format estimated time from minutes to human readable format
  const formatEstimatedTime = (minutes) => {
    if (!minutes) return '0m';
    const totalMinutes = Math.round(minutes);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatElapsedTime = (hours) => {
    if (!hours) return '0m';
    const totalMinutes = Math.round(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Global functions (same as original)
  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    addToast(`Switched to ${newTheme} mode`, 'info', 2000);
  };

  const openAddTaskModal = () => {
    setShowAddTaskModal(true);
  };

  const openAddGoalModal = () => {
    setShowAddGoalModal(true);
  };

  const closeModal = (modalId) => {
    if (modalId === 'add-task-modal') {
      setShowAddTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        category: 'assignment',
        dueDate: '',
        estimatedTime: '',
      });
    } else if (modalId === 'edit-task-modal') {
      setShowEditTaskModal(false);
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        category: 'assignment',
        dueDate: '',
        estimatedTime: '',
      });
    } else if (modalId === 'add-goal-modal') {
      setShowAddGoalModal(false);
      setGoalForm({
        title: '',
        description: '',
        targetDate: '',
        category: 'academic',
        estimatedTime: '',
      });
    }
  };

  const previousMonth = () => {
    const newDate = new Date(currentCalendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentCalendarDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentCalendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentCalendarDate(newDate);
  };

  const changeMonth = (monthValue) => {
    const newDate = new Date(currentCalendarDate);
    newDate.setMonth(parseInt(monthValue));
    setCurrentCalendarDate(newDate);
  };

  const changeYear = (yearValue) => {
    const newDate = new Date(currentCalendarDate);
    newDate.setFullYear(parseInt(yearValue));
    setCurrentCalendarDate(newDate);
  };

  const goToToday = () => {
    setCurrentCalendarDate(new Date());
  };

  // Calendar rendering functions
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;

    // Convert to Date objects if they're strings
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);

    // Check if dates are valid
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

    return d1.toDateString() === d2.toDateString();
  };

  const getTasksForDate = (date) => {
    return tasks.filter(
      (task) => task.dueDate && isSameDay(task.dueDate, date)
    );
  };

  const selectDate = (dateString) => {
    const selectedDate = new Date(dateString);
    setCurrentCalendarDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    );
  };

  const renderCalendar = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks (42 days)
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dayData = {
          date: new Date(currentDate),
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: isSameDay(currentDate, new Date()),
          tasks: getTasksForDate(currentDate),
        };
        calendar.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return calendar;
  };

  // Task management functions
  const toggleTaskStatus = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const actionText =
        newStatus === 'completed' ? 'completed' : 'marked as pending';

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                progress: newStatus === 'completed' ? 100 : 0,
                completedAt: newStatus === 'completed' ? new Date() : null,
              }
            : t
        )
      );

      addToast(`Task "${task.title}" ${actionText}!`, 'success');
    }
  };

  const deleteTask = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
      addToast(`Task "${task.title}" deleted successfully`, 'info');
    }
  };

  const editTask = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
        estimatedTime: task.estimatedTime
          ? Math.round(hoursToMinutes(task.estimatedTime)).toString()
          : '', // Convert hours back to minutes
      });
      setShowEditTaskModal(true);
    }
  };

  const updateTaskProgress = (taskId, progress) => {
    const progressValue = Math.max(0, Math.min(100, parseInt(progress)));
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              progress: progressValue,
              status:
                progressValue === 100
                  ? 'completed'
                  : progressValue > 0
                  ? 'in-progress'
                  : 'pending',
              completedAt: progressValue === 100 ? new Date() : null,
            }
          : task
      )
    );
  };

  // Goal management functions
  const editGoal = (goalId) => {
    // Implementation for editing goals
  };

  const deleteGoal = (goalId) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== goalId));
    }
  };

  const updateGoalProgress = (goalId, progress) => {
    const progressValue = Math.max(0, Math.min(100, parseInt(progress)));
    setGoals((prevGoals) =>
      prevGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress: progressValue,
              status: progressValue === 100 ? 'completed' : 'active',
            }
          : goal
      )
    );
  };

  // Form submission functions
  const handleAddTask = (e) => {
    e.preventDefault();

    if (!taskForm.title.trim()) {
      addToast('Please enter a task title', 'error');
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      category: taskForm.category,
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
      estimatedTime: parseFloat(taskForm.estimatedTime) || 0, // Store 0 if no time provided
      userProvidedTime: Boolean(
        taskForm.estimatedTime && parseFloat(taskForm.estimatedTime) > 0
      ), // Track if user provided time
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      completedAt: null,
      timeSpent: 0,
    };

    // Update state - this will trigger localStorage save via useEffect
    setTasks((prevTasks) => [...prevTasks, newTask]);

    // Task added successfully - timer must be started manually
    addToast(`Task "${newTask.title}" added successfully!`, 'success');

    closeModal('add-task-modal');
  };

  const handleEditTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      addToast('Please enter a task title', 'error');
      return;
    }

    if (!editingTask) {
      addToast('No task selected for editing', 'error');
      return;
    }

    const updatedTask = {
      ...editingTask,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      category: taskForm.category,
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
      estimatedTime: minutesToHours(parseFloat(taskForm.estimatedTime) || 0), // Convert minutes to hours
    };

    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === editingTask.id ? updatedTask : task))
    );
    addToast(`Task "${updatedTask.title}" updated successfully!`, 'success');
    closeModal('edit-task-modal');
  };

  const handleAddGoal = (e) => {
    e.preventDefault();

    if (!goalForm.title.trim()) {
      addToast('Please enter a goal title', 'error');
      return;
    }

    const newGoal = {
      id: Date.now().toString(),
      title: goalForm.title.trim(),
      description: goalForm.description.trim(),
      category: goalForm.category,
      targetDate: goalForm.targetDate ? new Date(goalForm.targetDate) : null,
      estimatedTime: parseFloat(goalForm.estimatedTime) || 0, // Store 0 if no time provided
      userProvidedTime: Boolean(
        goalForm.estimatedTime && parseFloat(goalForm.estimatedTime) > 0
      ), // Track if user provided time
      status: 'active',
      progress: 0,
      timeSpent: 0,
      createdAt: new Date(),
    };

    // Update state - this will trigger localStorage save via useEffect
    setGoals((prevGoals) => [...prevGoals, newGoal]);

    // Goal added successfully - timer must be started manually
    addToast(`Goal "${newGoal.title}" added successfully!`, 'success');

    closeModal('add-goal-modal');
  };

  const handleTaskFormChange = (field, value) => {
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGoalFormChange = (field, value) => {
    setGoalForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Statistics functions
  const calculateWeeklyStats = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weeklyCompleted = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate =
        task.completedAt instanceof Date
          ? task.completedAt
          : new Date(task.completedAt);
      return !isNaN(completedDate.getTime()) && completedDate >= weekStart;
    }).length;

    const totalDays = Math.max(
      1,
      Math.ceil((today - weekStart) / (1000 * 60 * 60 * 24))
    );
    const dailyAverage = (weeklyCompleted / totalDays).toFixed(1);

    // Calculate streak
    let streak = 0;
    let currentDate = new Date(today);
    while (true) {
      const dayTasks = tasks.filter((task) => {
        if (!task.completedAt) return false;
        const completedDate =
          task.completedAt instanceof Date
            ? task.completedAt
            : new Date(task.completedAt);
        return (
          !isNaN(completedDate.getTime()) &&
          isSameDay(completedDate, currentDate)
        );
      });
      if (dayTasks.length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
      if (streak > 365) break; // Prevent infinite loop
    }

    return { weeklyCompleted, dailyAverage, streak };
  };

  return (
    <div className="app-container">
      {/* Header - EXACT copy of original */}
      <header className="header">
        <div className="header-content">
          <div className="header-brand">
            <div className="app-logo">
              <img src="icon.svg" alt="Smart Study Planner Logo" />
            </div>
            <h1>Smart Study Planner</h1>
          </div>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title="Toggle Dark/Light Mode"
            >
              <i
                className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}
                id="theme-icon"
              ></i>
            </button>
            <span className="current-date" id="current-date">
              {currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <button className="btn-primary" onClick={openAddTaskModal}>
              <i className="fas fa-plus"></i> Add Task
            </button>
          </div>
        </div>
      </header>

      {/* Navigation - EXACT copy of original */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => switchTab('dashboard')}
        >
          <i className="fas fa-tachometer-alt"></i> Dashboard
        </button>
        <button
          className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => switchTab('tasks')}
        >
          <i className="fas fa-tasks"></i> Tasks
        </button>
        <button
          className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => switchTab('calendar')}
        >
          <i className="fas fa-calendar-alt"></i> Calendar
        </button>
        <button
          className={`nav-tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => switchTab('goals')}
        >
          <i className="fas fa-bullseye"></i> Goals
        </button>
        <button
          className={`nav-tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => switchTab('statistics')}
        >
          <i className="fas fa-chart-bar"></i> Statistics
        </button>
      </nav>

      {/* Main Content - EXACT copy of original */}
      <main className="main-content">
        {/* Dashboard Tab - EXACT copy */}
        <div
          className={`tab-content ${activeTab === 'dashboard' ? 'active' : ''}`}
          id="dashboard"
        >
          <div className="dashboard-grid">
            <div className="stats-card">
              <div className="stat-icon">
                <i className="fas fa-tasks"></i>
              </div>
              <div className="stat-info">
                <span className="stat-number" id="total-tasks">
                  {tasks.length}
                </span>
                <span className="stat-label">Total Tasks</span>
              </div>
            </div>
            <div className="stats-card">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-info">
                <span className="stat-number" id="completed-tasks">
                  {tasks.filter((t) => t.status === 'completed').length}
                </span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
            <div className="stats-card">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-info">
                <span className="stat-number" id="pending-tasks">
                  {tasks.filter((t) => t.status !== 'completed').length}
                </span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
            <div className="stats-card">
              <div className="stat-icon">
                <i className="fas fa-bullseye"></i>
              </div>
              <div className="stat-info">
                <span className="stat-number" id="active-goals">
                  {goals.filter((g) => g.status === 'active').length}
                </span>
                <span className="stat-label">Active Goals</span>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            <section className="recent-tasks">
              <h2>
                <i className="fas fa-history"></i> Recent Tasks
              </h2>
              <div className="task-list" id="recent-tasks-list">
                {tasks.length === 0 ? (
                  <p className="empty-state">
                    No tasks yet. Create your first task!
                  </p>
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className={`task-item ${task.status} ${task.priority}-priority`}
                    >
                      <div className="task-header">
                        <span className="task-title">
                          {task.title && task.title.trim()
                            ? task.title
                            : 'Untitled Task'}
                        </span>
                        <div className="task-actions">
                          <button
                            className="task-action-btn"
                            onClick={() => toggleTaskStatus(task.id)}
                            title={
                              task.status === 'completed'
                                ? 'Mark as pending'
                                : 'Mark as completed'
                            }
                          >
                            <i
                              className={`fas fa-${
                                task.status === 'completed' ? 'undo' : 'check'
                              }`}
                            ></i>
                          </button>
                        </div>
                      </div>
                      {task.description && (
                        <div className="task-description">
                          {task.description}
                        </div>
                      )}
                      <div className="task-meta">
                        <div className="task-tags">
                          <span className="task-tag">{task.category}</span>
                          <span className="task-tag">{task.priority}</span>
                          {task.userProvidedTime && task.estimatedTime > 0 && (
                            <span className="task-tag estimated-time">
                              {formatEstimatedTime(task.estimatedTime)}
                            </span>
                          )}
                          {activeTimers[task.id] && (
                            <span className="task-tag timer-display">
                              ⏱️{' '}
                              {formatElapsedTimeFromMs(
                                activeTimers[task.id].elapsedTime
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timer Controls */}
                      <div className="timer-controls">
                        {!activeTimers[task.id]?.isRunning ? (
                          <button
                            className="timer-btn start-timer"
                            onClick={() => startTimer(task.id)}
                            title="Start Timer"
                          >
                            <i className="fas fa-play"></i> Start Timer
                          </button>
                        ) : (
                          <>
                            <button
                              className="timer-btn pause-timer"
                              onClick={() => pauseTimer(task.id)}
                              title="Pause Timer"
                            >
                              <i className="fas fa-pause"></i> Pause
                            </button>
                            <button
                              className="timer-btn stop-timer"
                              onClick={() => stopTimer(task.id)}
                              title="Stop Timer"
                            >
                              <i className="fas fa-stop"></i> Stop
                            </button>
                          </>
                        )}
                        {task.timeSpent > 0 && (
                          <span className="time-spent">
                            Total: {formatElapsedTimeFromMs(task.timeSpent)}
                          </span>
                        )}

                        {/* Progress bar for tasks */}
                        <div
                          className="timer-progress"
                          style={{ marginTop: '8px' }}
                        >
                          {(() => {
                            const currentTimeMs =
                              activeTimers[task.id]?.elapsedTime ||
                              task.timeSpent ||
                              0;
                            const totalTimeMs =
                              (task.estimatedTime > 0
                                ? task.estimatedTime
                                : 30) *
                              60 *
                              1000; // Use default 30 min if no time provided
                            const rawProgressPercentage =
                              (currentTimeMs / totalTimeMs) * 100;
                            const progressPercentage = Math.min(
                              Math.max(rawProgressPercentage, 0),
                              100
                            ); // Clamp [0,100]
                            const isOvertime = rawProgressPercentage > 100;

                            // Calculate remaining time
                            const remainingMs = Math.max(
                              0,
                              totalTimeMs - currentTimeMs
                            );
                            const remainingMin = Math.floor(
                              remainingMs / 60000
                            );
                            const remainingSec = Math.floor(
                              (remainingMs % 60000) / 1000
                            );

                            // Debug render progress
                            console.log(
                              `🖥️ UI RENDER DEBUG for Task "${task.title}":`,
                              {
                                currentTimeMs,
                                taskEstimatedMinutes: task.estimatedTime,
                                totalTimeMs,
                                rawProgressPercentage,
                                progressPercentage,
                                remainingMs,
                                remainingTime: `${remainingMin}m ${remainingSec}s`,
                                isOvertime,
                                formula: `${currentTimeMs}ms / ${totalTimeMs}ms * 100 = ${rawProgressPercentage.toFixed(
                                  2
                                )}%`,
                              }
                            );

                            return (
                              <div style={{ position: 'relative' }}>
                                <div
                                  className={`timer-progress-bar ${
                                    isOvertime ? 'overtime' : ''
                                  }`}
                                  style={{
                                    width: `${progressPercentage}%`,
                                    background: isOvertime
                                      ? 'linear-gradient(90deg, #ff5722, #d32f2f)'
                                      : 'linear-gradient(90deg, var(--success-color), var(--warning-color), var(--error-color))',
                                  }}
                                ></div>
                                {isOvertime && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: '-5px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      background: '#ff5722',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {Math.round(progressPercentage)}%
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="upcoming-deadlines">
              <h2>
                <i className="fas fa-exclamation-triangle"></i> Upcoming
                Deadlines
              </h2>
              <div className="deadline-list" id="upcoming-deadlines-list">
                <p className="empty-state">No upcoming deadlines.</p>
              </div>
            </section>
          </div>
        </div>

        {/* Tasks Tab - EXACT copy */}
        <div
          className={`tab-content ${activeTab === 'tasks' ? 'active' : ''}`}
          id="tasks"
        >
          <div className="tasks-header">
            <h2>
              <i className="fas fa-tasks"></i> Study Tasks
            </h2>
            <div className="task-filters">
              <div className="select-wrapper">
                <select
                  id="task-filter"
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value)}
                >
                  <option value="all">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="select-wrapper">
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
          </div>
          <div className="tasks-container">
            <div className="all-tasks" id="all-tasks-list">
              {tasks.length === 0 ? (
                <p className="empty-state">
                  No tasks yet. Create your first task!
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-item ${task.status} ${task.priority}-priority`}
                  >
                    <div className="task-header">
                      <span className="task-title">
                        {task.title && task.title.trim()
                          ? task.title
                          : 'Untitled Task'}
                      </span>
                      <div className="task-actions">
                        <button
                          className="task-action-btn"
                          onClick={() => editTask(task.id)}
                          title="Edit task"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="task-action-btn"
                          onClick={() => toggleTaskStatus(task.id)}
                          title={
                            task.status === 'completed'
                              ? 'Mark as pending'
                              : 'Mark as completed'
                          }
                        >
                          <i
                            className={`fas fa-${
                              task.status === 'completed' ? 'undo' : 'check'
                            }`}
                          ></i>
                        </button>
                        <button
                          className="task-action-btn"
                          onClick={() => deleteTask(task.id)}
                          title="Delete task"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    {task.description && (
                      <div className="task-description">{task.description}</div>
                    )}
                    <div className="task-progress" style={{ margin: '1rem 0' }}>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${task.progress || 0}%` }}
                        ></div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.5rem',
                        }}
                      >
                        <span className="progress-text">
                          {task.progress || 0}% Complete
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={task.progress || 0}
                          onChange={(e) =>
                            updateTaskProgress(task.id, e.target.value)
                          }
                          style={{ width: '100px' }}
                        />
                      </div>
                    </div>
                    <div className="task-meta">
                      <div className="task-tags">
                        <span className="task-tag">{task.category}</span>
                        <span className="task-tag">{task.priority}</span>
                        {task.userProvidedTime && task.estimatedTime > 0 && (
                          <span className="task-tag estimated-time">
                            {formatEstimatedTime(task.estimatedTime)}
                          </span>
                        )}
                        {activeTimers[task.id] && (
                          <span className="task-tag timer-display">
                            ⏱️{' '}
                            {formatElapsedTimeFromMs(
                              activeTimers[task.id].elapsedTime
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timer Controls */}
                    <div className="timer-controls">
                      {!activeTimers[task.id]?.isRunning ? (
                        <button
                          className="timer-btn start-timer"
                          onClick={() => startTimer(task.id)}
                          title="Start Timer"
                        >
                          <i className="fas fa-play"></i> Start Timer
                        </button>
                      ) : (
                        <>
                          <button
                            className="timer-btn pause-timer"
                            onClick={() => pauseTimer(task.id)}
                            title="Pause Timer"
                          >
                            <i className="fas fa-pause"></i> Pause
                          </button>
                          <button
                            className="timer-btn stop-timer"
                            onClick={() => stopTimer(task.id)}
                            title="Stop Timer"
                          >
                            <i className="fas fa-stop"></i> Stop
                          </button>
                        </>
                      )}
                      {task.timeSpent > 0 && (
                        <span className="time-spent">
                          Total: {formatElapsedTimeFromMs(task.timeSpent)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Calendar Tab - EXACT copy */}
        <div
          className={`tab-content ${activeTab === 'calendar' ? 'active' : ''}`}
          id="calendar"
        >
          <div className="calendar-header">
            <h2>
              <i className="fas fa-calendar-alt"></i> Study Calendar
            </h2>
            <div className="calendar-controls">
              <button onClick={previousMonth} title="Previous Month">
                <i className="fas fa-chevron-left"></i>
              </button>

              <div className="date-selectors">
                <select
                  id="calendar-month-select"
                  value={currentCalendarDate.getMonth()}
                  onChange={(e) => changeMonth(e.target.value)}
                >
                  <option value="0">January</option>
                  <option value="1">February</option>
                  <option value="2">March</option>
                  <option value="3">April</option>
                  <option value="4">May</option>
                  <option value="5">June</option>
                  <option value="6">July</option>
                  <option value="7">August</option>
                  <option value="8">September</option>
                  <option value="9">October</option>
                  <option value="10">November</option>
                  <option value="11">December</option>
                </select>

                <select
                  id="calendar-year-select"
                  value={currentCalendarDate.getFullYear()}
                  onChange={(e) => changeYear(e.target.value)}
                >
                  {Array.from({ length: 41 }, (_, i) => 2000 + i).map(
                    (year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  )}
                </select>

                <button
                  onClick={goToToday}
                  className="today-btn"
                  title="Go to Today"
                >
                  <i className="fas fa-calendar-day"></i> Today
                </button>
              </div>

              <button onClick={nextMonth} title="Next Month">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div className="calendar-grid" id="calendar-grid">
            {/* Calendar header days */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="calendar-header-day"
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  padding: '1rem',
                }}
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {renderCalendar().map((day, index) => (
              <div
                key={index}
                className={`calendar-day ${
                  !day.isCurrentMonth ? 'other-month' : ''
                } ${day.isToday ? 'today' : ''}`}
                onClick={() => selectDate(day.date.toISOString().split('T')[0])}
                title={`Click to select ${day.date.toLocaleDateString()}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="day-number">{day.date.getDate()}</div>
                <div className="day-events">
                  {day.tasks.slice(0, 3).map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className="day-event"
                      title={task.title}
                    >
                      {task.title.substring(0, 20)}
                      {task.title.length > 20 ? '...' : ''}
                    </div>
                  ))}
                  {day.tasks.length > 3 && (
                    <div className="day-event">
                      +{day.tasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Tab - EXACT copy */}
        <div
          className={`tab-content ${activeTab === 'goals' ? 'active' : ''}`}
          id="goals"
        >
          <div className="goals-header">
            <h2>
              <i className="fas fa-bullseye"></i> Study Goals
            </h2>
            <button className="btn-primary" onClick={openAddGoalModal}>
              <i className="fas fa-plus"></i> Add Goal
            </button>
          </div>
          <div className="goals-container">
            <div className="goals-list" id="goals-list">
              {goals.length === 0 ? (
                <p className="empty-state">
                  No goals set yet. Create your first goal!
                </p>
              ) : (
                goals.map((goal) => {
                  return (
                    <div key={goal.id} className="goal-item">
                      <div className="goal-header">
                        <span className="goal-title">
                          {goal.title || 'Untitled Goal'}
                        </span>
                        <div className="task-actions">
                          <button
                            className="task-action-btn"
                            onClick={() => editGoal(goal.id)}
                            title="Edit goal"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="task-action-btn"
                            onClick={() => deleteGoal(goal.id)}
                            title="Delete goal"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      {goal.description && (
                        <div className="goal-description">
                          {goal.description}
                        </div>
                      )}

                      {/* Timer section for goals */}
                      {goal.estimatedTime > 0 && (
                        <div className="timer-section">
                          <div className="timer-info">
                            <div className="time-display">
                              <span className="time-label">Time Spent:</span>
                              <span className="time-value">
                                {formatElapsedTimeFromMs(
                                  activeGoalTimers[goal.id]?.elapsedTime ||
                                    goal.timeSpent ||
                                    0
                                )}
                              </span>
                            </div>
                            <div className="time-display">
                              <span className="time-label">Estimated:</span>
                              <span className="time-value">
                                {formatEstimatedTime(goal.estimatedTime)}
                              </span>
                            </div>
                            <div className="timer-progress">
                              {(() => {
                                const currentTimeMs =
                                  activeGoalTimers[goal.id]?.elapsedTime ||
                                  goal.timeSpent ||
                                  0;
                                const totalTimeMs =
                                  goal.estimatedTime * 60 * 1000; // EXACT: minutes * 60 * 1000
                                const rawProgressPercentage =
                                  (currentTimeMs / totalTimeMs) * 100;
                                const progressPercentage = Math.min(
                                  Math.max(rawProgressPercentage, 0),
                                  100
                                ); // Clamp [0,100]
                                const isOvertime = rawProgressPercentage > 100;

                                // Calculate remaining time
                                const remainingMs = Math.max(
                                  0,
                                  totalTimeMs - currentTimeMs
                                );
                                const remainingMin = Math.floor(
                                  remainingMs / 60000
                                );
                                const remainingSec = Math.floor(
                                  (remainingMs % 60000) / 1000
                                );

                                // Debug render progress
                                console.log(
                                  `🖥️ UI RENDER DEBUG for Goal "${goal.title}":`,
                                  {
                                    currentTimeMs,
                                    goalEstimatedMinutes: goal.estimatedTime,
                                    totalTimeMs,
                                    rawProgressPercentage,
                                    progressPercentage,
                                    remainingMs,
                                    remainingTime: `${remainingMin}m ${remainingSec}s`,
                                    isOvertime,
                                    formula: `${currentTimeMs}ms / ${totalTimeMs}ms * 100 = ${rawProgressPercentage.toFixed(
                                      2
                                    )}%`,
                                  }
                                );

                                return (
                                  <>
                                    <div
                                      className={`timer-progress-bar ${
                                        isOvertime ? 'overtime' : ''
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          progressPercentage,
                                          100
                                        )}%`,
                                        background: isOvertime
                                          ? 'linear-gradient(90deg, #ff5722, #d32f2f)'
                                          : 'linear-gradient(90deg, var(--success-color), var(--warning-color), var(--error-color))',
                                      }}
                                    ></div>
                                    {isOvertime && (
                                      <div
                                        className="overtime-indicator"
                                        style={{
                                          position: 'absolute',
                                          right: '-5px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          background: '#ff5722',
                                          color: 'white',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                        }}
                                      >
                                        {Math.round(progressPercentage)}%
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="timer-controls">
                            {!activeGoalTimers[goal.id]?.isRunning ? (
                              <button
                                className="timer-btn start-timer"
                                onClick={() => startGoalTimer(goal.id)}
                                title="Start Timer"
                              >
                                <i className="fas fa-play"></i>
                                <span>Start</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  className="timer-btn pause-timer"
                                  onClick={() => pauseGoalTimer(goal.id)}
                                  title="Pause Timer"
                                >
                                  <i className="fas fa-pause"></i>
                                  <span>Pause</span>
                                </button>
                                <button
                                  className="timer-btn stop-timer"
                                  onClick={() => stopGoalTimer(goal.id)}
                                  title="Stop Timer"
                                >
                                  <i className="fas fa-stop"></i>
                                  <span>Stop</span>
                                </button>
                              </>
                            )}
                          </div>
                          {activeGoalTimers[goal.id]?.isRunning && (
                            <div className="timer-indicator">
                              <div className="timer-pulse"></div>
                              <span>Timer Running</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="goal-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${goal.progress || 0}%` }}
                          ></div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.5rem',
                          }}
                        >
                          <span className="progress-text">
                            {goal.progress || 0}% Complete
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={goal.progress || 0}
                            onChange={(e) =>
                              updateGoalProgress(goal.id, e.target.value)
                            }
                            style={{ width: '100px' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Statistics Tab - EXACT copy */}
        <div
          className={`tab-content ${
            activeTab === 'statistics' ? 'active' : ''
          }`}
          id="statistics"
        >
          <div className="statistics-header">
            <h2>
              <i className="fas fa-chart-bar"></i> Productivity Statistics
            </h2>
          </div>
          <div className="stats-dashboard">
            <div className="chart-container">
              <h3>Weekly Progress</h3>
              <div className="progress-chart" id="weekly-chart">
                {/* Weekly progress chart with last 7 days (like original) */}
                {(() => {
                  const today = new Date();
                  const days = [];

                  // Get data for the last 7 days (like original)
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dayTasks = tasks.filter((task) => {
                      if (!task.completedAt) return false;
                      return isSameDay(task.completedAt, date);
                    }).length;
                    days.push({
                      date,
                      completed: dayTasks,
                      day: date.toLocaleDateString('en-US', {
                        weekday: 'short',
                      }),
                    });
                  }

                  const maxTasks = Math.max(...days.map((d) => d.completed), 1);

                  return (
                    <div className="weekly-chart">
                      <div className="chart-bars">
                        {days.map((day, index) => (
                          <div key={index} className="chart-bar-container">
                            <div
                              className="chart-bar"
                              style={{
                                height: `${(day.completed / maxTasks) * 100}%`,
                                minHeight: day.completed > 0 ? '4px' : '2px',
                              }}
                              title={`${day.completed} tasks completed`}
                            >
                              {day.completed > 0 && (
                                <span className="bar-value">
                                  {day.completed}
                                </span>
                              )}
                            </div>
                            <div className="bar-label">
                              <div className="day-name">{day.day}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="productivity-metrics">
              <h3>Performance Metrics</h3>
              <div className="metric-item">
                <span className="metric-label">Tasks Completed This Week:</span>
                <span className="metric-value" id="weekly-completed">
                  {calculateWeeklyStats().weeklyCompleted}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Average Daily Tasks:</span>
                <span className="metric-value" id="daily-average">
                  {calculateWeeklyStats().dailyAverage}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Study Streak:</span>
                <span className="metric-value" id="study-streak">
                  {calculateWeeklyStats().streak} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Notification Container - EXACT copy */}
      <div className="notification-container" id="notification-container"></div>

      {/* Add Task Modal - EXACT copy */}
      {showAddTaskModal && (
        <div className="modal show" id="add-task-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <i className="fas fa-plus"></i> Add New Task
              </h3>
              <button
                className="close-btn"
                onClick={() => closeModal('add-task-modal')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form id="add-task-form" onSubmit={handleAddTask}>
                <div className="form-group">
                  <label htmlFor="task-title">Task Title</label>
                  <input
                    type="text"
                    id="task-title"
                    value={taskForm.title}
                    onChange={(e) =>
                      handleTaskFormChange('title', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="task-description">Description</label>
                  <textarea
                    id="task-description"
                    rows="3"
                    value={taskForm.description}
                    onChange={(e) =>
                      handleTaskFormChange('description', e.target.value)
                    }
                  ></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>
                    <select
                      id="task-priority"
                      value={taskForm.priority}
                      onChange={(e) =>
                        handleTaskFormChange('priority', e.target.value)
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-category">Category</label>
                    <select
                      id="task-category"
                      value={taskForm.category}
                      onChange={(e) =>
                        handleTaskFormChange('category', e.target.value)
                      }
                    >
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="project">Project</option>
                      <option value="reading">Reading</option>
                      <option value="research">Research</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-due-date">Due Date</label>
                    <input
                      type="date"
                      id="task-due-date"
                      value={taskForm.dueDate}
                      onChange={(e) =>
                        handleTaskFormChange('dueDate', e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-estimated-time">
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      id="task-estimated-time"
                      min="5"
                      step="5"
                      placeholder="Enter minutes (e.g., 30, 60, 120)"
                      value={taskForm.estimatedTime}
                      onChange={(e) =>
                        handleTaskFormChange('estimatedTime', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => closeModal('add-task-modal')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && (
        <div className="modal show" id="edit-task-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <i className="fas fa-edit"></i> Edit Task
              </h3>
              <button
                className="close-btn"
                onClick={() => closeModal('edit-task-modal')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form id="edit-task-form" onSubmit={handleEditTask}>
                <div className="form-group">
                  <label htmlFor="edit-task-title">Task Title</label>
                  <input
                    type="text"
                    id="edit-task-title"
                    value={taskForm.title}
                    onChange={(e) =>
                      handleTaskFormChange('title', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-task-description">Description</label>
                  <textarea
                    id="edit-task-description"
                    rows="3"
                    value={taskForm.description}
                    onChange={(e) =>
                      handleTaskFormChange('description', e.target.value)
                    }
                  ></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-task-priority">Priority</label>
                    <select
                      id="edit-task-priority"
                      value={taskForm.priority}
                      onChange={(e) =>
                        handleTaskFormChange('priority', e.target.value)
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-task-category">Category</label>
                    <select
                      id="edit-task-category"
                      value={taskForm.category}
                      onChange={(e) =>
                        handleTaskFormChange('category', e.target.value)
                      }
                    >
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="project">Project</option>
                      <option value="reading">Reading</option>
                      <option value="research">Research</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-task-due-date">Due Date</label>
                    <input
                      type="date"
                      id="edit-task-due-date"
                      value={taskForm.dueDate}
                      onChange={(e) =>
                        handleTaskFormChange('dueDate', e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-task-estimated-time">
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      id="edit-task-estimated-time"
                      min="5"
                      step="5"
                      placeholder="Enter minutes (e.g., 30, 60, 120)"
                      value={taskForm.estimatedTime}
                      onChange={(e) =>
                        handleTaskFormChange('estimatedTime', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => closeModal('edit-task-modal')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal - EXACT copy */}
      {showAddGoalModal && (
        <div className="modal show" id="add-goal-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <i className="fas fa-bullseye"></i> Add New Goal
              </h3>
              <button
                className="close-btn"
                onClick={() => closeModal('add-goal-modal')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form id="add-goal-form" onSubmit={handleAddGoal}>
                <div className="form-group">
                  <label htmlFor="goal-title">Goal Title</label>
                  <input
                    type="text"
                    id="goal-title"
                    value={goalForm.title}
                    onChange={(e) =>
                      handleGoalFormChange('title', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="goal-description">Description</label>
                  <textarea
                    id="goal-description"
                    rows="3"
                    value={goalForm.description}
                    onChange={(e) =>
                      handleGoalFormChange('description', e.target.value)
                    }
                  ></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="goal-target-date">Target Date</label>
                    <input
                      type="date"
                      id="goal-target-date"
                      value={goalForm.targetDate}
                      onChange={(e) =>
                        handleGoalFormChange('targetDate', e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="goal-category">Category</label>
                    <select
                      id="goal-category"
                      value={goalForm.category}
                      onChange={(e) =>
                        handleGoalFormChange('category', e.target.value)
                      }
                    >
                      <option value="academic">Academic</option>
                      <option value="skill">Skill Development</option>
                      <option value="project">Project</option>
                      <option value="exam">Exam Preparation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="goal-estimated-time">
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      id="goal-estimated-time"
                      value={goalForm.estimatedTime}
                      onChange={(e) =>
                        handleGoalFormChange('estimatedTime', e.target.value)
                      }
                      min="5"
                      step="5"
                      placeholder="Enter minutes (e.g., 30, 60, 120)"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => closeModal('add-goal-modal')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <div className="toast-content">
              <i
                className={`fas fa-${
                  toast.type === 'success'
                    ? 'check-circle'
                    : toast.type === 'error'
                    ? 'exclamation-circle'
                    : toast.type === 'warning'
                    ? 'exclamation-triangle'
                    : 'info-circle'
                }`}
              ></i>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
