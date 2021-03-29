# Build container
FROM ubuntu:bionic AS builder
WORKDIR /dotnet
RUN apt-get update -y && \
      apt-get install -y \
      apt-transport-https \
      curl \
      gpg
RUN curl -o - https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /tmp/microsoft.asc.gpg; \
    curl -o /tmp/microsoft-prod.list https://packages.microsoft.com/config/debian/10/prod.list

FROM pulumi/pulumi-nodejs:2.23.2

ARG DOTNET_RUNTIME_VERSION="3.1"
ARG AWS_CLI_VERSION=2.1.31
ARG AWS_IAM_AUTHENTICATOR_VERSION=0.5.1
ARG Kubectl_Version=1.18.8-00

# We need to install ca certs before copying the ms prod debs packages
RUN --mount=target=/var/lib/apt/lists,type=cache \
    --mount=target=/var/cache/apt,type=cache \
    apt-get update -y && \
    apt-get install -y \
    ca-certificates

COPY --from=builder /tmp/microsoft.asc.gpg /etc/apt/trusted.gpg.d/microsoft.asc.gpg
COPY --from=builder /tmp/microsoft-prod.list /etc/apt/sources.list.d/microsoft-prod.list

# Install .NET SDK 
RUN --mount=target=/var/lib/apt/lists,type=cache \
    --mount=target=/var/cache/apt,type=cache \
    apt-get update -y && \
    apt-get install -y \
      curl \
      unzip \
      dotnet-sdk-${DOTNET_RUNTIME_VERSION}

# Get AWS IAM Authenticator
# https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html
RUN curl --silent --location https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v${AWS_IAM_AUTHENTICATOR_VERSION}/aws-iam-authenticator_${AWS_IAM_AUTHENTICATOR_VERSION}_linux_amd64 -o /usr/local/bin/aws-iam-authenticator && \
    chmod +x /usr/local/bin/aws-iam-authenticator

# Get AWS CLI
# https://docs.aws.amazon.com/cli/latest/userguide/install-linux.html#install-linux-awscli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64-${AWS_CLI_VERSION}.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm awscliv2.zip && \
    rm -rf ./aws

# Get kubectl
# https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-using-native-package-management
RUN curl -fsSLo /usr/share/keyrings/kubernetes-archive-keyring.gpg https://packages.cloud.google.com/apt/doc/apt-key.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | tee /etc/apt/sources.list.d/kubernetes.list && \
    apt-get update -y && \
    apt-get install -y kubectl=${Kubectl_Version}