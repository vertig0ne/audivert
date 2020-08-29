FROM ubuntu:20.04
RUN apt update
RUN apt install -y ffmpeg fdkaac php-cli php-intl php-json php-mbstring php-xml curl nodejs

RUN curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh && bash nodesource_setup.sh

RUN apt update && apt install -y nodejs

COPY . /app
WORKDIR /app

RUN npm i

ENTRYPOINT [ "node", "." ]