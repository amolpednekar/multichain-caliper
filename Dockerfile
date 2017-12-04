FROM ubuntu:xenial
MAINTAINER AMOL

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update \
        && apt-get upgrade -q -y \
        && apt-get dist-upgrade -q -y \
        && apt-get install -q -y wget curl \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/* \
        && cd /tmp \
        && wget http://www.multichain.com/download/multichain-1.0-release.tar.gz \
        && tar -xvzf multichain-1.0-release.tar.gz \
        && cd multichain-1.0-release \
        && mv multichaind multichain-cli multichain-util /usr/local/bin \
        && cd /tmp \
        && rm -Rf multichain*

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash

# Install Node.js from the Debian-based distributions repository

RUN apt-get install -y nodejs

CMD ["/bin/bash"]