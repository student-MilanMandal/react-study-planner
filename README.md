# Smart Study Planner 📚

A comprehensive web-based study planner application designed to help students organize their academic tasks, set goals, and track productivity. Built with vanilla HTML, CSS, and JavaScript with local storage for data persistence.


## ✨ Features

### 📋 Task Management

- **Create, Edit, Delete Tasks**: Full CRUD operations for study tasks
- **Priority Levels**: High, Medium, Low priority classification
- **Categories**: Organize tasks by type (Assignment, Exam, Project, Reading, Research, Other)
- **Progress Tracking**: Visual progress bars with manual progress updates
- **Due Date Management**: Set and track task deadlines
- **Time Estimation**: Estimate and track study time for each task
- **Status Tracking**: Pending, In-Progress, and Completed states

### 🎯 Goal Setting & Tracking

- **Smart Goals**: Create and manage study goals with target dates
- **Progress Monitoring**: Visual progress indicators for goal completion
- **Goal Categories**: Academic, Skill Development, Project, Exam Preparation
- **Goal Analytics**: Track goal completion rates and timelines

### 📅 Calendar Integration

- **Visual Calendar**: Month view with task and deadline visualization
- **Deadline Tracking**: Clear visualization of upcoming deadlines
- **Event Management**: View tasks organized by date
- **Navigation**: Easy month-to-month navigation

### 📊 Productivity Analytics

- **Dashboard Overview**: Real-time statistics and metrics
- **Weekly Progress Charts**: Visual representation of daily task completion
- **Performance Metrics**:
  - Tasks completed this week
  - Average daily task completion
  - Study streak tracking
- **Productivity Insights**: Data-driven insights into study habits

### 🔔 Smart Reminders

- **Deadline Alerts**: Automatic notifications 24 hours and 1 hour before deadlines
- **Progress Reminders**: Smart notifications for task and goal updates
- **Custom Notifications**: Success, warning, and error notifications

### 💾 Data Persistence

- **Local Storage**: All data saved locally in browser
- **Auto-Save**: Automatic saving of all changes
- **Data Export/Import**: Easy backup and restore functionality
- **Offline Support**: Works without internet connection

### 📱 Responsive Design

- **Mobile-Friendly**: Optimized for all device sizes
- **Touch-Friendly**: Easy-to-use touch interface
- **Modern UI**: Clean, intuitive design with smooth animations
- **Accessibility**: ARIA labels and keyboard navigation support

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server required - runs entirely in the browser

1. **Download the files**:

   ```bash
   git clone https://github.com/student-MilanMandal/smart-study-planner.git
   cd smart-study-planner
   ```

### 🏠 Dashboard

The dashboard provides a quick overview of your study activities:

- **Statistics Cards**: Total tasks, completed tasks, pending tasks, active goals
- **Recent Tasks**: Your latest 5 tasks with quick actions
- **Upcoming Deadlines**: Next 5 upcoming deadlines sorted by urgency

### ✅ Task Management

1. **Adding Tasks**:

   - Click "Add Task" button
   - Fill in task details (title, description, priority, category, due date, estimated time)
   - Click "Add Task" to save

2. **Managing Tasks**:

   - **Edit**: Click the edit icon to modify task details
   - **Complete**: Click the check icon to mark as completed
   - **Delete**: Click the trash icon to remove tasks
   - **Progress**: Use the progress slider to update completion percentage

3. **Filtering Tasks**:
   - Filter by status: All, Pending, In-Progress, Completed
   - Filter by priority: All, High, Medium, Low

### 🎯 Goal Management

1. **Creating Goals**:

   - Navigate to Goals tab
   - Click "Add Goal" button
   - Set goal details including target date and category

2. **Tracking Progress**:
   - Use progress sliders to update goal completion
   - Goals automatically mark as completed at 100%
   - Edit or delete goals as needed

### 📅 Calendar View

- **Navigation**: Use arrow buttons to navigate between months
- **Task Visualization**: See tasks displayed on their due dates
- **Quick Overview**: View up to 3 tasks per day, with overflow indicators

### 📊 Statistics & Analytics

- **Weekly Chart**: Bar chart showing daily task completions
- **Metrics Dashboard**:
  - Weekly completion count
  - Daily average performance
  - Current study streak
- **Performance Tracking**: Monitor productivity trends over time

## 🛠️ Technical Architecture

### File Structure

```
smart-study-planner/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # Core JavaScript functionality
├── sw.js              # Service worker for offline support
└── README.md          # This documentation file
```

### Key Components

#### Data Models

```javascript
// Task Object
{
    id: string,
    title: string,
    description: string,
    priority: 'high' | 'medium' | 'low',
    category: string,
    dueDate: Date | null,
    estimatedTime: number,
    status: 'pending' | 'in-progress' | 'completed',
    progress: number (0-100),
    createdAt: Date,
    completedAt: Date | null
}

// Goal Object
{
    id: string,
    title: string,
    description: string,
    category: string,
    targetDate: Date | null,
    status: 'active' | 'completed',
    progress: number (0-100),
    createdAt: Date
}
```

#### Local Storage Schema

- `studyPlannerTasks`: Array of task objects
- `studyPlannerGoals`: Array of goal objects

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🎨 Customization

### Color Themes

Modify the CSS variables in `styles.css` to customize colors:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --error-color: #f44336;
}
```

### Adding New Categories

Update the category options in both HTML forms and JavaScript validation:

```javascript
// In HTML
<option value="new-category">New Category</option>;

// In JavaScript validation if needed
const validCategories = [
  'assignment',
  'exam',
  'project',
  'reading',
  'research',
  'new-category',
  'other',
];
```

## 🔒 Privacy & Security

- **Local Storage Only**: All data remains on your device
- **No Server Communication**: No data sent to external servers
- **Privacy First**: No tracking, analytics, or data collection
- **Secure**: No authentication required, completely offline-capable

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Add comments for complex functionality
- Test on multiple browsers and device sizes
- Update documentation for new features

## 🐛 Troubleshooting

### Common Issues

**Tasks/Goals not saving**:

- Check if browser supports localStorage
- Ensure sufficient storage space available
- Try clearing browser cache and refreshing

**Calendar not displaying correctly**:

- Verify JavaScript is enabled
- Check browser console for errors
- Ensure valid date formats

**Notifications not working**:

- Check browser notification permissions
- Verify JavaScript execution
- Clear browser cache if needed

### Browser Storage Limits

- Most browsers limit localStorage to 5-10MB
- Monitor storage usage in browser dev tools
- Consider implementing data cleanup for old completed tasks

## 🙏 Acknowledgments

- Font Awesome for icons
- Google Fonts for typography
- Modern CSS Grid and Flexbox for layouts
- Vanilla JavaScript for lightweight performance

## 📞 Support

If you encounter any issues or have questions:

1. Check this README for common solutions
2. Search existing issues in the repository
3. Create a new issue with detailed description
4. Include browser version and error messages

---

**Happy Studying! 🎓✨**

Made with Milan Mandal ❤️
