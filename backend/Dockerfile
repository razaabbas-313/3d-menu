# Stage 1: Build JAR using Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests clean package

# Stage 2: Minimal, hardened production runtime
FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="Atelier AR Engineering"

# Security: Run as unprivileged non-root user
RUN addgroup -S -g 10001 atelier && \
    adduser -S -u 10001 -G atelier -h /app -s /bin/sh atelier && \
    mkdir -p /app/data /app/uploads && \
    chown -R atelier:atelier /app

WORKDIR /app

COPY --from=build --chown=atelier:atelier /build/target/*.jar /app/app.jar

# JVM memory tuning for 512 MB free-tier container
# SerialGC minimizes memory overhead in single-core/low-RAM containers; MaxRAMPercentage limits heap to ~384 MB.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV PORT=8080
ENV STORAGE_DIR=/app/uploads

EXPOSE 8080

USER atelier:atelier

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O- http://localhost:8080/actuator/health | grep -q "UP" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
