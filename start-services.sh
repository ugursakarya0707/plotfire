#!/bin/bash

# Renklendirme için
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting databases...${NC}"
docker-compose up -d postgres video-conference-db
echo -e "${GREEN}Databases started${NC}"

echo -e "${YELLOW}Starting Auth Service...${NC}"
cd apps/auth-service && npm run start:dev &
AUTH_PID=$!
echo -e "${GREEN}Auth Service started on port 3001${NC}"

echo -e "${YELLOW}Starting Class Service...${NC}"
cd ../class-service && npm run start:dev &
CLASS_PID=$!
echo -e "${GREEN}Class Service started on port 3002${NC}"

echo -e "${YELLOW}Starting Video Conference Service...${NC}"
cd ../video-conference-service && npm run start:dev &
VIDEO_CONF_PID=$!
echo -e "${GREEN}Video Conference Service started on port 3008${NC}"

echo -e "${YELLOW}Starting Frontend...${NC}"
cd ../frontend && npm start &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started on port 3000${NC}"

echo -e "${GREEN}All services are running!${NC}"
echo -e "Press Ctrl+C to stop all services"

# Trap Ctrl+C to gracefully shutdown all services
trap 'kill $AUTH_PID $CLASS_PID $VIDEO_CONF_PID $FRONTEND_PID; docker-compose down; echo -e "${YELLOW}All services stopped${NC}"; exit 0' INT

# Keep script running
wait
