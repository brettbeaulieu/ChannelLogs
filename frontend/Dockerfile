# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

EXPOSE 3000
EXPOSE 49153

CMD ["npm", "run", "dev"]

# Build the Next.js application
#RUN npm run build

# Expose port 3000 for the application
#EXPOSE 3000

# Command to run the application
#CMD ["npm", "start"]
