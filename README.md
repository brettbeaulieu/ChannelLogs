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
    ````
    docker compose build
    ````

## Usage
### Start Application
````
docker compose up
````
### Access Application
Simply connect to the frontend through a web browser
- **Frontend**: [http://localhost:3000/](http://localhost:3000/) (Or port 3000 of hosting machine)
