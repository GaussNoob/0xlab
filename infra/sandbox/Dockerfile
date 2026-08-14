FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    clang \
    libclang-rt-18-dev \
    llvm-18 \
    cmake \
    coreutils \
    libsqlite3-dev \
    libcurl4-openssl-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin student \
  && mkdir -p /opt/0xlab /workspace \
  && chown student:student /workspace

COPY run-job.sh /opt/0xlab/run-job.sh
RUN chmod 0555 /opt/0xlab/run-job.sh

USER 10001:10001
WORKDIR /workspace
ENTRYPOINT []
CMD ["/bin/true"]
