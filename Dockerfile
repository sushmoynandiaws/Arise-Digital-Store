FROM node:22-bookworm-slim AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM rust:1.99-bookworm AS backend
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY api/ ./api/
COPY src/ ./src/
COPY migrations/ ./migrations/
RUN cargo build --locked --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && useradd --system --uid 10001 --create-home marketplace
WORKDIR /app
COPY --from=backend /app/target/release/marketplace-api /app/marketplace-api
COPY --from=frontend /app/web/dist /app/web/dist
RUN mkdir /app/data && chown marketplace:marketplace /app/data
USER marketplace
ENV BIND_ADDRESS=0.0.0.0:8088
EXPOSE 8088
CMD ["/app/marketplace-api"]
