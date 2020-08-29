FROM ubuntu:20.04
RUN apt update
RUN apt install -y tzdata
RUN apt install -y ffmpeg fdkaac php-cli php-intl php-json php-mbstring php-xml curl nodejs libatk-bridge2.0-dev gconf-service libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxss1 libxtst6 libappindicator1 libnss3 libasound2 libatk1.0-0 libc6 ca-certificates fonts-liberation lsb-release xdg-utils wget libgbm-dev

RUN curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh && bash nodesource_setup.sh

RUN apt update && apt install -y nodejs

COPY . /app
WORKDIR /app

RUN npm i

VOLUME "/input"
VOLUME "/intermediate"
VOLUME "/output"

ENTRYPOINT [ "node", ".", "/input", "/intermediate", "/output" ]
