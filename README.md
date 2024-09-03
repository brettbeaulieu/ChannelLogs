# ChatLogsAnalysis
ChatLogsAnalysis is a web application designed for analyzing Twitch chat logs imported from Chatterino or Rustlog.

## Features
- Chat Activity Analysis
- Chat Sentiment Analysis
- 7TV Emote Support 
## Requirements:
1. Docker [(https://www.docker.com/)](https://www.docker.com/)
## Installation
1. Clone the Repository
    ````
    git clone https://github.com/brettbeaulieu/ChatLogsAnalysis.git
    cd ChatLogsAnalysis
    ````
2. Build the Docker Images

- Build for Development (Hot reloading from local directory, detailed debug messages)
````
docker compose -f docker-compose-dev.yaml build
````
- Build for Production (Faster than development build, no hot reloading, no debug messages) 
````
docker compose -f docker-compose-prod.yaml build
````

(Note: If you only plan to use the application in exactly one mode (either production or development), you may rename the corresponding compose configuration to 'docker-compose.yaml'. You can now omit the '-f' flag when using Docker Compose.)

## Usage
### Start Application
Start the application using the same compose configuration file you built the application on.
- Start Development
    ````
    docker compose -f docker-compose-dev.yaml start
    ````
- Start Production
    ````
    docker compose -f docker-compose-prod.yaml start
    ````
### Access Application
Simply connect to the frontend through a web browser
- **Frontend**: [http://localhost:3000/](http://localhost:3000/) (Or port 3000 of hosting machine)


