# Application Search App

A modern, responsive JavaScript web application for searching and viewing application records from a JSON database. Built with vanilla JavaScript, HTML, and CSS.

## 🚀 Features

- **Search Functionality**: Search across multiple fields including:
  - Application ID
  - First Name / Last Name
  - SSN
  - Product Type
  - Agent ID
  - Application Status

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Two-Screen Interface**: 
  - Search screen for querying records
  - Details screen for viewing full application information
- **Real-time Search**: Instant filtering as you type
- **Keyboard Support**: Press Enter to search
- **Smooth Animations**: Elegant transitions between screens
- **Modern UI**: Beautiful gradient background and card-based layout

## 📋 Project Structure

```
application-search-app/
├── index.html      # Main HTML file
├── app.js          # JavaScript logic
├── styles.css      # CSS styling
├── db.json         # Sample database
├── package.json    # Project metadata
├── .gitignore      # Git ignore rules
└── README.md       # This file
```

## 🛠️ Installation & Setup

### Option 1: Using Node.js (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/ajammalamadaka/application-search-app.git
cd application-search-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will open in your browser at `http://localhost:8080`

### Option 2: Direct Browser Usage

1. Clone the repository or download the files
2. Open `index.html` directly in your web browser
3. The app will work locally without any server setup

## 📱 Usage

### Searching
1. Enter keywords in the search box:
   - Names (first or last)
   - Application ID (e.g., "APP1001")
   - SSN (e.g., "123-45-6789")
   - Product type (e.g., "Loan", "Credit Card")
   - Agent ID (e.g., "AGT001")
   - Status (e.g., "Pending", "Approved")

2. Click **Search** or press **Enter**
3. Results appear as clickable cards

### Viewing Details
1. Click on any search result card
2. View the full application details
3. Click **Back to Search** to return to the search screen

## 📊 Database Schema

The `db.json` file contains application records with the following structure:

```json
{
  "applications": [
    {
      "ApplicationID": "APP1001",
      "LastName": "Smith",
      "FirstName": "John",
      "SSN": "123-45-6789",
      "ApplicationStatus": "Pending",
      "DateOfApplicationSubmitted": "2026-03-01",
      "Product": "Personal Loan",
      "ProductType": "Unsecured",
      "AgentID": "AGT001"
    }
  ]
}
```

## 🎨 Customization

### Colors
Edit the color scheme in `styles.css`:
- Primary color: `#667eea` (purple-blue)
- Secondary color: `#764ba2` (purple)
- Background: Gradient from primary to secondary

### Database
Replace `db.json` with your own application records following the same schema.

### Styling
Modify `styles.css` to customize:
- Font family
- Colors
- Spacing
- Responsive breakpoints

## 💻 Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Flexbox, Grid, Animations
- **Vanilla JavaScript**: No frameworks or dependencies
- **JSON**: Data storage

## 📦 Dependencies

- `http-server` (Dev): Simple HTTP server for local development

## 🌐 Deployment

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Set source to `main` branch
3. Access at: `https://ajammalamadaka.github.io/application-search-app`

### Other Hosting
- Netlify: Drag & drop the files
- Vercel: Connect your GitHub repo
- Any static file hosting service

## ✨ Key Features Explained

### Search Algorithm
- Case-insensitive search
- Partial match support
- Searches across all relevant fields
- Real-time filtering

### Screen Navigation
- Smooth CSS transitions
- Active screen management
- Back button for easy navigation
- Clean state preservation

### Responsive Design
- Mobile-first approach
- Flexbox and Grid layouts
- Breakpoint at 600px
- Touch-friendly buttons

## 🐛 Troubleshooting

**Issue**: "Error loading application database"
- Solution: Ensure `db.json` is in the same directory as the HTML files
- Check browser console for CORS issues

**Issue**: Search not working
- Solution: Verify `db.json` is properly formatted JSON
- Check browser console for JavaScript errors

**Issue**: Styling looks broken
- Solution: Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Verify `styles.css` file exists in the same directory

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👤 Author

- **GitHub**: [@ajammalamadaka](https://github.com/ajammalamadaka)

## 🤝 Contributing

Feel free to fork this repository and submit pull requests with improvements!

## 📞 Support

For issues or questions, please open an issue on the GitHub repository.

---

**Version**: 1.0.0  
**Last Updated**: March 8, 2026
