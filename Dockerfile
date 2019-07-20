FROM node:7
WORKDIR /FarmDaily
COPY . /FarmDaily
RUN npm install
CMD node app.js