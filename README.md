# StratForge

To start the application, run the following commands in separate terminals:

nodemon backend/app.js

cd frontend
npm run dev

cd ai_service
uvicorn main:app --port 8001 --reload