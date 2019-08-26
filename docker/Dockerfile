FROM ibmcom/informix-innovator-c:12.10.FC12W1IE

ARG servername=informix

USER root
RUN mkdir /app
WORKDIR /home/informix

RUN sed -i '/jessie-updates/d' /etc/apt/sources.list
RUN apt-get -qq update && apt-get -qq install -y \
  wget gcc g++ make xz-utils python2.7 git curl

RUN wget -q -O node8.tar.xz https://nodejs.org/dist/v8.11.3/node-v8.11.3-linux-x64.tar.xz \
  && tar xfJ node8.tar.xz && rm -rf node8.tar.xz

ENV SERVERNAME=$servername

COPY docker/esql /opt/ibm/informix/bin/

RUN chmod +x /opt/ibm/informix/bin/esql
RUN echo "informixoltp_tcp        onsoctcp        $SERVERNAME               sqlexec" \
  > /opt/ibm/informix/etc/sqlhosts.informixoltp_tcp

ENV INFORMIXDIR /opt/ibm/informix
ENV INFORMIX_HOME /home/informix
ENV INFORMIXSERVER informixoltp_tcp
ENV INFORMIXTERM terminfo
ENV CLIENT_LOCALE=en_US.utf8
ENV DB_LOCALE=en_US.utf8
ENV DBDATE Y4MD-
ENV DBDELIMITER "|"
ENV PATH /home/informix/node-v8.11.3-linux-x64/bin:${INFORMIXDIR}/bin:${INFORMIXDIR}/lib:${INFORMIXDIR}/lib/esql:${PATH}
ENV LD_LIBRARY_PATH ${INFORMIXDIR}/lib:${INFORMIXDIR}/lib/esql:${INFORMIXDIR}/lib/cli
ENV INFORMIXSQLHOSTS /opt/ibm/informix/etc/sqlhosts.informixoltp_tcp
ENV USER root
ENV LICENSE accept

RUN ln -s /usr/bin/python2.7 /usr/bin/python
RUN echo "sqlexec 2021/tcp" >> /etc/services

COPY . /app

WORKDIR /app
RUN rm -rf node_modules && npm install --unsafe-perm

ENTRYPOINT [ "npm" ]
