BrandsCrap-Web/
├── index.html
├── src/
│   ├── main.js                # Main App Logic & Initialization
│   ├── ui.js                  # UI Rendering and Event Handlers
│   ├── db.js                  # IndexedDB Data Storage Logic
│   ├── brandfetch.js          # Brandfetch API Integration
│   ├── datasources/
│   │   ├── wikipedia.js       # Wikipedia Brand Scraping
│   │   ├── baidu.js           # Baidu Brand Scraping (if CORS/back-end ready)
│   │   └── ...                # Other Data Source Integrations
│   ├── logo.js                # Logo Fetching (Clearbit, favicon fallback, etc.)
│   ├── merge.js               # Data Merging, Deduplication, Validation
│   └── utils.js               # Utilities (logging, alerts, helpers)
└── README.md