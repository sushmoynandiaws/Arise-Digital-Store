FROM alpine:3.23
RUN apk add --no-cache pgbouncer && addgroup -g 10001 marketplace && adduser -D -H -u 10001 -G marketplace marketplace
USER marketplace
CMD ["pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
