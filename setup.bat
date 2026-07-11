@echo off
echo Podify Setup Script

REM Install dependencies
echo Installing dependencies...
call pnpm install

REM Create database
echo Setting up database...
call pnpm exec prisma migrate dev

REM Setup complete
echo.
echo Setup complete!
echo.
echo Frontend server will run on http://localhost:5173
echo Backend API server will run on http://localhost:3000
echo.
echo To start the frontend server, run: pnpm run dev
echo To start the backend server, run: pnpm run simple-server
echo.
pause
