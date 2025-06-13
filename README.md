# Twitter Clone (recreated without AWS) 
![Screenshot 2025-06-13 174724](https://github.com/user-attachments/assets/1023110f-ef95-43af-987d-130da5ef6f1a)


A full-stack Twitter clone application built with Flask backend and React frontend.

## Features

- User authentication (signup, login, logout)
- Create, read, update, and delete tweets
- Follow/unfollow other users
- Real-time updates using WebSocket
- Profile customization
- Image upload support
- Responsive design

## Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn
- Git

## Installation and Setup

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/YourUsername/Twitter-Clone.git
cd Twitter-Clone
```

2. Set up Python virtual environment:
```bash
cd backend
python -m venv venv
```

3. Activate the virtual environment:
- Windows:
```bash
.\venv\Scripts\activate
```
- Unix or MacOS:
```bash
source venv/bin/activate
```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. Initialize the database:
```bash
python init_db.py
```

6. Start the backend server:
```bash
python run.py
```

The backend server will start running on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm start
```

The frontend application will start running on `http://localhost:3000`

## Environment Variables

Create a `.env` file in the backend directory with the following variables:
```
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///twitter.db
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Flask and React
- Uses SQLAlchemy for database management
- Real-time functionality implemented with Flask-SocketIO
